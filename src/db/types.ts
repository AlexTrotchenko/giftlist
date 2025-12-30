import type { items, users } from "./schema";

// Database types (as stored in DB with Date objects)
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;

// API response types (JSON-serialized with dates as strings)
// Use these in frontend components and API client code
export type ItemResponse = Omit<Item, "createdAt" | "updatedAt"> & {
	createdAt: string | null;
	updatedAt: string | null;
};

export type UserResponse = Omit<User, "createdAt" | "updatedAt"> & {
	createdAt: string | null;
	updatedAt: string | null;
};
