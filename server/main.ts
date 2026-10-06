/**
 * SafeConnect API server.
 *
 *   npm run api:dev      start with reload
 *   npm run db:setup     create the database, apply migrations, seed if empty
 *   npm run db:reset     wipe back to the starting dataset
 */
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import Fastify from "fastify";
import { createSimulator } from "@/domain/simulator";
import { HttpError } from "./access";
import { config } from "./config";
import { ensureDatabase, migrate, pool } from "./db";
import { Platform } from "./platform";
import { RealtimeHub } from "./realtime";
import { registerRoutes } from "./routes";

async function main() {
  const app = Fastify({ logger: { level: config.logLevel }, trustProxy: true });

  if (await ensureDatabase()) app.log.info("Created database.");
  const applied = await migrate();
  if (applied.length) app.log.info({ applied }, "Applied migrations.");

  const { platform, seeded } = await Platform.boot();
  if (seeded)
    app.log.info("Seeded the demonstration dataset into an empty database.");
  const hub = new RealtimeHub(platform);

  await app.register(cors, {
    origin: config.corsOrigins.length ? config.corsOrigins : true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Authorization", "Content-Type"],
  });
  await app.register(jwt, { secret: config.jwtSecret });

  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof HttpError) {
      void reply
        .code(error.status)
        .send({ code: error.code, message: error.message });
      return;
    }
    const status = (error as { statusCode?: number }).statusCode;
    if (status && status < 500) {
      void reply
        .code(status)
        .send({ code: "invalid", message: (error as Error).message });
      return;
    }
    app.log.error(error);
    void reply
      .code(500)
      .send({
        code: "server",
        message: "The server could not complete the request.",
      });
  });

  registerRoutes(app, platform, hub);

  // The simulator is the demo's stand-in for the outside world. It never runs outside demo mode.
  let ticker: NodeJS.Timeout | undefined;
  if (config.demoMode) {
    const simulator = createSimulator({ getState: () => platform.state });
    let wasPaused = true;
    ticker = setInterval(() => {
      if (platform.simulationPaused) {
        wasPaused = true;
        return;
      }
      if (wasPaused) {
        simulator.start();
        wasPaused = false;
      }
      platform
        .commit(() => simulator.tick())
        .catch((error) => app.log.error(error, "Simulator step failed."));
    }, 1000);
  }

  const shutdown = async () => {
    if (ticker) clearInterval(ticker);
    hub.close();
    await app.close();
    await pool.end();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await app.listen({ host: config.host, port: config.port });
  const s = platform.state;
  console.log(`SafeConnect API ready on http://localhost:${config.port} · ${s.incidents.length} incidents, ${s.units.length} units · demo mode ${config.demoMode ? "on" : "off"}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
