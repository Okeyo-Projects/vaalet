import { defineConfig } from 'drizzle-kit'
import { env } from '@valet/env'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
})


