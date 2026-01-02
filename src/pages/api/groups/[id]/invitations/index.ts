import type { APIContext } from "astro";
import { and, eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { ZodError } from "zod";
import { groupMembers, groups, invitations, users } from "@/db/schema";
import type { InvitationResponse } from "@/db/types";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { createEmailClient } from "@/lib/email";
import { createNotificationService } from "@/lib/notifications";
import {
	type CreateInvitationInput,
	createInvitationSchema,
} from "@/lib/validations/invitation";

const generateToken = customAlphabet(
	"0123456789abcdefghijklmnopqrstuvwxyz",
	32,
);

// Default invitation expiration: 7 days
const INVITATION_EXPIRY_DAYS = 7;

/**
 * GET /api/groups/[id]/invitations - List invitations for a group
 * Only accessible by group owner or admins
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

	// Check if user is owner or admin
	const membership = await db
		.select()
		.from(groupMembers)
		.where(
			and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)),
		)
		.get();

	const canViewInvitations =
		group.ownerId === user.id ||
		membership?.role === "owner" ||
		membership?.role === "admin";

	if (!canViewInvitations) {
		return new Response(JSON.stringify({ error: "Forbidden" }), {
			status: 403,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Get all invitations for the group
	const groupInvitations = await db
		.select()
		.from(invitations)
		.where(eq(invitations.groupId, groupId));

	// Serialize dates for JSON response
	const responseData: InvitationResponse[] = groupInvitations.map((inv) => ({
		...inv,
		createdAt: inv.createdAt?.toISOString() ?? null,
		updatedAt: inv.updatedAt?.toISOString() ?? null,
		expiresAt: inv.expiresAt.toISOString(),
	}));

	return new Response(JSON.stringify(responseData), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

/**
 * POST /api/groups/[id]/invitations - Create a new invitation
 * Only accessible by group owner or admins
 */
export async function POST(context: APIContext) {
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

	// Check if user is owner or admin
	const membership = await db
		.select()
		.from(groupMembers)
		.where(
			and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)),
		)
		.get();

	const canInvite =
		group.ownerId === user.id ||
		membership?.role === "owner" ||
		membership?.role === "admin";

	if (!canInvite) {
		return new Response(
			JSON.stringify({ error: "Only owners and admins can invite members" }),
			{
				status: 403,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	let body: unknown;
	try {
		body = await context.request.json();
	} catch {
		return new Response(JSON.stringify({ error: "Invalid JSON" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	let validatedData: CreateInvitationInput;
	try {
		validatedData = createInvitationSchema.parse(body);
	} catch (error) {
		if (error instanceof ZodError) {
			return new Response(
				JSON.stringify({ error: "Validation error", details: error.errors }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}
		throw error;
	}

	// Check if user is already a member
	const existingMember = await db
		.select()
		.from(groupMembers)
		.innerJoin(users, eq(groupMembers.userId, users.id))
		.where(
			and(
				eq(groupMembers.groupId, groupId),
				eq(users.email, validatedData.email),
			),
		)
		.get();

	if (existingMember) {
		return new Response(
			JSON.stringify({ error: "User is already a member of this group" }),
			{
				status: 409,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Check for existing pending invitation
	const existingInvitation = await db
		.select()
		.from(invitations)
		.where(
			and(
				eq(invitations.groupId, groupId),
				eq(invitations.inviteeEmail, validatedData.email),
				eq(invitations.status, "pending"),
			),
		)
		.get();

	if (existingInvitation) {
		return new Response(
			JSON.stringify({ error: "A pending invitation already exists for this email" }),
			{
				status: 409,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Generate a unique token
	const token = generateToken();
	const expiresAt = new Date(
		Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
	);

	// Create the invitation
	const [newInvitation] = await db
		.insert(invitations)
		.values({
			groupId,
			inviterId: user.id,
			inviteeEmail: validatedData.email,
			token,
			role: validatedData.role,
			expiresAt,
		})
		.returning();

	// Build the invite URL from the request origin
	const url = new URL(context.request.url);
	const inviteUrl = `${url.origin}/invite/${token}`;

	// Send invitation email and create notification if user exists
	const emailClient = createEmailClient(
		context.locals.runtime.env.RESEND_API_KEY,
	);
	const notificationService = createNotificationService(db, emailClient);

	// Check if invitee already has an account
	const inviteeUser = await db
		.select()
		.from(users)
		.where(eq(users.email, validatedData.email))
		.get();

	await notificationService.sendInvitationEmail({
		userId: inviteeUser?.id,
		inviteeEmail: validatedData.email,
		inviterName: user.name ?? user.email,
		groupName: group.name,
		inviteUrl,
		locale: context.locals.locale ?? "en",
		data: { groupId, invitationId: newInvitation.id },
	});

	// Serialize dates for JSON response
	const responseData: InvitationResponse = {
		...newInvitation,
		createdAt: newInvitation.createdAt?.toISOString() ?? null,
		updatedAt: newInvitation.updatedAt?.toISOString() ?? null,
		expiresAt: newInvitation.expiresAt.toISOString(),
	};

	return new Response(JSON.stringify(responseData), {
		status: 201,
		headers: { "Content-Type": "application/json" },
	});
}
