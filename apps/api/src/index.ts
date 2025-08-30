import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { env, requireOpenAIKey, requireSerpApiKey } from '@valet/env'
import { db } from '@valet/db/client'
import OpenAI from 'openai'
import { getJson } from 'serpapi'

const app = new Hono()

app.use('*', cors())

app.get('/health', (c) => c.json({ ok: true }))

app.get('/db-ping', async (c) => {
  try {
    await db.execute("select 1")
    return c.json({ ok: true })
  } catch (error) {
    return c.json({ ok: false, error: String(error) }, 500)
  }
})

// Types for the search response
type Product = {
  id: string
  name: string
  price: number
  currency: string
  url: string
  source?: string
  imageUrl?: string
  snippet?: string
}

type SearchResult = {
  query: string
  products: Product[]
  totalFound: number
}

// Media URL validation helpers
const ALLOWED_MEDIA_EXTENSIONS = new Set([
  'jpg','jpeg','png','webp','gif','bmp','svg','mp4','webm','mov'
])
const BLOCKED_HOST_SUFFIXES = [
  'apple.com', // many Apple properties block hotlinking
]
const PLACEHOLDER_HOSTS = new Set([
  'example.com',
  'cdn.example.com',
  'placeholder.com',
])

function hasAllowedExtension(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    const pathname = url.pathname.toLowerCase()
    const ext = pathname.split('.').pop() || ''
    return ALLOWED_MEDIA_EXTENSIONS.has(ext)
  } catch {
    return false
  }
}

function isBlockedHost(urlString: string): boolean {
  try {
    const host = new URL(urlString).hostname.toLowerCase()
    if (PLACEHOLDER_HOSTS.has(host)) return true
    return BLOCKED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))
  } catch {
    return true
  }
}

function isHttpUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function isGoodMediaUrl(urlString?: string): boolean {
  if (!urlString) return false
  if (!isHttpUrl(urlString)) return false
  if (isBlockedHost(urlString)) return false
  if (!hasAllowedExtension(urlString)) return false
  return true
}

function getBaseDomain(hostname: string): string {
  const parts = hostname.toLowerCase().split('.').filter(Boolean)
  if (parts.length <= 2) return parts.join('.')
  // naive eTLD+1; for domains like co.uk this is imperfect but acceptable here
  return parts.slice(-2).join('.')
}

function isSameSite(urlA: string, urlB: string): boolean {
  try {
    const a = new URL(urlA)
    const b = new URL(urlB)
    return getBaseDomain(a.hostname) === getBaseDomain(b.hostname)
  } catch {
    return false
  }
}

function sanitizeProducts(products: Product[] = []): Product[] {
  return products
    .map((p) => {
      const goodImage = isGoodMediaUrl(p.imageUrl) && (!p.imageUrl || isSameSite(p.url, p.imageUrl))
      return {
        ...p,
        imageUrl: goodImage ? p.imageUrl : undefined,
      }
    })
    .filter((p) => p.imageUrl && isHttpUrl(p.url) && !isBlockedHost(p.url))
}

async function headOk(url: string, signal: AbortSignal): Promise<{ ok: boolean; contentType?: string }> {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal })
    if (!res.ok) return { ok: false }
    const ct = res.headers.get('content-type') || undefined
    return { ok: true, contentType: ct || undefined }
  } catch {
    return { ok: false }
  }
}

async function verifyProductsExist(products: Product[]): Promise<Product[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const checks = await Promise.all(
      products.map(async (p) => {
        const imageOk = p.imageUrl ? await headOk(p.imageUrl, controller.signal) : { ok: false }
        const urlOk = await headOk(p.url, controller.signal)
        const pass = urlOk.ok && imageOk.ok
        return pass ? p : null
      })
    )
    return checks.filter((p): p is Product => !!p)
  } finally {
    clearTimeout(timeout)
  }
}

// Job state
type RechercheJobStatus = 'queued' | 'analyzing' | 'deepsearch' | 'compiling' | 'done' | 'error'
interface RechercheJob {
  id: string
  q: string
  status: RechercheJobStatus
  message?: string
  result?: RechercheResult
  createdAt: number
  updatedAt: number
  mode?: 'fast' | 'deep'
}
const jobs = new Map<string, RechercheJob>()

