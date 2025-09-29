import { db } from '@valet/db/client'
import { alerts, favorites, searchJobs, sessions, users } from '@valet/db/schema'
import { env, requireOpenAIKey, requireSerpApiKey } from '@valet/env'
import bcrypt from 'bcryptjs'
import { createHash, randomBytes, randomUUID } from 'crypto'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { and, desc, eq } from 'drizzle-orm'
import { Hono, type Context, type MiddlewareHandler } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { cors } from 'hono/cors'
import OpenAI from 'openai'
import { getJson } from 'serpapi'
import { z } from 'zod'

type PublicUser = {
  id: number
  email: string
  name: string | null
  createdAt: Date
}

type AppVariables = {
  user: PublicUser
  sessionId: number
}

const publicUserColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  createdAt: users.createdAt,
}

const SESSION_COOKIE_NAME = env.SESSION_COOKIE_NAME ?? 'valet_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

const allowedOrigins = env.WEB_APP_URL
  ? env.WEB_APP_URL.split(',').map((origin) => origin.trim()).filter(Boolean)
  : ['http://localhost:8800']

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(255).optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const alertObjectiveSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('price_below'),
    targetPrice: z.number().positive(),
  }),
  z.object({
    type: z.literal('price_range'),
    minPrice: z.number().nonnegative(),
    maxPrice: z.number().positive(),
  }),
  z.object({
    type: z.literal('price_drop_percent'),
    dropPercent: z.number().positive(),
  }),
])

const createAlertSchema = z.object({
  jobId: z.string().uuid().optional(),
  query: z.string().min(1),
  country: z.string().min(1).max(8),
  objective: alertObjectiveSchema,
})

const createFavoriteSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  price: z.number().nonnegative().optional(),
  currency: z.string().min(1).max(8),
  url: z.string().url(),
  imageUrl: z.string().url().optional(),
  snippet: z.string().optional(),
  source: z.string().optional(),
})

const app = new Hono<{ Variables: AppVariables }>()

app.use('*', cors({
  origin: (origin) => origin || '*',
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cookie'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  credentials: true,
}))

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

async function createPasswordHash(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash)
}

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

async function createSession(userId: number) {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  const tokenHash = hashSessionToken(token)

  const [created] = await db
    .insert(sessions)
    .values({ userId, tokenHash, expiresAt })
    .returning({ id: sessions.id })

  return { token, expiresAt, sessionId: created.id }
}

function setSessionCookie(c: Context, token: string, expiresAt: Date) {
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
  setCookie(c, SESSION_COOKIE_NAME, token, {
    ...COOKIE_OPTIONS,
    maxAge,
  })
}

function clearSessionCookie(c: Context) {
  deleteCookie(c, SESSION_COOKIE_NAME, COOKIE_OPTIONS)
}

async function getSession(c: Context) {
  const token = getCookie(c, SESSION_COOKIE_NAME)
  if (!token) return null

  const tokenHash = hashSessionToken(token)

  const rows = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      userId: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1)

  const row = rows[0]
  if (!row) {
    clearSessionCookie(c)
    return null
  }

  if (row.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, row.sessionId))
    clearSessionCookie(c)
    return null
  }

  return {
    sessionId: row.sessionId,
    expiresAt: row.expiresAt,
    user: {
      id: row.userId,
      email: row.email,
      name: row.name,
      createdAt: row.createdAt,
    } satisfies PublicUser,
  }
}

const requireAuth: MiddlewareHandler<{ Variables: AppVariables }> = async (c, next) => {
  const session = await getSession(c)
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  c.set('user', session.user)
  c.set('sessionId', session.sessionId)
  return next()
}

app.get('/health', (c) => c.json({ ok: true }))

app.get('/db-ping', async (c) => {
  try {
    await db.execute("select 1")
    return c.json({ ok: true })
  } catch (error) {
    return c.json({ ok: false, error: String(error) }, 500)
  }
})

