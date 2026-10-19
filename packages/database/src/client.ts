import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export function createDb(url: string) {
  return drizzle(new Pool({ connectionString: url }), { schema });
}

export type Db = ReturnType<typeof createDb>;
