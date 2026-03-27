import { execFileSync } from "child_process";

const databaseUrl = process.env.DATABASE_URL ?? "";
const isPostgres = databaseUrl.startsWith("postgresql://") || databaseUrl.startsWith("postgres://");

if (!isPostgres) {
  console.error("DATABASE_URL must be set to a PostgreSQL connection string");
  process.exit(1);
}

const sql = `
  TRUNCATE TABLE users RESTART IDENTITY CASCADE;
`;

execFileSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-c", sql], {
  stdio: "inherit",
});

console.log("All users and dependent data were removed");