async function runDeepResearchJob(
  openai: OpenAI,
  job: RechercheJob,
  set: (s: RechercheJobStatus, m?: string) => void
) {
  try {
    set('analyzing', 'Analyse approfondie…')
    set('deepsearch', 'Recherche web en cours…')
    
    // More structured prompt that's less likely to fail
    const input = `
Research and find the top 10 most relevant products for: "${job.q}"

Do:
- Search for actual products available for purchase online
- Include specific product details: exact prices, merchant names, product URLs
- Find products with real image or video URLs from the merchant's site
- Prioritize major retailers and official brand stores
- Include a variety of price points and options

Return the results as a JSON object with this EXACT structure:
{
  "description": "A brief summary of the search results (maximum 400 characters)",
  "products": [
    {
      "id": "unique-product-id",
      "name": "Exact Product Name",
      "price": 99.99,
      "currency": "USD",
      "url": "https://example.com/product-page",
      "source": "Store Name",
      "imageUrl": "https://example.com/product-image.jpg",
      "snippet": "Brief product description"
    }
  ]
}

Important:
- Return ONLY the JSON object, no additional text
- All URLs must be real, working links to actual products
- Image URLs must be from the same domain as the product URL
- Maximum 10 products in the array
- Prices must be numeric values
`;

    console.log(`[deep:${job.id}] Creating request with o3-deep-research`)
    
    try {
      const resp = await openai.responses.create({
        model: "o3-deep-research",
        input,
        background: true,
        tools: [
          { type: "web_search_preview" }
        ],
      } as any)
      
      const id = (resp as any).id as string
      console.log(`[deep:${job.id}] Created with ID=${id}`)
      
      // Polling logic
      const start = Date.now()
      const maxWaitTime = 1_800_000 // 30 minutes
      const pollInterval = 5000 // 5 seconds
      
      while (true) {
        await new Promise(res => setTimeout(res, pollInterval))
        
        const r = await openai.responses.retrieve(id)
        const status = (r as any).status
        const elapsed = Math.round((Date.now() - start) / 1000)
        console.log(`[deep:${job.id}] Status=${status} (${elapsed}s elapsed)`)
        
        if (status === 'completed') {
          set('compiling', 'Compilation des résultats…')
          const outputText = (r as any).output_text
          
          if (!outputText) {
            throw new Error('Empty response received')
          }
          
          // Extract JSON from the response (in case there's extra text)
          let parsed: RechercheResult
          try {
            // First try direct parse
            parsed = JSON.parse(outputText)
          } catch {
            // If that fails, try to extract JSON
            const jsonMatch = outputText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              console.error(`[deep:${job.id}] No JSON found in response:`, outputText)
              throw new Error('Invalid response format - no JSON found')
            }
            parsed = JSON.parse(jsonMatch[0])
          }
          
          // Validate and sanitize
          if (!parsed.products || !Array.isArray(parsed.products)) {
            throw new Error('Invalid response structure - missing products array')
          }
          
          const sanitized = sanitizeProducts(parsed.products)
          const verified = await verifyProductsExist(sanitized)
          
          job.result = { 
            description: parsed.description || `Found ${verified.length} products for "${job.q}"`,
            products: verified.slice(0, 10) 
          }
          set('done')
          console.log(`[deep:${job.id}] Success with ${job.result.products.length} products`)
          return
        }
        
        if (status === 'failed') {
          const fullError = (r as any)
          console.error(`[deep:${job.id}] API Response:`, JSON.stringify(fullError, null, 2))
          
          // Extract error details
          const errorInfo = fullError.last_error || fullError.error || {}
          const errorMessage = errorInfo.message || errorInfo.error || 'Unknown error'
          const errorType = errorInfo.type || errorInfo.code || 'unknown'
          
          // Check for specific error types
          if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
            throw new Error('API quota exceeded. Please try again later.')
          }
          if (errorMessage.includes('timeout')) {
            throw new Error('Research timeout. Query may be too complex.')
          }
          
          throw new Error(`Deep research failed: ${errorMessage} (${errorType})`)
        }
        
        if (status === 'cancelled') {
          throw new Error('Research was cancelled')
        }
        
        if (Date.now() - start > maxWaitTime) {
          throw new Error(`Timeout after ${maxWaitTime/60000} minutes`)
        }
      }
      
    } catch (apiError: any) {
      // Handle API-level errors
      console.error(`[deep:${job.id}] API Error:`, apiError)
      
      if (apiError.status === 404) {
        throw new Error('o3-deep-research model not available. Check API access.')
      }
      if (apiError.status === 401) {
        throw new Error('Authentication failed. Check API key permissions.')
      }
      if (apiError.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.')
      }
      
      throw apiError
    }
    
  } catch (error) {
    console.error(`[deep:${job.id}] Final error:`, error)
    set('error', error instanceof Error ? error.message : String(error))
  }
}

