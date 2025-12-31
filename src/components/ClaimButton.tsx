import { useState } from "react";
import { AlertTriangle, Check, Loader2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCreateClaim, useReleaseClaim } from "@/hooks/useClaims";
import type { ClaimWithUserResponse } from "@/db/types";
import { cn } from "@/lib/utils";

interface ClaimButtonProps {
	itemId: string;
	claims: ClaimWithUserResponse[];
	claimableAmount: number | null;
	currentUserId: string;
	itemPrice: number | null;
}

type ClaimState =
	| "unclaimed"
	| "partially_claimed"
	| "fully_claimed_by_me"
	| "fully_claimed_by_other"
	| "expiring_soon";

function isExpiringSoon(expiresAt: string | null): boolean {
	if (!expiresAt) return false;
	const expiryDate = new Date(expiresAt);
	const now = new Date();
	const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
	return expiryDate.getTime() - now.getTime() < threeDaysMs;
}

function formatPrice(cents: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(cents / 100);
}

function getClaimState(
	claims: ClaimWithUserResponse[],
	claimableAmount: number | null,
	currentUserId: string,
	itemPrice: number | null,
): ClaimState {
	const myClaims = claims.filter((c) => c.userId === currentUserId);
	const otherClaims = claims.filter((c) => c.userId !== currentUserId);

	// Check if I have a full claim (amount is null)
	const myFullClaim = myClaims.find((c) => c.amount === null);
	if (myFullClaim) {
		if (isExpiringSoon(myFullClaim.expiresAt)) {
			return "expiring_soon";
		}
		return "fully_claimed_by_me";
	}

	// Check if someone else has a full claim
	const otherFullClaim = otherClaims.find((c) => c.amount === null);
	if (otherFullClaim) {
		return "fully_claimed_by_other";
	}

	// For items with price, check partial claims
	if (itemPrice !== null) {
		// If no claimable amount left, someone else claimed it all
		if (claimableAmount === 0) {
			// Check if I have any partial claims
			if (myClaims.length > 0) {
				const myClaimExpiring = myClaims.some((c) =>
					isExpiringSoon(c.expiresAt),
				);
				if (myClaimExpiring) {
					return "expiring_soon";
				}
				return "fully_claimed_by_me";
			}
			return "fully_claimed_by_other";
		}

		// If there are some claims but still claimable amount
		if (claims.length > 0 && claimableAmount !== null && claimableAmount > 0) {
			return "partially_claimed";
		}
	}

	return "unclaimed";
}

export function ClaimButton({
	itemId,
	claims,
	claimableAmount,
	currentUserId,
	itemPrice,
}: ClaimButtonProps) {
	const [isProcessing, setIsProcessing] = useState(false);
	const createClaim = useCreateClaim();
	const releaseClaim = useReleaseClaim();

	const claimState = getClaimState(
		claims,
		claimableAmount,
		currentUserId,
		itemPrice,
	);
	const myClaims = claims.filter((c) => c.userId === currentUserId);

	const handleClaim = () => {
		setIsProcessing(true);
		createClaim.mutate(
			{ itemId },
			{
				onSettled: () => setIsProcessing(false),
			},
		);
	};

	const handleRelease = () => {
		if (myClaims.length === 0) return;
		setIsProcessing(true);
		// Release all my claims on this item
		const releasePromises = myClaims.map((claim) =>
			releaseClaim.mutateAsync(claim.id),
		);
		Promise.all(releasePromises).finally(() => setIsProcessing(false));
	};

	const isPending = isProcessing || createClaim.isPending || releaseClaim.isPending;

	switch (claimState) {
		case "unclaimed":
			return (
				<Button
					size="sm"
					variant="default"
					className="gap-1.5"
					onClick={handleClaim}
					disabled={isPending}
				>
					{isPending ? (
						<Loader2 className="size-3.5 animate-spin" />
					) : (
						<Lock className="size-3.5" />
					)}
					Claim
				</Button>
			);

		case "partially_claimed":
			return (
				<Button
					size="sm"
					variant="default"
					className="gap-1.5"
					onClick={handleClaim}
					disabled={isPending}
				>
					{isPending ? (
						<Loader2 className="size-3.5 animate-spin" />
					) : (
						<Lock className="size-3.5" />
					)}
					Claim{claimableAmount !== null && ` ${formatPrice(claimableAmount)}`}
				</Button>
			);

		case "fully_claimed_by_me":
			return (
				<Button
					size="sm"
					variant="outline"
					className="gap-1.5"
					onClick={handleRelease}
					disabled={isPending}
				>
					{isPending ? (
						<Loader2 className="size-3.5 animate-spin" />
					) : (
						<Unlock className="size-3.5" />
					)}
					Release Claim
				</Button>
			);

		case "fully_claimed_by_other": {
			const claimer = claims.find((c) => c.userId !== currentUserId);
			return (
				<Badge
					variant="secondary"
					className={cn(
						"gap-1.5 bg-green-100 text-green-800",
						"dark:bg-green-900/30 dark:text-green-400",
					)}
				>
					<Check className="size-3" />
					Claimed{claimer?.user.name ? ` by ${claimer.user.name}` : ""}
				</Badge>
			);
		}

		case "expiring_soon":
			return (
				<div className="flex items-center gap-2">
					<Button
						size="sm"
						variant="outline"
						className={cn(
							"gap-1.5 border-amber-300 text-amber-700",
							"hover:bg-amber-50 hover:text-amber-800",
							"dark:border-amber-700 dark:text-amber-400",
							"dark:hover:bg-amber-900/20 dark:hover:text-amber-300",
						)}
						onClick={handleRelease}
						disabled={isPending}
					>
						{isPending ? (
							<Loader2 className="size-3.5 animate-spin" />
						) : (
							<>
								<AlertTriangle className="size-3.5" />
								Expiring Soon
							</>
						)}
					</Button>
				</div>
			);

		default:
			return null;
	}
}
