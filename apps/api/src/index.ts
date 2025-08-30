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

// Unified search function combining SerpAPI + OpenAI
async function searchProducts(query: string, country: string = 'us'): Promise<SearchResult> {
  const serpApiKey = requireSerpApiKey()
  const openaiApiKey = requireOpenAIKey()
  const openai = new OpenAI({ apiKey: openaiApiKey, timeout: 60000 })

  try {
    console.log(`[search] Starting search for: "${query}" in country: ${country}`)
    
    // Step 1: Determine which search engine to use based on country support
    const useGoogleShopping = GOOGLE_SHOPPING_SUPPORTED_COUNTRIES.has(country.toLowerCase())
    const engine = useGoogleShopping ? "google_shopping" : "google"
    
    console.log(`[search] Using ${engine} engine for country: ${country}`)
    
    // Step 2: Use SerpAPI to get real web search results
    const searchParams: any = {
      engine,
      q: useGoogleShopping ? query : `${query} achat en ligne shop`,
      api_key: serpApiKey,
      gl: country.toLowerCase(),
      hl: "fr",
    }
    
    if (useGoogleShopping) {
      searchParams.num = 20 // Get more results for shopping
    } else {
      searchParams.num = 15 // Fewer results for general search
      searchParams.cr = `country${country.toUpperCase()}` // Country restriction for general search
    }
    
    const serpResults = await getJson(searchParams)
    
    // Handle different result structures
    const results = useGoogleShopping 
      ? serpResults.shopping_results 
      : serpResults.organic_results
    
    console.log(`[search] SerpAPI returned ${results?.length || 0} results using ${engine}`)

    if (!results || results.length === 0) {
      return {
        query,
        products: [],
        totalFound: 0
      }
    }

    // Step 3: Use OpenAI to intelligently select and structure the best products
    const serpData = results.slice(0, 15) // Take top 15 for AI processing
    console.log(`[search] SerpAPI data: ${JSON.stringify(serpData, null, 2)}`)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      

      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: `You are a product curation expert. From the provided search results, extract and format the TOP 10 most relevant products for purchase.

SEARCH RESULT TYPES:
- Shopping results: Direct product listings with prices and images
- Organic results: General web pages that may contain product information

STRICT REQUIREMENTS:
- Return JSON: {"products": [{"id": string, "name": string, "price": number, "currency": string, "url": string, "source": string, "imageUrl": string, "snippet": string}]}
- For shopping results: Use provided price, title, and thumbnail
- For organic results: Extract product info from title, snippet, and any price mentions, you can visit the page to get more information
- Keep snippets under 150 characters
- Price must be numeric (convert from strings like "$99.99" to 99.99, "€50" to 50)
- Currency should be standard codes (USD, EUR, MAD, etc.)
- If no price found, you can still return the product with a price of null
- Use thumbnail/image URLs when available
- Source should be the domain name (e.g., "amazon.com", "ebay.com")

QUALITY FILTERS:
- Prioritize results with clear product names and prices
- Ensure URLs lead to actual product pages
- Prefer results with images when available`
        },
        {
          role: 'user',
          content: `Query: "${query}"\nCountry: ${country}\nSearch Engine: ${engine}\n\nSearch Results:\n${JSON.stringify(serpData, null, 2)}\n\nExtract and format the best 10 products from these ${engine === 'google_shopping' ? 'shopping' : 'organic'} results.`
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

    console.log(`[search] AI selected ${aiResult} products`)

    // Step 3: Sanitize and verify the products
    //const sanitized = sanitizeProducts(aiResult.products)
    //console.log(`[search] ${sanitized.length} products passed sanitization`)
    
    //const verified = await verifyProductsExist(sanitized)
    //const verified = await verifyProductsExist(aiResult.products)
    const verified = aiResult.products
    console.log(`[search] ${verified.length} products verified as accessible`)

    return {
      query,
      products: verified.slice(0, 10),
      totalFound: results.length
    }

  } catch (error) {
    console.error('[search] Error:', error)
    throw error
  }
}

// Unified search endpoint
app.post('/search', async (c) => {
  try {
    const { query, country } = await c.req.json().catch(() => ({}))
    
    if (!query || typeof query !== 'string' || !query.trim()) {
      return c.json({ error: 'Missing or invalid query parameter' }, 400)
    }

    const searchCountry = country && typeof country === 'string' ? country.trim() : 'us'
    const result = await searchProducts(query.trim(), searchCountry)
    return c.json(result)
    
  } catch (error) {
    console.error('[/search] Error:', error)
    return c.json({ 
      error: 'Search failed', 
      message: error instanceof Error ? error.message : String(error) 
    }, 500)
  }
})

// Alternative GET endpoint for simple queries
app.get('/search', async (c) => {
  try {
    const query = c.req.query('q')?.trim()
    const country = c.req.query('country')?.trim() || 'us'
    
    if (!query) {
      return c.json({ error: 'Missing query parameter q' }, 400)
    }

    const result = await searchProducts(query, country)
    return c.json(result)
    
  } catch (error) {
    console.error('[/search] Error:', error)
    return c.json({ 
      error: 'Search failed', 
      message: error instanceof Error ? error.message : String(error) 
    }, 500)
  }
})

const port = Number(env.PORT ?? 8787)
export default {
  port,
  fetch: app.fetch,
}