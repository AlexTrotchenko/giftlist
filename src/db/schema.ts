import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12);

export const users = sqliteTable("users", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => nanoid()),
	clerkId: text("clerk_id").notNull().unique(),
	email: text("email").notNull(),
	name: text("name"),
	avatarUrl: text("avatar_url"),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(
		() => new Date(),
	),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(
		() => new Date(),
	),
});

export const items = sqliteTable("items", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => nanoid()),
	ownerId: text("owner_id")
		.notNull()
		.references(() => users.id),
	name: text("name").notNull(),
	url: text("url"),
	price: integer("price"), // cents to avoid float issues
	notes: text("notes"),
	imageUrl: text("image_url"),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(
		() => new Date(),
	),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(
		() => new Date(),
	),
});
