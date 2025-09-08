import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { env, requireOpenAIKey, requireSerpApiKey } from '@valet/env'
import { db } from '@valet/db/client'
import OpenAI from 'openai'
import { getJson } from 'serpapi'
import { randomUUID } from 'crypto'

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

type JobStatus = 'created' | 'validating' | 'searching' | 'processing' | 'completed' | 'failed'

type SearchJob = {
  id: string
  query: string
  country: string
  status: JobStatus
  message: string
  result?: SearchResult
  error?: string
  createdAt: Date
  updatedAt: Date
}

// In-memory job storage (could be replaced with Redis/DB in production)
const jobs = new Map<string, SearchJob>()

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

// Countries supported by Google Shopping engine (from SerpAPI official list)
const GOOGLE_SHOPPING_SUPPORTED_COUNTRIES = new Set([
  'ai', 'ar', 'aw', 'au', 'at', 'be', 'bm', 'br', 'io', 'ca', 'ky', 'cl', 
  'cx', 'cc', 'co', 'cz', 'dk', 'fk', 'fi', 'fr', 'gf', 'pf', 'tf', 'de', 
  'gr', 'gp', 'hm', 'hk', 'hu', 'in', 'id', 'ie', 'il', 'it', 'jp', 'kr', 
  'my', 'mq', 'yt', 'mx', 'ms', 'nl', 'nc', 'nz', 'nf', 'no', 'ph', 'pl', 
  'pt', 're', 'ro', 'ru', 'pm', 'sa', 'sg', 'sk', 'za', 'gs', 'es', 'se', 
  'ch', 'tw', 'th', 'tk', 'tr', 'tc', 'ua', 'ae', 'uk', 'gb', 'us', 'vn', 
  'vg', 'wf'
])

// Job status messages in French
const JOB_MESSAGES = {
  created: 'Recherche créée',
  validating: 'Validation des paramètres...',
  searching: 'Recherche de produits en cours...',
  processing: 'Analyse des résultats avec l\'IA...',
  completed: 'Recherche terminée avec succès',
  failed: 'Erreur lors de la recherche'
}

function updateJob(jobId: string, updates: Partial<SearchJob>) {
  const job = jobs.get(jobId)
  if (!job) return null
  
  const updatedJob = {
    ...job,
    ...updates,
    updatedAt: new Date()
  }
  
  jobs.set(jobId, updatedJob)
  console.log(`[job:${jobId}] Status: ${updatedJob.status} - ${updatedJob.message}`)
  return updatedJob
}




// Background job processing function
async function processSearchJob(jobId: string) {
  const job = jobs.get(jobId)
  if (!job) {
    console.error(`[job:${jobId}] Job not found`)
    return
  }

  try {
    // Step 1: Validate parameters
    updateJob(jobId, { status: 'validating', message: JOB_MESSAGES.validating })
    await new Promise(resolve => setTimeout(resolve, 1000)) // Small delay for better UX
    
    if (!GOOGLE_SHOPPING_SUPPORTED_COUNTRIES.has(job.country.toLowerCase())) {
      updateJob(jobId, { 
        status: 'failed', 
        message: JOB_MESSAGES.failed,
        error: `Pays '${job.country}' non supporté. Pays supportés: ${Array.from(GOOGLE_SHOPPING_SUPPORTED_COUNTRIES).join(', ')}` 
      })
      return
    }

    // Step 2: Search for products
    updateJob(jobId, { status: 'searching', message: JOB_MESSAGES.searching })
    
    const result = await searchProducts(job.query, job.country)
    
    // Step 3: Processing (AI analysis already happened in searchProducts, but show the step)
    updateJob(jobId, { status: 'processing', message: JOB_MESSAGES.processing })
    await new Promise(resolve => setTimeout(resolve, 500)) // Small delay for UX
    
    // Step 3: Processing complete
    updateJob(jobId, { 
      status: 'completed', 
      message: `${JOB_MESSAGES.completed} - ${result.products.length} produits trouvés`,
      result 
    })

  } catch (error) {
    console.error(`[job:${jobId}] Error:`, error)
    updateJob(jobId, { 
      status: 'failed', 
      message: JOB_MESSAGES.failed,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    })
  }
}

