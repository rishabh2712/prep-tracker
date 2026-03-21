import postgres from "postgres";
import { getDatabaseUrl } from "@/lib/db/env";

declare global {
  var __prepTrackerSql__: ReturnType<typeof postgres> | undefined;
}

export function getSql() {
  if (!globalThis.__prepTrackerSql__) {
    globalThis.__prepTrackerSql__ = postgres(getDatabaseUrl(), {
      max: 1,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }

  return globalThis.__prepTrackerSql__;
}
