/**
 * Database tasks.
 *
 *   npm run db:setup    create the database if missing, apply migrations, seed if empty
 *   npm run db:reset    wipe back to the starting dataset (stop the API first, or use "Reset demo")
 *   npm run db:status   row counts and audit-chain check
 */
import { config } from "../config";
import {
  ensureDatabase,
  migrate,
  pool,
  tableCounts,
  verifyAuditChain,
} from "../db";
import { Platform } from "../platform";

const task = process.argv[2] ?? "setup";
const target = new URL(config.databaseUrl);
const where = `${target.hostname}:${target.port || 5432}${target.pathname}`;

async function run() {
  if (task === "setup" || task === "reset") {
    console.log(`Database ${where}`);
    if (await ensureDatabase()) console.log("  created");
    const applied = await migrate();
    console.log(
      applied.length
        ? `  migrations applied: ${applied.join(", ")}`
        : "  schema is up to date",
    );
    const { platform, seeded } = await Platform.boot();
    if (task === "reset" && !seeded) {
      await platform.reset();
      console.log("  reset to the starting dataset");
    } else {
      console.log(
        seeded
          ? "  seeded the demonstration dataset"
          : "  data already present (use db:reset to start over)",
      );
    }
  }

  if (task === "setup" || task === "reset" || task === "status") {
    const counts = await tableCounts();
    const chain = await verifyAuditChain();
    console.log(
      `  incidents ${counts.incidents} · units ${counts.units} · evidence ${counts.evidence} · complaints ${counts.complaints} · messages ${counts.messages} · audit ${counts.audit_events}`,
    );
    console.log(
      `  audit chain: ${chain.intact ? `intact (${chain.checked} entries)` : `BROKEN at ${chain.brokenAt}`}`,
    );
  }
}

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
