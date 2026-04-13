import { defineConfig } from "drizzle-kit";
import "dotenv/config";

const url = process.env.TURSO_DATABASE_URL ?? "file:local.db";
const isRemote = url.startsWith("libsql://") || url.startsWith("https://");

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: isRemote ? "turso" : "sqlite",
  dbCredentials: isRemote
    ? { url, authToken: process.env.TURSO_AUTH_TOKEN! }
    : { url: url.replace(/^file:/, "") },
});
