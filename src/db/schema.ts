import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
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

// Item status values for lifecycle tracking
export const itemStatuses = ["active", "received", "archived"] as const;
export type ItemStatus = (typeof itemStatuses)[number];

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
	priority: integer("priority"), // 1-5 stars, null = no priority
	status: text("status").notNull().default("active"), // 'active', 'received', 'archived'
	createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(
		() => new Date(),
	),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(
		() => new Date(),
	),
});

export const notifications = sqliteTable("notifications", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => nanoid()),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	type: text("type").notNull(), // e.g., 'item_purchased', 'friend_added', 'reminder'
	title: text("title").notNull(),
	body: text("body").notNull(),
	data: text("data", { mode: "json" }).$type<Record<string, unknown>>(),
	read: integer("read", { mode: "boolean" }).notNull().default(false),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(
		() => new Date(),
	),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(
		() => new Date(),
	),
});

// Groups for sharing wishlists
export const groups = sqliteTable("groups", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => nanoid()),
	name: text("name").notNull(),
	description: text("description"),
	ownerId: text("owner_id")
		.notNull()
		.references(() => users.id),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(
		() => new Date(),
	),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(
		() => new Date(),
	),
});

// Group membership junction table with role metadata
export const groupMembers = sqliteTable(
	"group_members",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => nanoid()),
		groupId: text("group_id")
			.notNull()
			.references(() => groups.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		role: text("role").notNull().default("member"), // 'owner', 'admin', 'member'
		joinedAt: integer("joined_at", { mode: "timestamp_ms" }).$defaultFn(
			() => new Date(),
		),
	},
	(table) => [uniqueIndex("group_user_idx").on(table.groupId, table.userId)],
);

// Invitations to join groups
export const invitations = sqliteTable("invitations", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => nanoid()),
	groupId: text("group_id")
		.notNull()
		.references(() => groups.id, { onDelete: "cascade" }),
	inviterId: text("inviter_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	inviteeEmail: text("invitee_email").notNull(),
	token: text("token").notNull().unique(),
	role: text("role").notNull().default("member"), // role to assign on acceptance
	status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'declined', 'expired'
	expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(
		() => new Date(),
	),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(
		() => new Date(),
	),
});

// Item recipients - tracks which groups can see an item
export const itemRecipients = sqliteTable(
	"item_recipients",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => nanoid()),
		itemId: text("item_id")
			.notNull()
			.references(() => items.id, { onDelete: "cascade" }),
		groupId: text("group_id")
			.notNull()
			.references(() => groups.id, { onDelete: "cascade" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(
			() => new Date(),
		),
	},
	(table) => [uniqueIndex("item_group_idx").on(table.itemId, table.groupId)],
);

// Claims - reserve items to prevent duplicate gifts
// Per concept design: one claim per item (full claim) OR multiple partial claims
// Claims are HIDDEN from item owner, VISIBLE to other recipients
export const claims = sqliteTable(
	"claims",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => nanoid()),
		itemId: text("item_id")
			.notNull()
			.references(() => items.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		// For partial claims: amount in cents (null = full claim)
		amount: integer("amount"),
		// Claim expiration (null = no expiration, default 30 days from creation)
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
		// When the gift-giver marked this claim as purchased (null = not yet purchased)
		purchasedAt: integer("purchased_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(
			() => new Date(),
		),
	},
	(table) => [
		// Index for looking up claims by item (supports multiple partial claims per item)
		index("claims_item_idx").on(table.itemId),
		// Index for looking up claims by user ("my claims" view)
		index("claims_user_idx").on(table.userId),
		// Index for expiration queries (cleanup of expired claims)
		index("claims_expires_idx").on(table.expiresAt),
	],
);
