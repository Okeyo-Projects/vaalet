export declare const env: {
    NODE_ENV?: "development" | "test" | "production";
    PORT?: string;
    DATABASE_URL?: string;
    OPENAI_API_KEY?: string;
};
export declare function requireDatabaseUrl(): string;
export declare function requireOpenAIKey(): string;
