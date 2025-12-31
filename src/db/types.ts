import type {
	claims,
	groupMembers,
	groups,
	invitations,
	itemRecipients,
	items,
	notifications,
	users,
} from "./schema";

// Database types (as stored in DB with Date objects)
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

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

export type NotificationResponse = Omit<
	Notification,
	"createdAt" | "updatedAt"
> & {
	createdAt: string | null;
	updatedAt: string | null;
};

// Group types
export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;

export type GroupMember = typeof groupMembers.$inferSelect;
export type NewGroupMember = typeof groupMembers.$inferInsert;

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;

export type ItemRecipient = typeof itemRecipients.$inferSelect;
export type NewItemRecipient = typeof itemRecipients.$inferInsert;

// API response types for groups
export type GroupResponse = Omit<Group, "createdAt" | "updatedAt"> & {
	createdAt: string | null;
	updatedAt: string | null;
};

export type GroupMemberResponse = Omit<GroupMember, "joinedAt"> & {
	joinedAt: string | null;
};

export type InvitationResponse = Omit<
	Invitation,
	"createdAt" | "updatedAt" | "expiresAt"
> & {
	createdAt: string | null;
	updatedAt: string | null;
	expiresAt: string;
};

export type ItemRecipientResponse = Omit<ItemRecipient, "createdAt"> & {
	createdAt: string | null;
};

// Claim types
export type Claim = typeof claims.$inferSelect;
export type NewClaim = typeof claims.$inferInsert;

export type ClaimResponse = Omit<Claim, "createdAt" | "expiresAt"> & {
	createdAt: string | null;
	expiresAt: string | null;
};

// Claim with claimer user info for API responses
export type ClaimWithUserResponse = ClaimResponse & {
	user: Pick<UserResponse, "id" | "name" | "avatarUrl">;
};

// Claim with item and owner info for "My Claims" view
export type MyClaimResponse = ClaimResponse & {
	item: Pick<ItemResponse, "id" | "name" | "imageUrl" | "url" | "price">;
	owner: Pick<UserResponse, "id" | "name" | "avatarUrl">;
};