// Unified search function combining SerpAPI + OpenAI (now used internally by jobs)
async function searchProducts(query: string, country: string = 'us'): Promise<SearchResult> {
  const serpApiKey = requireSerpApiKey()
  const openaiApiKey = requireOpenAIKey()
  const openai = new OpenAI({ apiKey: openaiApiKey, timeout: 60000 })

  try {
    console.log(`[search] Starting search for: "${query}" in country: ${country}`)
    
    // Step 1: Check if country is supported by Google Shopping
    const useGoogleShopping = GOOGLE_SHOPPING_SUPPORTED_COUNTRIES.has(country.toLowerCase())
    
    if (!useGoogleShopping) {
      // Return error for unsupported countries
      throw new Error(`Country '${country}' is not supported. Supported countries: ${Array.from(GOOGLE_SHOPPING_SUPPORTED_COUNTRIES).join(', ')}`)
    }
    
    // Step 2: Use Google Shopping for supported countries
    console.log(`[search] Using Google Shopping for supported country: ${country}`)
    
    const searchParams: any = {
      engine: "google_shopping",
      q: query,
      api_key: serpApiKey,
      gl: country.toLowerCase(),
      hl: country.toLowerCase() === 'fr' ? 'fr' : "en",
      num: 50
    }
    
    const serpResults = await getJson(searchParams)
    const results = serpResults.shopping_results
    
    console.log(`[search] Google Shopping returned ${results?.length || 0} results`)

    if (!results || results.length === 0) {
      return {
        query,
        products: [],
        totalFound: 0
      }
    }

    // Step 3: Use OpenAI to process Google Shopping results
    const serpData = results.slice(0, 15)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: `You are a product curation expert. From the provided Google Shopping results, select and format the TOP 10 most relevant products.

STRICT REQUIREMENTS:
- Return JSON: {"products": [{"id": string, "name": string, "price": number, "currency": string, "url": string, "source": string, "imageUrl": string, "snippet": string}]}
- Use provided price, title, and thumbnail from shopping results
- Generate unique IDs for each product
- Keep snippets under 150 characters
- Price must be numeric (convert from strings like "$99.99" to 99.99)
- Currency should be standard codes (USD, EUR, etc.)
- Use thumbnail URLs when available
- Source should be the domain name

QUALITY FILTERS:
- Prioritize products with complete information (price, image, title)
- Ensure URLs are direct product pages`
        },
        {
          role: 'user',
          content: `Query: "${query}"\nCountry: ${country}\n\nGoogle Shopping Results:\n${JSON.stringify(serpData, null, 2)}\n\nSelect and format the best 10 products.`
        }
      ]
    })

    const jsonResponse = completion.choices[0]?.message?.content
    if (!jsonResponse) {
      throw new Error('No response from OpenAI')
    }

    const aiResult = JSON.parse(jsonResponse)
    if (!aiResult.products || !Array.isArray(aiResult.products)) {
      throw new Error('Invalid AI response structure')
    }

    console.log(`[search] AI selected ${aiResult.products.length} products`)

    return {
      query,
      products: aiResult.products.slice(0, 10),
      totalFound: results.length
    }

  } catch (error) {
    console.error('[search] Error:', error)
    throw error
  }
}

// Job creation endpoint
app.post('/jobs', async (c) => {
  try {
    const { query, country } = await c.req.json().catch(() => ({}))
    
    if (!query || typeof query !== 'string' || !query.trim()) {
      return c.json({ error: 'Missing or invalid query parameter' }, 400)
    }

    const searchCountry = country && typeof country === 'string' ? country.trim() : 'us'
    const jobId = randomUUID()
    
    const job: SearchJob = {
      id: jobId,
      query: query.trim(),
      country: searchCountry,
      status: 'created',
      message: JOB_MESSAGES.created,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    jobs.set(jobId, job)
    console.log(`[job:${jobId}] Created job for query: "${job.query}" in country: ${job.country}`)
    
    // Start processing in background (don't await)
    processSearchJob(jobId).catch(error => {
      console.error(`[job:${jobId}] Background processing failed:`, error)
    })
    
    return c.json({ id: jobId })
    
  } catch (error) {
    console.error('[/jobs] Error:', error)
    return c.json({ 
      error: 'Job creation failed', 
      message: error instanceof Error ? error.message : String(error) 
    }, 500)
  }
})

// Job status endpoint
app.get('/jobs/:id', async (c) => {
  try {
    const jobId = c.req.param('id')
    const job = jobs.get(jobId)
    
    if (!job) {
      return c.json({ error: 'Job not found' }, 404)
  }

    return c.json(job)
    
  } catch (error) {
    console.error(`[/jobs/:id] Error:`, error)
    return c.json({ 
      error: 'Failed to get job status', 
      message: error instanceof Error ? error.message : String(error) 
    }, 500)
  }
})

// Get all jobs (for debugging)
app.get('/jobs', async (c) => {
  const allJobs = Array.from(jobs.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  return c.json({ jobs: allJobs })
})

const port = Number(env.PORT ?? 8787)
export default {
  port,
  fetch: app.fetch,
}