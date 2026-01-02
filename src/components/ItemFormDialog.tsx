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
import { resolveValidationMessage } from "@/i18n/zod-messages";
import * as m from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { getCurrency } from "@/i18n/formatting";

interface DefaultValues {
	name?: string;
	url?: string;
	price?: string;
	notes?: string;
	imageUrl?: string | null;
}

interface ItemFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	item?: Item | null;
	defaultValues?: DefaultValues;
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
	defaultValues,
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
					name: defaultValues?.name ?? item.name,
					url: defaultValues?.url ?? (item.url ?? ""),
					price: defaultValues?.price ?? formatPriceForInput(item.price),
					notes: defaultValues?.notes ?? (item.notes ?? ""),
					imageUrl: defaultValues?.imageUrl !== undefined ? defaultValues.imageUrl : (item.imageUrl ?? null),
					recipientGroupIds: existingRecipientIds ? existingRecipientIds.split(",") : [],
				});
			} else if (defaultValues) {
				setFormData({
					name: defaultValues.name ?? "",
					url: defaultValues.url ?? "",
					price: defaultValues.price ?? "",
					notes: defaultValues.notes ?? "",
					imageUrl: defaultValues.imageUrl ?? null,
					recipientGroupIds: [],
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
	}, [open, item, defaultValues, existingRecipientIds]);

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
			newErrors.price = m.validation_invalidPriceFormat();
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

	const locale = getLocale();
	const currency = getCurrency(locale);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>{isEditing ? m.item_editItem() : m.item_addItem()}</DialogTitle>
						<DialogDescription>
							{isEditing
								? m.item_editDescription()
								: m.item_addDescription()}
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="name">
								{m.item_name()} <span className="text-destructive">*</span>
							</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, name: e.target.value }))
								}
								placeholder={m.item_namePlaceholder()}
								aria-invalid={!!errors.name}
							/>
							{errors.name && (
								<p className="text-sm text-destructive">{resolveValidationMessage(errors.name)}</p>
							)}
						</div>

						<div className="grid gap-2">
							<Label>{m.item_image()}</Label>
							<ImageUpload
								value={formData.imageUrl}
								onChange={(url) =>
									setFormData((prev) => ({ ...prev, imageUrl: url }))
								}
								disabled={isLoading}
							/>
							{errors.imageUrl && (
								<p className="text-sm text-destructive">{resolveValidationMessage(errors.imageUrl)}</p>
							)}
						</div>

						<div className="grid gap-2">
							<Label htmlFor="url">{m.item_url()}</Label>
							<Input
								id="url"
								type="url"
								value={formData.url}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, url: e.target.value }))
								}
								placeholder={m.item_urlPlaceholder()}
								aria-invalid={!!errors.url}
							/>
							{errors.url && (
								<p className="text-sm text-destructive">{resolveValidationMessage(errors.url)}</p>
							)}
						</div>

						<div className="grid gap-2">
							<Label htmlFor="price">{m.item_priceLabel({ currency })}</Label>
							<Input
								id="price"
								type="number"
								step="0.01"
								min="0"
								value={formData.price}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, price: e.target.value }))
								}
								placeholder={m.item_pricePlaceholder()}
								aria-invalid={!!errors.price}
							/>
							{errors.price && (
								<p className="text-sm text-destructive">{resolveValidationMessage(errors.price)}</p>
							)}
						</div>

						<div className="grid gap-2">
							<Label htmlFor="notes">{m.item_notes()}</Label>
							<Textarea
								id="notes"
								value={formData.notes}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, notes: e.target.value }))
								}
								placeholder={m.item_notesPlaceholder()}
								rows={3}
								aria-invalid={!!errors.notes}
							/>
							{errors.notes && (
								<p className="text-sm text-destructive">{resolveValidationMessage(errors.notes)}</p>
							)}
						</div>

						{groups.length > 0 && (
							<div className="grid gap-2">
								<Label>{m.item_shareWith()}</Label>
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
							{m.common_cancel()}
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading
								? m.common_saving()
								: isEditing
									? m.common_saveChanges()
									: m.item_addItem()}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