app.post('/auth/register', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = registerSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({
      error: 'Invalid request',
      issues: parsed.error.flatten(),
    }, 400)
  }

  const email = normalizeEmail(parsed.data.email)
  const name = parsed.data.name?.trim() || null

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (existing[0]) {
    return c.json({ error: 'Email already in use' }, 409)
  }

  const passwordHash = await createPasswordHash(parsed.data.password)

  const insertUser: InferInsertModel<typeof users> = {
    email,
    passwordHash,
    ...(name ? { name } : {}),
  }

  const [createdUser] = await db
    .insert(users)
    .values(insertUser)
    .returning(publicUserColumns)

  const session = await createSession(createdUser.id)
  setSessionCookie(c, session.token, session.expiresAt)

  return c.json({ user: createdUser }, 201)
})

app.post('/auth/login', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({
      error: 'Invalid request',
      issues: parsed.error.flatten(),
    }, 400)
  }

  const email = normalizeEmail(parsed.data.email)

  const rows = await db
    .select({
      ...publicUserColumns,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  const userRow = rows[0]

  if (!userRow) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const validPassword = await verifyPassword(parsed.data.password, userRow.passwordHash)
  if (!validPassword) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const session = await createSession(userRow.id)
  setSessionCookie(c, session.token, session.expiresAt)

  const { passwordHash: _passwordHash, ...user } = userRow
  return c.json({ user })
})

app.post('/auth/logout', requireAuth, async (c) => {
  const sessionId = c.get('sessionId')
  await db.delete(sessions).where(eq(sessions.id, sessionId))
  clearSessionCookie(c)
  return c.json({ success: true })
})

