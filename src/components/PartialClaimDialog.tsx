import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useCreateClaim } from "@/hooks/useClaims";
import type { ClaimWithUserResponse } from "@/db/types";
import { cn } from "@/lib/utils";
import { formatPrice, getExpirationText } from "@/i18n/formatting";
import { getLocale } from "@/paraglide/runtime";
import * as m from "@/paraglide/messages";

interface PartialClaimDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	itemId: string;
	itemName: string;
	itemPrice: number;
	claimableAmount: number;
	existingClaims: ClaimWithUserResponse[];
	currentUserId: string;
}

type ClaimType = "full" | "partial";

function parseAmount(value: string): number | null {
	if (!value.trim()) return null;
	const parsed = Number.parseFloat(value);
	if (Number.isNaN(parsed) || parsed <= 0) return null;
	return Math.round(parsed * 100); // Convert to cents
}

function formatAmountForInput(cents: number): string {
	return (cents / 100).toFixed(2);
}

export function PartialClaimDialog({
	open,
	onOpenChange,
	itemId,
	itemName,
	itemPrice,
	claimableAmount,
	existingClaims,
	currentUserId,
}: PartialClaimDialogProps) {
	const createClaim = useCreateClaim();
	const locale = getLocale();

	const [claimType, setClaimType] = useState<ClaimType>("full");
	const [partialAmount, setPartialAmount] = useState("");
	const [error, setError] = useState<string | null>(null);

	// Reset form when dialog opens
	useEffect(() => {
		if (open) {
			setClaimType("full");
			setPartialAmount(formatAmountForInput(claimableAmount));
			setError(null);
		}
	}, [open, claimableAmount]);

	const validateAndSubmit = () => {
		setError(null);

		if (claimType === "full") {
			// Full claim - no amount validation needed
			createClaim.mutate(
				{ itemId, amount: null },
				{
					onSuccess: () => {
						toast.success(m.claims_claimSuccess());
						onOpenChange(false);
					},
					onError: (err) => {
						setError(err.message);
						toast.error(err.message);
					},
				},
			);
			return;
		}

		// Partial claim - validate amount
		const amountCents = parseAmount(partialAmount);

		if (amountCents === null) {
			setError(m.validation_pleaseEnterValidAmount());
			return;
		}

		if (amountCents > claimableAmount) {
			setError(
				m.validation_amountExceedsRemaining({ amount: formatPrice(claimableAmount, locale) }),
			);
			return;
		}

		createClaim.mutate(
			{ itemId, amount: amountCents },
			{
				onSuccess: () => {
					toast.success(m.claims_claimSuccess());
					onOpenChange(false);
				},
				onError: (err) => {
					setError(err.message);
					toast.error(err.message);
				},
			},
		);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		validateAndSubmit();
	};

	const isLoading = createClaim.isPending;
	const myClaims = existingClaims.filter((c) => c.userId === currentUserId);
	const otherClaims = existingClaims.filter((c) => c.userId !== currentUserId);

	// Calculate claimed amounts
	const claimedAmount = itemPrice - claimableAmount;
	const claimProgress = (claimedAmount / itemPrice) * 100;

	return (
		<Dialog
			open={open}
			onOpenChange={(newOpen) => {
				// Prevent closing while submitting
				if (!isLoading) onOpenChange(newOpen);
			}}
		>
			<DialogContent className="sm:max-w-[425px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>{m.claims_claimItem()}</DialogTitle>
						<DialogDescription className="line-clamp-1">
							{itemName}
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						{/* Price & Progress */}
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">{m.claims_itemPrice()}</span>
								<span className="font-medium">{formatPrice(itemPrice, locale)}</span>
							</div>
							{claimedAmount > 0 && (
								<>
									<div className="h-2 overflow-hidden rounded-full bg-muted">
										<div
											className="h-full bg-primary transition-all"
											style={{ width: `${claimProgress}%` }}
										/>
									</div>
									<div className="flex items-center justify-between text-xs text-muted-foreground">
										<span>
											{m.claims_claimed({ amount: formatPrice(claimedAmount, locale) })}
										</span>
										<span>
											{m.claims_remaining({ amount: formatPrice(claimableAmount, locale) })}
										</span>
									</div>
								</>
							)}
						</div>

						{/* Claim Type Selection */}
						<div className="space-y-2">
							<Label>{m.claims_claimType()}</Label>
							<div className="flex gap-2">
								<Button
									type="button"
									variant={claimType === "full" ? "default" : "outline"}
									className="flex-1"
									onClick={() => setClaimType("full")}
									disabled={isLoading}
								>
									{m.claims_fullClaim()}
								</Button>
								<Button
									type="button"
									variant={claimType === "partial" ? "default" : "outline"}
									className="flex-1"
									onClick={() => setClaimType("partial")}
									disabled={isLoading}
								>
									{m.claims_partialAmount()}
								</Button>
							</div>
						</div>

						{/* Partial Amount Input */}
						{claimType === "partial" && (
							<div className="space-y-2">
								<Label htmlFor="amount">
									{m.claims_amountToClaim()}
								</Label>
								<Input
									id="amount"
									type="number"
									step="0.01"
									min="0.01"
									max={claimableAmount / 100}
									value={partialAmount}
									onChange={(e) => setPartialAmount(e.target.value)}
									placeholder="0.00"
									disabled={isLoading}
									aria-invalid={!!error}
								/>
								<p className="text-xs text-muted-foreground">
									{m.claims_maximum({ amount: formatPrice(claimableAmount, locale) })}
								</p>
							</div>
						)}

						{/* Error Display */}
						{error && <p className="text-sm text-destructive">{error}</p>}

						{/* Existing Claims List */}
						{existingClaims.length > 0 && (
							<div className="space-y-2">
								<Label className="text-muted-foreground">
									{m.claims_existingClaims({ count: existingClaims.length })}
								</Label>
								<div className="max-h-32 space-y-2 overflow-y-auto rounded-md border p-2">
									{myClaims.map((claim) => (
										<div
											key={claim.id}
											className={cn(
												"flex items-center justify-between rounded-md p-2 text-sm",
												"bg-primary/10",
											)}
										>
											<div className="flex items-center gap-2">
												<User className="size-3.5 text-muted-foreground" />
												<span className="font-medium">{m.common_you()}</span>
												{claim.amount !== null && (
													<span className="text-muted-foreground">
														({formatPrice(claim.amount, locale)})
													</span>
												)}
											</div>
											{claim.expiresAt && (
												<Badge variant="secondary" className="text-xs">
													{getExpirationText(claim.expiresAt, locale)}
												</Badge>
											)}
										</div>
									))}
									{otherClaims.map((claim) => (
										<div
											key={claim.id}
											className="flex items-center justify-between rounded-md bg-muted p-2 text-sm"
										>
											<div className="flex items-center gap-2">
												<User className="size-3.5 text-muted-foreground" />
												<span>{claim.user.name || m.common_someone()}</span>
												{claim.amount !== null && (
													<span className="text-muted-foreground">
														({formatPrice(claim.amount, locale)})
													</span>
												)}
											</div>
											{claim.expiresAt && (
												<Badge variant="secondary" className="text-xs">
													{getExpirationText(claim.expiresAt, locale)}
												</Badge>
											)}
										</div>
									))}
								</div>
							</div>
						)}
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isLoading}
						>
							{m.common_cancel()}
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? (
								<>
									<Loader2 className="mr-2 size-4 animate-spin" />
									{m.claims_claiming()}
								</>
							) : (
								m.claims_claimAmount({
									amount: claimType === "full"
										? formatPrice(claimableAmount, locale)
										: formatPrice(parseAmount(partialAmount) ?? 0, locale),
								})
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
