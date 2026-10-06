import os from "node:os";

const env = process.env;
const production = env.NODE_ENV === "production";

const DEV_JWT_SECRET = "sanket-development-only-secret";
if (production && !env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set when NODE_ENV=production.");
}

/**
 * Everything the API reads from its environment, with defaults that work on a developer's Mac:
 * a local PostgreSQL where the current OS user may connect without a password (Homebrew's default).
 */
export const config = {
  production,
  host: env.API_HOST ?? "0.0.0.0",
  port: Number(env.API_PORT ?? 4000),
  databaseUrl:
    env.DATABASE_URL ??
    `postgres://${encodeURIComponent(os.userInfo().username)}@localhost:5432/sanket`,
  jwtSecret: env.JWT_SECRET ?? DEV_JWT_SECRET,
  tokenTtlSeconds: Number(env.TOKEN_TTL_SECONDS ?? 8 * 60 * 60),
  /**
   * Demo mode enables persona sign-in without a password, the event simulator and the presenter
   * controls (reset, advance, pause). Set DEMO_MODE=false for anything that is not a demonstration.
   */
  demoMode: env.DEMO_MODE !== "false",
  /** Comma-separated origins allowed to call the API. Empty means "any origin" (development). */
  corsOrigins: (env.CORS_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  logLevel: env.LOG_LEVEL ?? "warn",
};

export type Config = typeof config;
