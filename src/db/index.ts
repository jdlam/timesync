import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Get database connection string from environment variable
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error("DATABASE_URL environment variable is not set");
}

// Create Neon HTTP client
const sql = neon(databaseUrl);

// Create Drizzle database instance
export const db = drizzle(sql, { schema });

// Export schema for use in queries
export * from "./schema";
