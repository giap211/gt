import { spawnSync } from "node:child_process";

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/rophim";

const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED || databaseUrl,
};

const result = spawnSync(
  "pnpm",
  ["exec", "prisma", "validate", "--schema=./prisma/schema.prisma"],
  {
    env,
    shell: process.platform === "win32",
    stdio: "inherit",
  },
);

process.exit(result.status ?? 1);
