import type { APIContext } from "astro";
import { and, eq } from "drizzle-orm";
import { groupMembers, groups, users } from "@/db/schema";
import type { GroupMemberResponse, UserResponse } from "@/db/types";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";

export type MemberWithUser = GroupMemberResponse & {
	user: Pick<UserResponse, "id" | "name" | "email" | "avatarUrl">;
};

/**
 * GET /api/groups/[id]/members - List all members of a group
 * Only accessible by group owner or members
 */
export async function GET(context: APIContext) {
	const db = createDb(context.locals.runtime.env.DB);
	const auth = getAuthAdapter(context.locals.runtime.env);

	const authUser = await auth.getCurrentUser(context.request, context.locals);
	if (!authUser) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	const user = await db
		.select()
		.from(users)
		.where(eq(users.clerkId, authUser.providerId))
		.get();

	if (!user) {
		return new Response(JSON.stringify({ error: "User not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	const groupId = context.params.id;
	if (!groupId) {
		return new Response(JSON.stringify({ error: "Group ID required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Get the group
	const group = await db
		.select()
		.from(groups)
		.where(eq(groups.id, groupId))
		.get();

	if (!group) {
		return new Response(JSON.stringify({ error: "Group not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Check if user is owner or member
	const isOwner = group.ownerId === user.id;
	const membership = await db
		.select()
		.from(groupMembers)
		.where(
			and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)),
		)
		.get();

	if (!isOwner && !membership) {
		return new Response(JSON.stringify({ error: "Group not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Get all members with user details
	const members = await db
		.select({
			id: groupMembers.id,
			groupId: groupMembers.groupId,
			userId: groupMembers.userId,
			role: groupMembers.role,
			joinedAt: groupMembers.joinedAt,
			user: {
				id: users.id,
				name: users.name,
				email: users.email,
				avatarUrl: users.avatarUrl,
			},
		})
		.from(groupMembers)
		.innerJoin(users, eq(groupMembers.userId, users.id))
		.where(eq(groupMembers.groupId, groupId));

	// Serialize dates for JSON response
	const responseData: MemberWithUser[] = members.map((member) => ({
		...member,
		joinedAt: member.joinedAt?.toISOString() ?? null,
	}));

	return new Response(JSON.stringify(responseData), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}
