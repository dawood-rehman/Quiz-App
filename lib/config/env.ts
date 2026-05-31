import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;
const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.url().optional());
const stringWithDefault = (fallback: string) =>
  z.preprocess(emptyToUndefined, z.string().min(1).default(fallback));
const urlWithDefault = (fallback: string) =>
  z.preprocess(emptyToUndefined, z.url().default(fallback));
const integerWithDefault = (fallback: number, minimum: number, maximum: number) =>
  z.preprocess(emptyToUndefined, z.coerce.number().int().min(minimum).max(maximum).default(fallback));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: optionalString,
  JWT_SECRET: z.preprocess(emptyToUndefined, z.string().min(32).optional()),
  APP_URL: urlWithDefault("http://localhost:3000"),
  OPENROUTER_API_KEY: optionalString,
  OPENROUTER_MODEL: stringWithDefault("openai/gpt-oss-120b:free"),
  OPENROUTER_FALLBACK_MODEL: stringWithDefault("meta-llama/llama-3.3-70b-instruct"),
  OPENROUTER_EVALUATION_MODEL: stringWithDefault("google/gemma-4-31b-it"),
  OPENROUTER_TIMEOUT_MS: integerWithDefault(55_000, 10_000, 55_000),
  OPENROUTER_EVALUATION_TIMEOUT_MS: integerWithDefault(12_000, 3_000, 20_000),
  OPENROUTER_SITE_URL: optionalUrl,
  OPENROUTER_APP_NAME: stringWithDefault("QuizForge"),
  SMTP_HOST: optionalString,
  SMTP_PORT: integerWithDefault(587, 1, 65_535),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  SMTP_SECURE: z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === "") return undefined;
      if (typeof value === "boolean") return value;
      if (typeof value === "string") return ["1", "true", "yes", "on"].includes(value.toLowerCase());
      return undefined;
    },
    z.boolean().optional(),
  ),
  EMAIL_FROM: stringWithDefault("QuizForge <no-reply@example.com>"),
});

type ServerEnv = z.infer<typeof envSchema>;

let cachedEnv: ServerEnv | undefined;

export function getEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${z.prettifyError(parsed.error)}`);
  }

  if (parsed.data.NODE_ENV === "production") {
    if (!parsed.data.DATABASE_URL) throw new Error("DATABASE_URL is required in production.");
    if (!parsed.data.JWT_SECRET) throw new Error("JWT_SECRET is required in production.");
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function getJwtSecret(): Uint8Array {
  const { JWT_SECRET, NODE_ENV } = getEnv();
  const value = JWT_SECRET ?? (NODE_ENV === "production" ? undefined : "local-development-secret-change-me");

  if (!value || value.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }

  return new TextEncoder().encode(value);
}
