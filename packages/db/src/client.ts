import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

let _client: ReturnType<typeof postgres> | undefined

function getClient() {
  if (!_client) {
    _client = postgres("postgresql://neondb_owner:npg_um3Oks4AjSIb@ep-ancient-bonus-a2uv0csu-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require", {
      max: 1,
      prepare: false,
    })
  }
  return _client
}

export const db = drizzle(getClient(), { schema })

