import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";

export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	const auth = getAuthAdapter(env);
	const db = createDb(env.DB);

	try {
		const event = await auth.verifyWebhook(request);

		switch (event.type) {
			case "user.created": {
				await db.insert(users).values({
					clerkId: event.data.providerId,
					email: event.data.email,
					name: event.data.name,
					avatarUrl: event.data.avatarUrl,
				});
				break;
			}

			case "user.updated": {
				await db
					.update(users)
					.set({
						email: event.data.email,
						name: event.data.name,
						avatarUrl: event.data.avatarUrl,
						updatedAt: new Date(),
					})
					.where(eq(users.clerkId, event.data.providerId));
				break;
			}

			case "user.deleted": {
				await db.delete(users).where(eq(users.clerkId, event.data.providerId));
				break;
			}
		}

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Webhook error:", error);
		return new Response(
			JSON.stringify({
				error:
					error instanceof Error ? error.message : "Webhook processing failed",
			}),
			{
				status: 400,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
