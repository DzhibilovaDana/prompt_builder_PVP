import { execFileSync } from "child_process";
import { DB_PATH, getDatabaseEngine, runPostgresExec, runPostgresJsonQuery } from "@/lib/dbSchema";

export function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

export function runSqliteJson<T>(sql: string): T {
  const output = execFileSync("sqlite3", ["-json", DB_PATH, sql], {
    encoding: "utf-8",
  }).trim();

  if (!output) {
    return [] as T;
  }

  return JSON.parse(output) as T;
}

export function runExec(sql: string): void {
  if (getDatabaseEngine() === "postgres") {
    runPostgresExec(sql);
    return;
  }
  runSqliteJson<unknown>(sql);
}

export function runJsonQuery<T>(sql: string): T {
  if (getDatabaseEngine() === "postgres") {
    return runPostgresJsonQuery<T>(sql);
  }
  return runSqliteJson<T>(sql);
}

export function nowExpression(): string {
  return getDatabaseEngine() === "postgres" ? "NOW()" : "datetime('now')";
}
