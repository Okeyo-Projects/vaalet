export function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'
}


