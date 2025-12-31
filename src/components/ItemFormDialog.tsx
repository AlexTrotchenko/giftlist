import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ImageUpload";
import { RecipientsPicker } from "@/components/RecipientsPicker";
import { useCreateItem, useUpdateItem } from "@/hooks/useItems";
import { useGroups } from "@/hooks/useGroups";
import {
	useItemRecipients,
	useSetItemRecipients,
} from "@/hooks/useItemRecipients";
import type { Item } from "@/lib/api";
import { createItemSchema, updateItemSchema } from "@/lib/validations/item";

interface ItemFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	item?: Item | null;
}

interface FormData {
	name: string;
	url: string;
	price: string;
	notes: string;
	imageUrl: string | null;
	recipientGroupIds: string[];
}

interface FormErrors {
	name?: string;
	url?: string;
	price?: string;
	notes?: string;
	imageUrl?: string;
}

function parsePrice(value: string): number | null {
	if (!value.trim()) return null;
	const parsed = Number.parseFloat(value);
	if (Number.isNaN(parsed)) return null;
	return Math.round(parsed * 100);
}

function formatPriceForInput(cents: number | null): string {
	if (cents === null) return "";
	return (cents / 100).toFixed(2);
}

export function ItemFormDialog({
	open,
	onOpenChange,
	item,
}: ItemFormDialogProps) {
	const isEditing = !!item;
	const createItem = useCreateItem();
	const updateItem = useUpdateItem();
	const { data: groups = [] } = useGroups();
	const { data: existingRecipients = [] } = useItemRecipients(item?.id);
	const setItemRecipients = useSetItemRecipients();

	const [formData, setFormData] = useState<FormData>({
		name: "",
		url: "",
		price: "",
		notes: "",
		imageUrl: null,
		recipientGroupIds: [],
	});
	const [errors, setErrors] = useState<FormErrors>({});

	// Memoize recipient IDs to avoid infinite loops
	const existingRecipientIds = existingRecipients.map((r) => r.groupId).join(",");

	useEffect(() => {
		if (open) {
			if (item) {
				setFormData({
					name: item.name,
					url: item.url ?? "",
					price: formatPriceForInput(item.price),
					notes: item.notes ?? "",
					imageUrl: item.imageUrl ?? null,
					recipientGroupIds: existingRecipientIds ? existingRecipientIds.split(",") : [],
				});
			} else {
				setFormData({
					name: "",
					url: "",
					price: "",
					notes: "",
					imageUrl: null,
					recipientGroupIds: [],
				});
			}
			setErrors({});
		}
	}, [open, item, existingRecipientIds]);

	const validateForm = (): boolean => {
		const newErrors: FormErrors = {};

		const data = {
			name: formData.name,
			url: formData.url || null,
			price: parsePrice(formData.price),
			notes: formData.notes || null,
			imageUrl: formData.imageUrl,
		};

		const schema = isEditing ? updateItemSchema : createItemSchema;
		const result = schema.safeParse(data);

		if (!result.success) {
			for (const issue of result.error.issues) {
				const field = issue.path[0] as keyof FormErrors;
				if (field && !newErrors[field]) {
					newErrors[field] = issue.message;
				}
			}
		}

		if (formData.price && parsePrice(formData.price) === null) {
			newErrors.price = "Invalid price format";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) return;

		const data = {
			name: formData.name,
			url: formData.url || null,
			price: parsePrice(formData.price),
			notes: formData.notes || null,
			imageUrl: formData.imageUrl,
		};

		try {
			let itemId: string;

			if (isEditing && item) {
				await updateItem.mutateAsync({ id: item.id, data });
				itemId = item.id;
			} else {
				const newItem = await createItem.mutateAsync(data);
				itemId = newItem.id;
			}

			// Update recipients if there are groups to manage
			const currentGroupIds = existingRecipients.map((r) => r.groupId);
			const hasChanges =
				formData.recipientGroupIds.length !== currentGroupIds.length ||
				formData.recipientGroupIds.some((id) => !currentGroupIds.includes(id));

			if (hasChanges && (formData.recipientGroupIds.length > 0 || currentGroupIds.length > 0)) {
				await setItemRecipients.mutateAsync({
					itemId,
					groupIds: formData.recipientGroupIds,
					currentGroupIds,
				});
			}

			onOpenChange(false);
		} catch {
			// Error is handled by mutation state
		}
	};

	const isLoading =
		createItem.isPending ||
		updateItem.isPending ||
		setItemRecipients.isPending;
	const mutationError =
		createItem.error || updateItem.error || setItemRecipients.error;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>{isEditing ? "Edit Item" : "Add Item"}</DialogTitle>
						<DialogDescription>
							{isEditing
								? "Update the details of your wishlist item."
								: "Add a new item to your wishlist."}
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="name">
								Name <span className="text-destructive">*</span>
							</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, name: e.target.value }))
								}
								placeholder="Enter item name"
								aria-invalid={!!errors.name}
							/>
							{errors.name && (
								<p className="text-sm text-destructive">{errors.name}</p>
							)}
						</div>

						<div className="grid gap-2">
							<Label>Image</Label>
							<ImageUpload
								value={formData.imageUrl}
								onChange={(url) =>
									setFormData((prev) => ({ ...prev, imageUrl: url }))
								}
								disabled={isLoading}
							/>
							{errors.imageUrl && (
								<p className="text-sm text-destructive">{errors.imageUrl}</p>
							)}
						</div>

						<div className="grid gap-2">
							<Label htmlFor="url">URL</Label>
							<Input
								id="url"
								type="url"
								value={formData.url}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, url: e.target.value }))
								}
								placeholder="https://example.com/product"
								aria-invalid={!!errors.url}
							/>
							{errors.url && (
								<p className="text-sm text-destructive">{errors.url}</p>
							)}
						</div>

						<div className="grid gap-2">
							<Label htmlFor="price">Price ($)</Label>
							<Input
								id="price"
								type="number"
								step="0.01"
								min="0"
								value={formData.price}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, price: e.target.value }))
								}
								placeholder="0.00"
								aria-invalid={!!errors.price}
							/>
							{errors.price && (
								<p className="text-sm text-destructive">{errors.price}</p>
							)}
						</div>

						<div className="grid gap-2">
							<Label htmlFor="notes">Notes</Label>
							<Textarea
								id="notes"
								value={formData.notes}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, notes: e.target.value }))
								}
								placeholder="Any additional notes..."
								rows={3}
								aria-invalid={!!errors.notes}
							/>
							{errors.notes && (
								<p className="text-sm text-destructive">{errors.notes}</p>
							)}
						</div>

						{groups.length > 0 && (
							<div className="grid gap-2">
								<Label>Share with</Label>
								<RecipientsPicker
									groups={groups}
									selectedGroupIds={formData.recipientGroupIds}
									onSelectedChange={(groupIds) =>
										setFormData((prev) => ({
											...prev,
											recipientGroupIds: groupIds,
										}))
									}
									disabled={isLoading}
								/>
							</div>
						)}

						{mutationError && (
							<p className="text-sm text-destructive">
								{mutationError.message}
							</p>
						)}
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading
								? "Saving..."
								: isEditing
									? "Save Changes"
									: "Add Item"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
