import { AlertTriangle, Check, ExternalLink, User } from "lucide-react";
import type { SharedItem } from "@/hooks/useSharedItems";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClaimButton } from "@/components/ClaimButton";
import { PriorityStars } from "@/components/PriorityStars";
import { cn, isExpiringSoon } from "@/lib/utils";
import { getLocale } from "@/i18n/LocaleContext";
import { formatPrice, getExpirationText } from "@/i18n/formatting";
import * as m from "@/paraglide/messages";

interface SharedItemCardProps {
	sharedItem: SharedItem;
	currentUserId: string;
}

export function SharedItemCard({ sharedItem, currentUserId }: SharedItemCardProps) {
	const { item, owner, sharedVia, claims = [], claimableAmount } = sharedItem;
	const locale = getLocale();

	// Determine if current user is the owner (should not see claim badges)
	const isOwner = owner.id === currentUserId;

	// Calculate claim progress for items with price
	const hasPrice = item.price !== null;
	const claimedAmount = hasPrice && item.price !== null
		? item.price - (claimableAmount ?? item.price)
		: 0;
	const claimProgress = hasPrice && item.price !== null && item.price > 0
		? (claimedAmount / item.price) * 100
		: 0;
	const isPartiallyClaimed = hasPrice && claimProgress > 0 && claimProgress < 100;
	const isFullyClaimed = claims.length > 0 && (
		claims.some((c) => c.amount === null) || // full claim exists
		(hasPrice && claimableAmount === 0) // all partial claims fill the price
	);

	// Check for expiring claims (only relevant to non-owners viewing)
	const expiringClaim = claims.find((c) => isExpiringSoon(c.expiresAt));

	return (
		<Card className="overflow-hidden transition-shadow hover:shadow-md">
			{/* Image or placeholder with claim status overlay */}
			<div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
				{item.imageUrl ? (
					<img
						src={item.imageUrl}
						alt={item.name}
						loading="lazy"
						decoding="async"
						className="h-full w-full object-cover transition-opacity duration-300"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center">
						<span className="text-sm text-muted-foreground">{m.common_noImage()}</span>
					</div>
				)}

				{/* Claim status badges - hidden from owner */}
				{!isOwner && (isFullyClaimed || expiringClaim) && (
					<div className="absolute right-2 top-2 flex flex-col gap-1">
						{isFullyClaimed && !expiringClaim && (
							<Badge
								className={cn(
									"gap-1 bg-green-100 text-green-800",
									"dark:bg-green-900/30 dark:text-green-400",
								)}
							>
								<Check className="size-3" />
								{m.claims_fullyClaimedByOther()}
							</Badge>
						)}
						{expiringClaim && expiringClaim.expiresAt && (
							<Badge
								className={cn(
									"gap-1 border-amber-300 bg-amber-100 text-amber-800",
									"dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
								)}
							>
								<AlertTriangle className="size-3" />
								{getExpirationText(expiringClaim.expiresAt, locale)}
							</Badge>
						)}
					</div>
				)}
			</div>

			<CardHeader className="pb-2">
				<div className="flex items-start justify-between gap-2">
					<CardTitle className="line-clamp-2 text-base">{item.name}</CardTitle>
					<div className="flex shrink-0 items-center gap-2">
						<PriorityStars priority={item.priority} />
						{item.price !== null && (
							<span className="font-semibold text-primary">
								{formatPrice(item.price, locale)}
							</span>
						)}
					</div>
				</div>
				{/* Owner info */}
				<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<User className="size-3" />
					<span>{owner.name || owner.email}</span>
				</div>
			</CardHeader>

			<CardContent className="flex-1 py-0">
				{item.notes && (
					<p className="line-clamp-2 text-sm text-muted-foreground">
						{item.notes}
					</p>
				)}

				{/* Partial claim progress bar - hidden from owner */}
				{!isOwner && isPartiallyClaimed && item.price !== null && (
					<div className="mt-3 space-y-1">
						<div className="flex items-center justify-between text-xs">
							<span className="text-muted-foreground">{m.claims_claimProgress()}</span>
							<span className="font-medium">
								{formatPrice(claimedAmount, locale)} / {formatPrice(item.price, locale)}
							</span>
						</div>
						<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
							<div
								className="h-full bg-primary transition-all duration-300"
								style={{ width: `${claimProgress}%` }}
							/>
						</div>
					</div>
				)}

				{/* Shared via groups */}
				<div className="mt-2 flex flex-wrap gap-1">
					{sharedVia.map((group) => (
						<span
							key={group.groupId}
							className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
						>
							{group.groupName}
						</span>
					))}
				</div>
			</CardContent>

			<CardFooter className="flex items-center justify-between gap-2 pt-4">
				{item.url ? (
					<a
						href={item.url}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1 text-sm text-primary transition-colors hover:text-primary/80"
					>
						<ExternalLink className="size-3.5" />
						{m.common_viewProduct()}
					</a>
				) : (
					<span />
				)}
				<ClaimButton
					itemId={item.id}
					itemName={item.name}
					claims={claims}
					claimableAmount={claimableAmount}
					currentUserId={currentUserId}
					itemPrice={item.price}
				/>
			</CardFooter>
		</Card>
	);
}
