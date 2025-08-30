import { z } from 'zod'
import * as dotenv from 'dotenv'

dotenv.config()

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().optional(),
  DATABASE_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  SERP_API: z.string().min(1).optional(),
})

export const env = EnvSchema.parse(process.env)

export function requireDatabaseUrl(): string {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required')
  }
  return env.DATABASE_URL
}

export function requireOpenAIKey(): string {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required')
  }
  return env.OPENAI_API_KEY
}

export function requireSerpApiKey(): string {
  if (!env.SERP_API) {
    throw new Error('SERP_API is required')
  }
  return env.SERP_API
}