app.get('/auth/me', requireAuth, (c) => {
  return c.json({ user: c.get('user') })
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
  completedAt?: Date | null
}

type InternalSearchJob = SearchJob & { userId: number }

type SearchJobUpdate = {
  status?: JobStatus
  message?: string
  result?: SearchResult | null
  error?: string | null
  completedAt?: Date | null
}

type AlertRecord = InferSelectModel<typeof alerts>

type ApiAlert = {
  id: number
  jobId: string | null
  query: string
  country: string
  objectiveType: string
  targetPrice: number | null
  minPrice: number | null
  maxPrice: number | null
  dropPercent: number | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

type FavoriteRecord = InferSelectModel<typeof favorites>

type ApiFavorite = {
  id: number
  productId: string
  name: string
  price: number | null
  currency: string
  url: string
  imageUrl: string | null
  snippet: string | null
  source: string | null
  createdAt: Date
  updatedAt: Date
}

function mapJobRow(row: InferSelectModel<typeof searchJobs>): InternalSearchJob {
  const job: InternalSearchJob = {
    id: row.id,
    query: row.query,
    country: row.country,
    status: row.status as JobStatus,
    message: row.message,
    userId: row.userId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt ?? undefined,
  }

  if (row.result) {
    job.result = row.result as SearchResult
  }
  if (row.error) {
    job.error = row.error
  }

  return job
}

function toApiJob(job: InternalSearchJob): SearchJob {
  const { userId: _userId, ...rest } = job
  return rest
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function mapAlertRow(row: AlertRecord): ApiAlert {
  return {
    id: row.id,
    jobId: row.jobId,
    query: row.query,
    country: row.country,
    objectiveType: row.objectiveType,
    targetPrice: toNumberOrNull(row.targetPrice),
    minPrice: toNumberOrNull(row.minPrice),
    maxPrice: toNumberOrNull(row.maxPrice),
    dropPercent: toNumberOrNull(row.dropPercent),
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function mapFavoriteRow(row: FavoriteRecord): ApiFavorite {
  return {
    id: row.id,
    productId: row.productId,
    name: row.name,
    price: toNumberOrNull(row.price),
    currency: row.currency,
    url: row.url,
    imageUrl: row.imageUrl ?? null,
    snippet: row.snippet ?? null,
    source: row.source ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

async function getJob(jobId: string): Promise<InternalSearchJob | null> {
  const row = await db.query.searchJobs.findFirst({
    where: eq(searchJobs.id, jobId),
  })

  return row ? mapJobRow(row) : null
}

async function getJobForUser(jobId: string, userId: number): Promise<InternalSearchJob | null> {
  const row = await db.query.searchJobs.findFirst({
    where: and(eq(searchJobs.id, jobId), eq(searchJobs.userId, userId)),
  })

  return row ? mapJobRow(row) : null
}

async function updateJob(jobId: string, updates: SearchJobUpdate) {
  const updatePayload: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  if (updates.status) {
    updatePayload.status = updates.status
  }
  if (updates.message !== undefined) {
    updatePayload.message = updates.message
  }
  if ('result' in updates) {
    updatePayload.result = updates.result ?? null
  }
  if (updates.error !== undefined) {
    updatePayload.error = updates.error ?? null
  }
  if ('completedAt' in updates) {
    updatePayload.completedAt = updates.completedAt ?? null
  }

  const [row] = await db
    .update(searchJobs)
    .set(updatePayload)
    .where(eq(searchJobs.id, jobId))
    .returning()

  if (row) {
    const job = mapJobRow(row)
    console.log(`[job:${jobId}] Status: ${job.status} - ${job.message}`)
    return job
  }

  return null
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

// Job status messages in French
const JOB_MESSAGES = {
  created: 'Recherche créée',
  validating: 'Validation des paramètres...',
  searching: 'Recherche de produits en cours...',
  processing: 'Analyse des résultats avec l\'IA...',
  completed: 'Recherche terminée avec succès',
  failed: 'Erreur lors de la recherche'
}

// Background job processing function
async function processSearchJob(jobId: string) {
  const job = await getJob(jobId)
  if (!job) {
    console.error(`[job:${jobId}] Job not found`)
    return
  }

  try {
    // Step 1: Validate parameters
    await updateJob(jobId, { status: 'validating', message: JOB_MESSAGES.validating })
    await new Promise((resolve) => setTimeout(resolve, 1000))

    if (!GOOGLE_SHOPPING_SUPPORTED_COUNTRIES.has(job.country.toLowerCase())) {
      await updateJob(jobId, {
        status: 'failed',
        message: JOB_MESSAGES.failed,
        error: `Pays '${job.country}' non supporté. Pays supportés: ${Array.from(GOOGLE_SHOPPING_SUPPORTED_COUNTRIES).join(', ')}`,
        completedAt: new Date(),
      })
      return
    }

    // Step 2: Search for products
    await updateJob(jobId, { status: 'searching', message: JOB_MESSAGES.searching })

    const result = await searchProducts(job.query, job.country)

    // Step 3: Processing (AI analysis already happened in searchProducts, but show the step)
    await updateJob(jobId, { status: 'processing', message: JOB_MESSAGES.processing })
    await new Promise((resolve) => setTimeout(resolve, 500))

    await updateJob(jobId, {
      status: 'completed',
      message: `${JOB_MESSAGES.completed} - ${result.products.length} produits trouvés`,
      result,
      error: null,
      completedAt: new Date(),
    })
  } catch (error) {
    console.error(`[job:${jobId}] Error:`, error)
    await updateJob(jobId, {
      status: 'failed',
      message: JOB_MESSAGES.failed,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      completedAt: new Date(),
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
    const serpData = results?.slice(0, 10)
    console.log(serpData)
    const completion = await openai.chat.completions.create({
      model: "gpt-5-nano",
      response_format: { type: 'json_object' },
      // temperature: 0.1,
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

app.use('/jobs', requireAuth)
app.use('/jobs/*', requireAuth)

// Job creation endpoint
app.post('/jobs', async (c) => {
  try {
    const user = c.get('user')
    const { query, country } = await c.req.json().catch(() => ({}))
    
    if (!query || typeof query !== 'string' || !query.trim()) {
      return c.json({ error: 'Missing or invalid query parameter' }, 400)
    }

    const searchCountry = country && typeof country === 'string' ? country.trim() : 'us'
    const jobId = randomUUID()
    
    const newJob: typeof searchJobs.$inferInsert = {
      id: jobId,
      userId: user.id,
      query: query.trim(),
      country: searchCountry,
      status: 'created',
      message: JOB_MESSAGES.created,
    }

    await db.insert(searchJobs).values(newJob)

    console.log(`[job:${jobId}] Created job for query: "${query.trim()}" in country: ${searchCountry}`)
    
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
    const user = c.get('user')
    const jobId = c.req.param('id')
    const job = await getJobForUser(jobId, user.id)

    if (!job) {
      return c.json({ error: 'Job not found' }, 404)
    }

    return c.json(toApiJob(job))
  } catch (error) {
    console.error(`[/jobs/:id] Error:`, error)
    return c.json({
      error: 'Failed to get job status',
      message: error instanceof Error ? error.message : String(error),
    }, 500)
  }
})

app.get('/jobs', async (c) => {
  const user = c.get('user')
  const limitParam = Number(c.req.query('limit') ?? '20')
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.trunc(limitParam), 1), 100) : 20

  const rows = await db
    .select()
    .from(searchJobs)
    .where(eq(searchJobs.userId, user.id))
    .orderBy(desc(searchJobs.createdAt))
    .limit(limit)

  const jobs = rows.map((row) => toApiJob(mapJobRow(row)))
  return c.json({ jobs })
})

app.post('/alerts', requireAuth, async (c) => {
  const user = c.get('user')
  const body = await c.req.json().catch(() => null)
  const parsed = createAlertSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ error: 'Invalid request', issues: parsed.error.flatten() }, 400)
  }

  const { jobId, query, country, objective } = parsed.data

  let finalQuery = query
  let finalCountry = country
  let resolvedJobId: string | null = null

  if (jobId) {
    const job = await getJobForUser(jobId, user.id)
    if (!job) {
      return c.json({ error: 'Job not found' }, 404)
    }
    resolvedJobId = jobId
    finalQuery = job.query
    finalCountry = job.country
  }

  if (objective.type === 'price_range' && objective.maxPrice <= objective.minPrice) {
    return c.json({ error: 'maxPrice must be greater than minPrice' }, 400)
  }

  const insertAlert = {
    userId: user.id,
    jobId: resolvedJobId ?? null,
    query: finalQuery,
    country: finalCountry,
    objectiveType: objective.type,
    targetPrice: objective.type === 'price_below' ? objective.targetPrice.toString() : null,
    minPrice: objective.type === 'price_range' ? objective.minPrice.toString() : null,
    maxPrice: objective.type === 'price_range' ? objective.maxPrice.toString() : null,
    dropPercent: objective.type === 'price_drop_percent' ? objective.dropPercent.toString() : null,
  }

  const [row] = await db
    .insert(alerts)
    .values(insertAlert as typeof alerts.$inferInsert)
    .returning()

  return c.json({ alert: mapAlertRow(row) }, 201)
})

app.get('/alerts', requireAuth, async (c) => {
  const user = c.get('user')
  const rows = await db
    .select()
    .from(alerts)
    .where(eq(alerts.userId, user.id))
    .orderBy(desc(alerts.createdAt))

  return c.json({ alerts: rows.map(mapAlertRow) })
})

app.post('/favorites', requireAuth, async (c) => {
  const user = c.get('user')
  const body = await c.req.json().catch(() => null)
  const parsed = createFavoriteSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ error: 'Invalid request', issues: parsed.error.flatten() }, 400)
  }

  const { productId, name, price, currency, url, imageUrl, snippet, source } = parsed.data

  const insertFavorite = {
    userId: user.id,
    productId,
    name,
    price: price !== undefined ? price.toString() : null,
    currency,
    url,
    imageUrl: imageUrl ?? null,
    snippet: snippet ?? null,
    source: source ?? null,
  }

  const updateFavoriteSet: Record<string, unknown> = {
    name,
    currency,
    url,
    imageUrl: imageUrl ?? null,
    snippet: snippet ?? null,
    source: source ?? null,
    updatedAt: new Date(),
  }

  if (price !== undefined) {
    updateFavoriteSet.price = price.toString()
  }

  const [row] = await db
    .insert(favorites)
    .values(insertFavorite as typeof favorites.$inferInsert)
    .onConflictDoUpdate({
      target: [favorites.userId, favorites.productId],
      set: updateFavoriteSet as Partial<typeof favorites.$inferInsert>,
    })
    .returning()

  return c.json({ favorite: mapFavoriteRow(row) }, 201)
})

app.get('/favorites', requireAuth, async (c) => {
  const user = c.get('user')
  const rows = await db
    .select()
    .from(favorites)
    .where(eq(favorites.userId, user.id))
    .orderBy(desc(favorites.createdAt))

  return c.json({ favorites: rows.map(mapFavoriteRow) })
})

const port = Number(env.PORT ?? 8787)
export default {
  port,
  fetch: app.fetch,
}
