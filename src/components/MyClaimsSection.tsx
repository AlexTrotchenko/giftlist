import { memo } from "react";
import {
	AlertTriangle,
	Calendar,
	Check,
	ExternalLink,
	Package,
	ShoppingCart,
	Unlock,
	User,
} from "lucide-react";
import { toast } from "sonner";
import type { MyClaimResponse } from "@/db/types";
import { useMyClaims, useReleaseClaim } from "@/hooks/useClaims";
import { useMarkPurchased, useUnmarkPurchased } from "@/hooks/usePurchase";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, isExpiringSoon } from "@/lib/utils";
import { formatPrice, getExpirationText } from "@/i18n/formatting";
import { getLocale } from "@/paraglide/runtime";
import * as m from "@/paraglide/messages";

interface MyClaimCardProps {
	claim: MyClaimResponse;
}

const MyClaimCard = memo(function MyClaimCard({ claim }: MyClaimCardProps) {
	const { mutate: releaseClaim, isPending: isReleasePending } = useReleaseClaim();
	const markPurchased = useMarkPurchased();
	const unmarkPurchased = useUnmarkPurchased();
	const { item, owner, expiresAt, amount, purchasedAt } = claim;
	const expiring = isExpiringSoon(expiresAt);
	const locale = getLocale();
	const isPurchased = purchasedAt !== null;

	const handleRelease = () => {
		releaseClaim(claim.id);
	};

	const handleTogglePurchased = () => {
		if (isPurchased) {
			toast.promise(unmarkPurchased.mutateAsync(claim.id), {
				loading: m.common_saving(),
				success: m.purchase_unpurchaseSuccess(),
				error: (err) => err.message || m.errors_genericError(),
			});
		} else {
			toast.promise(markPurchased.mutateAsync(claim.id), {
				loading: m.common_saving(),
				success: m.purchase_purchaseSuccess(),
				error: (err) => err.message || m.errors_genericError(),
			});
		}
	};

	const isPurchasePending = markPurchased.isPending || unmarkPurchased.isPending;

	return (
		<Card
			className={cn(
				"overflow-hidden transition-shadow hover:shadow-md",
				expiring && "border-amber-300 dark:border-amber-700",
			)}
		>
			{/* Image or placeholder */}
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
						<Package className="size-12 text-muted-foreground/50" />
					</div>
				)}

				{/* Status badges */}
				<div className="absolute right-2 top-2 flex flex-col items-end gap-1">
					{/* Purchased badge */}
					{isPurchased && (
						<Badge
							className="gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
						>
							<Check className="size-3" />
							{m.purchase_purchasedBadge()}
						</Badge>
					)}
					{/* Expiration badge */}
					{expiresAt && (
						<Badge
							className={cn(
								"gap-1",
								expiring
									? "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
									: "bg-muted/90 text-muted-foreground",
							)}
						>
							{expiring ? (
								<AlertTriangle className="size-3" />
							) : (
								<Calendar className="size-3" />
							)}
							{getExpirationText(expiresAt, locale)}
						</Badge>
					)}
				</div>
			</div>

			<CardHeader className="pb-2">
				<div className="flex items-start justify-between gap-2">
					<CardTitle className="line-clamp-2 text-base">{item.name}</CardTitle>
					{item.price !== null && (
						<span className="shrink-0 font-semibold text-primary">
							{amount !== null ? formatPrice(amount, locale) : formatPrice(item.price, locale)}
						</span>
					)}
				</div>
				{/* Owner info */}
				<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<User className="size-3" />
					<span>{owner.name || m.claims_unknownOwner()}</span>
					{amount !== null && item.price !== null && (
						<span className="ml-auto text-xs text-muted-foreground">
							{m.claims_partialOfPrice({ amount: formatPrice(item.price, locale) })}
						</span>
					)}
				</div>
			</CardHeader>

			<CardContent className="py-0">
				{/* Claim type indicator */}
				<div className="text-xs text-muted-foreground">
					{amount === null ? m.claims_fullClaim() : m.claims_partialAmount()}
				</div>
			</CardContent>

			<CardFooter className="flex flex-col gap-3 pt-4">
				<div className="flex w-full items-center justify-between gap-2">
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
					<Button
						variant="outline"
						size="sm"
						onClick={handleRelease}
						disabled={isReleasePending}
						className="gap-1.5"
					>
						<Unlock className="size-4" />
						{isReleasePending ? m.claims_releasing() : m.claims_release()}
					</Button>
				</div>
				<Button
					variant={isPurchased ? "secondary" : "default"}
					size="sm"
					onClick={handleTogglePurchased}
					disabled={isPurchasePending}
					className={cn(
						"w-full gap-1.5",
						isPurchased && "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50",
					)}
				>
					{isPurchased ? (
						<>
							<Check className="size-4" />
							{m.purchase_unmarkPurchased()}
						</>
					) : (
						<>
							<ShoppingCart className="size-4" />
							{m.purchase_markPurchased()}
						</>
					)}
				</Button>
			</CardFooter>
		</Card>
	);
});

function EmptyClaimsState() {
	return (
		<div className="flex flex-col items-center justify-center py-12 text-center">
			<div className="mb-4 rounded-full bg-muted p-3">
				<Package className="size-6 text-muted-foreground" />
			</div>
			<h3 className="mb-1 text-lg font-medium">{m.shared_noActiveClaims()}</h3>
			<p className="text-sm text-muted-foreground">
				{m.shared_noActiveClaimsDescription()}
			</p>
		</div>
	);
}

export function MyClaimsSection() {
	const { data: claims = [], isLoading } = useMyClaims();

	if (isLoading) {
		return (
			<section className="mb-8">
				<h2 className="mb-4 text-xl font-semibold">{m.claims_myClaimsTitle()}</h2>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{[1, 2, 3].map((i) => (
						<Card key={i} className="animate-pulse">
							<div className="aspect-[4/3] w-full bg-muted" />
							<CardHeader className="pb-2">
								<div className="h-5 w-3/4 rounded bg-muted" />
								<div className="h-4 w-1/2 rounded bg-muted" />
							</CardHeader>
							<CardFooter className="pt-4">
								<div className="h-8 w-20 rounded bg-muted" />
							</CardFooter>
						</Card>
					))}
				</div>
			</section>
		);
	}

	if (claims.length === 0) {
		return null;
	}

	return (
		<section className="mb-8">
			<h2 className="mb-4 text-xl font-semibold">
				{m.shared_myClaims({ count: claims.length })}
			</h2>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{claims.map((claim) => (
					<MyClaimCard key={claim.id} claim={claim} />
				))}
			</div>
		</section>
	);
}
