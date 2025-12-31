import { drizzle } from "drizzle-orm/d1";
import type { Column } from "drizzle-orm";
import { eq, inArray, sql } from "drizzle-orm";
import * as schema from "@/db/schema";

export function createDb(d1: D1Database) {
	return drizzle(d1, { schema });
}

export type Database = ReturnType<typeof createDb>;

/**
 * Safe version of inArray that handles single-element arrays.
 * SQLite can have issues with IN clauses containing a single value.
 * This function uses eq() for single values and inArray() for multiple.
 *
 * @param column - The Drizzle column to compare
 * @param values - Array of values to match against
 * @returns SQL condition or false literal if array is empty
 */
export function safeInArray<T>(column: Column, values: T[]) {
	if (values.length === 0) {
		// Return a condition that's always false
		return sql`1 = 0`;
	}
	if (values.length === 1) {
		return eq(column, values[0]);
	}
	return inArray(column, values);
}