async function runRechercheJob(job: RechercheJob) {
  const apiKey = requireOpenAIKey()
  const openai = new OpenAI({ apiKey, timeout: 3600_000 })
  
  const set = (status: RechercheJobStatus, message?: string) => {
    job.status = status
    job.message = message
    job.updatedAt = Date.now()
  }
  
  // Try deep mode first if requested
  if (job.mode === 'deep') {
    try {
      await runDeepResearchJob(openai, job, set)
      return // Success, exit
    } catch (error) {
      console.error(`[${job.id}] Deep research failed, falling back to fast mode:`, error)
      return
      // Continue to fast mode as fallback
    }
  }
  
  // Fast mode (original implementation)
  try {
    set('analyzing', 'Analyse de la requête…')
    set('deepsearch', 'Recherche des meilleurs produits…')
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: 'You are a product meta-search engine. Always return STRICT JSON with shape {"description": string, "products": [{"id": string, "name": string, "price": number, "currency": string, "url": string, "source"?: string, "imageUrl"?: string, "videoUrl"?: string, "snippet"?: string} (max 10 items)]}. Use the ORIGINAL merchant product page for "url" (no aggregators, tracking, or placeholder domains). Only include products that have a direct, publicly fetchable imageUrl (jpg/jpeg/png/webp/gif) or videoUrl (mp4/webm/mov) on the SAME site as the product (same domain or subdomain). Never invent or use example/placeholder domains.'
        },
        {
          role: 'user',
          content: `Find the top 10 relevant products for: ${job.q}. Keep description <= 400 chars.`,
        },
      ],
    })
    
    set('compiling', 'Compilation des résultats…')
    const jsonText = completion.choices[0]?.message?.content ?? ''
    const parsed: RechercheResult = JSON.parse(jsonText)
    const sanitized = sanitizeProducts(parsed.products)
    const verified = await verifyProductsExist(sanitized)
    job.result = { ...parsed, products: verified.slice(0, 10) }
    set('done')
  } catch (error) {
    set('error', String(error))
  }
}

// Create a recherche job
app.post('/recherche', async (c) => {
  const { q, mode } = await c.req.json().catch(() => ({}))
  if (!q || typeof q !== 'string' || !q.trim()) {
    return c.json({ error: 'Missing body.q' }, 400)
  }
  const id = (globalThis.crypto as any)?.randomUUID?.() ?? Math.random().toString(36).slice(2)
  const job: RechercheJob = {
    id,
    q: q.trim(),
    status: 'queued',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    mode: mode === 'deep' ? 'deep' : 'fast',
  }
  jobs.set(id, job)
  // Fire-and-forget background execution
  runRechercheJob(job)
  return c.json({ id, status: job.status }, 202)
})

// Get status/result of a recherche job
app.get('/recherche/:id', (c) => {
  const id = c.req.param('id')
  const job = jobs.get(id)
  if (!job) return c.json({ error: 'Not found' }, 404)
  return c.json({ id: job.id, status: job.status, message: job.message, result: job.result })
})

// Back-compat: GET /recherche?q=...
app.get('/recherche', (c) => {
  const q = c.req.query('q')?.trim()
  if (!q) {
    return c.json({ error: 'Missing query parameter q' }, 400)
  }
  const id = (globalThis.crypto as any)?.randomUUID?.() ?? Math.random().toString(36).slice(2)
  const job: RechercheJob = {
    id,
    q,
    status: 'queued',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    mode: 'fast',
  }
  jobs.set(id, job)
  runRechercheJob(job)
  return c.json({ id, status: job.status }, 202)
})

const port = Number(env.PORT ?? 8787)
export default {
  port,
  fetch: app.fetch,
}


app.get('/test-deep-research', async (c) => {
  try {
    const apiKey = requireOpenAIKey()
    const openai = new OpenAI({ apiKey, timeout: 60000 })
    
    const response = await openai.responses.create({
      model: "o3-deep-research",
      input: "What are the top 3 smartphones available in 2024? Return as JSON: {products: [{name, price}]}",
      background: true,
      tools: [{ type: "web_search_preview" }],
    } as any)
    
    const id = (response as any).id
    
    // Wait a bit and check status
    await new Promise(res => setTimeout(res, 5000))
    const status = await openai.responses.retrieve(id)
    
    return c.json({ 
      success: true, 
      id,
      status: (status as any).status,
      response: status
    })
  } catch (error: any) {
    return c.json({ 
      success: false,
      error: error.message,
      status: error.status,
      details: error.response?.data || error
    }, 500)
  }
})