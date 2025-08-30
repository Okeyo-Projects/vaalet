import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { requireDatabaseUrl } from '@valet/env'

let _client: ReturnType<typeof postgres> | undefined

function getClient() {
  if (!_client) {
    _client = postgres(requireDatabaseUrl(), {
      max: 1,
      prepare: false,
    })
  }
  return _client
}

export const db = drizzle({ client: getClient() })


