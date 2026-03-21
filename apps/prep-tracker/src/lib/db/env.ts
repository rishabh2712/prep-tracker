const LOCAL_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

function readDatabaseEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    if (process.env.NODE_ENV !== "production" && name === "DATABASE_URL") {
      return LOCAL_DATABASE_URL;
    }
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getDatabaseUrl(): string {
  return readDatabaseEnv("DATABASE_URL");
}
