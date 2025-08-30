import { z } from 'zod';
const EnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.string().optional(),
    DATABASE_URL: z.string().url().optional(),
    OPENAI_API_KEY: z.string().min(1).optional(),
});
export const env = EnvSchema.parse(process.env);
export function requireDatabaseUrl() {
    if (!env.DATABASE_URL) {
        throw new Error('DATABASE_URL is required');
    }
    return env.DATABASE_URL;
}
export function requireOpenAIKey() {
    if (!env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is required');
    }
    return env.OPENAI_API_KEY;
}
