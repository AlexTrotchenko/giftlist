import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
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
import { StarRating } from "@/components/StarRating";
import { StepIndicator } from "@/components/StepIndicator";
import { useCreateItem, useUpdateItem } from "@/hooks/useItems";
import { useGroups } from "@/hooks/useGroups";
import {
	useItemRecipients,
	useSetItemRecipients,
} from "@/hooks/useItemRecipients";
import type { Item } from "@/lib/api";
import { createItemSchema, updateItemSchema } from "@/lib/validations/item";
import { resolveValidationMessage } from "@/i18n/zod-messages";
import { cn } from "@/lib/utils";
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
	priority: number | null;
	recipientGroupIds: string[];
}

interface FormErrors {
	name?: string;
	url?: string;
	price?: string;
	notes?: string;
	imageUrl?: string;
}

type WizardStep = 0 | 1 | 2;

const WIZARD_STEPS = [
	{ name: "basic-info", label: m.wizard_stepBasicInfo() },
	{ name: "details", label: m.wizard_stepDetails() },
	{ name: "recipients", label: m.wizard_stepRecipients() },
];

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

	const [currentStep, setCurrentStep] = useState<WizardStep>(0);
	const [formData, setFormData] = useState<FormData>({
		name: "",
		url: "",
		price: "",
		notes: "",
		imageUrl: null,
		priority: null,
		recipientGroupIds: [],
	});
	const [errors, setErrors] = useState<FormErrors>({});

	// Memoize recipient IDs to avoid infinite loops
	const existingRecipientIds = existingRecipients.map((r) => r.groupId).join(",");

	// Calculate total steps based on whether there are groups to share with
	const hasGroups = groups.length > 0;
	const totalSteps = hasGroups ? 3 : 2;
	const steps = hasGroups ? WIZARD_STEPS : WIZARD_STEPS.slice(0, 2);

	useEffect(() => {
		if (open) {
			// Reset to first step when dialog opens
			setCurrentStep(0);
			if (item) {
				setFormData({
					name: defaultValues?.name ?? item.name,
					url: defaultValues?.url ?? (item.url ?? ""),
					price: defaultValues?.price ?? formatPriceForInput(item.price),
					notes: defaultValues?.notes ?? (item.notes ?? ""),
					imageUrl: defaultValues?.imageUrl !== undefined ? defaultValues.imageUrl : (item.imageUrl ?? null),
					priority: item.priority ?? null,
					recipientGroupIds: existingRecipientIds ? existingRecipientIds.split(",") : [],
				});
			} else if (defaultValues) {
				setFormData({
					name: defaultValues.name ?? "",
					url: defaultValues.url ?? "",
					price: defaultValues.price ?? "",
					notes: defaultValues.notes ?? "",
					imageUrl: defaultValues.imageUrl ?? null,
					priority: null,
					recipientGroupIds: [],
				});
			} else {
				setFormData({
					name: "",
					url: "",
					price: "",
					notes: "",
					imageUrl: null,
					priority: null,
					recipientGroupIds: [],
				});
			}
			setErrors({});
		}
	}, [open, item, defaultValues, existingRecipientIds]);

	// Validate fields for a specific step
	const validateStep = useCallback((step: WizardStep): boolean => {
		const newErrors: FormErrors = {};

		const data = {
			name: formData.name,
			url: formData.url || null,
			price: parsePrice(formData.price),
			notes: formData.notes || null,
			imageUrl: formData.imageUrl,
			priority: formData.priority,
		};

		const schema = isEditing ? updateItemSchema : createItemSchema;
		const result = schema.safeParse(data);

		// Only check fields relevant to the current step
		const stepFields: Record<WizardStep, (keyof FormErrors)[]> = {
			0: ["name", "url", "price", "imageUrl"], // Basic info
			1: ["notes"], // Details (priority has no validation errors)
			2: [], // Recipients (no validation)
		};

		const fieldsToValidate = stepFields[step];

		if (!result.success) {
			for (const issue of result.error.issues) {
				const field = issue.path[0] as keyof FormErrors;
				if (field && fieldsToValidate.includes(field) && !newErrors[field]) {
					newErrors[field] = issue.message;
				}
			}
		}

		// Special price format validation for step 0
		if (step === 0 && formData.price && parsePrice(formData.price) === null) {
			newErrors.price = m.validation_invalidPriceFormat();
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	}, [formData, isEditing]);

	// Validate all steps before final submit
	const validateForm = useCallback((): boolean => {
		const newErrors: FormErrors = {};

		const data = {
			name: formData.name,
			url: formData.url || null,
			price: parsePrice(formData.price),
			notes: formData.notes || null,
			imageUrl: formData.imageUrl,
			priority: formData.priority,
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
	}, [formData, isEditing]);

	const handleNext = useCallback(() => {
		if (validateStep(currentStep)) {
			setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1) as WizardStep);
		}
	}, [currentStep, validateStep, totalSteps]);

	const handleBack = useCallback(() => {
		setCurrentStep((prev) => Math.max(prev - 1, 0) as WizardStep);
	}, []);

	const handleStepClick = useCallback((step: number) => {
		// Only allow clicking on completed steps
		if (step < currentStep) {
			setCurrentStep(step as WizardStep);
		}
	}, [currentStep]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) {
			// Find first step with errors and go there
			const data = {
				name: formData.name,
				url: formData.url || null,
				price: parsePrice(formData.price),
				notes: formData.notes || null,
				imageUrl: formData.imageUrl,
				priority: formData.priority,
			};
			const schema = isEditing ? updateItemSchema : createItemSchema;
			const result = schema.safeParse(data);

			if (!result.success) {
				const firstErrorField = result.error.issues[0]?.path[0] as string;
				if (["name", "url", "price", "imageUrl"].includes(firstErrorField)) {
					setCurrentStep(0);
				} else if (["notes"].includes(firstErrorField)) {
					setCurrentStep(1);
				}
			}
			return;
		}

		const data = {
			name: formData.name,
			url: formData.url || null,
			price: parsePrice(formData.price),
			notes: formData.notes || null,
			imageUrl: formData.imageUrl,
			priority: formData.priority,
		};

		const saveOperation = async () => {
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
		};

		toast.promise(saveOperation(), {
			loading: m.item_savingItem(),
			success: isEditing ? m.item_updateSuccess() : m.item_addSuccess(),
			error: (err) => err.message || m.errors_failedToSave(),
		});
	};

	const isLoading =
		createItem.isPending ||
		updateItem.isPending ||
		setItemRecipients.isPending;
	const mutationError =
		createItem.error || updateItem.error || setItemRecipients.error;

	const locale = getLocale();
	const currency = getCurrency(locale);

	const isLastStep = currentStep === totalSteps - 1;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85dvh] overflow-y-auto overscroll-contain sm:max-w-[425px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>{isEditing ? m.item_editItem() : m.item_addItem()}</DialogTitle>
						<DialogDescription>
							{isEditing
								? m.item_editDescription()
								: m.item_addDescription()}
						</DialogDescription>
					</DialogHeader>

					<div className="py-4">
						<StepIndicator
							steps={steps}
							currentStep={currentStep}
							onStepClick={handleStepClick}
						/>

						{/* Step 1: Basic Info */}
						{currentStep === 0 && (
							<div className="grid gap-4">
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
										className={cn(errors.name && "motion-safe:animate-shake")}
										autoFocus
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
										className={cn(errors.url && "motion-safe:animate-shake")}
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
										className={cn(errors.price && "motion-safe:animate-shake")}
									/>
									{errors.price && (
										<p className="text-sm text-destructive">{resolveValidationMessage(errors.price)}</p>
									)}
								</div>
							</div>
						)}

						{/* Step 2: Details */}
						{currentStep === 1 && (
							<div className="grid gap-4">
								<div className="grid gap-2">
									<Label>{m.priority_label()}</Label>
									<StarRating
										value={formData.priority}
										onChange={(priority) =>
											setFormData((prev) => ({ ...prev, priority }))
										}
										disabled={isLoading}
									/>
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
										rows={4}
										aria-invalid={!!errors.notes}
										className={cn(errors.notes && "motion-safe:animate-shake")}
									/>
									{errors.notes && (
										<p className="text-sm text-destructive">{resolveValidationMessage(errors.notes)}</p>
									)}
								</div>
							</div>
						)}

						{/* Step 3: Recipients (only shown if there are groups) */}
						{currentStep === 2 && hasGroups && (
							<div className="grid gap-4">
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
							</div>
						)}

						{mutationError && (
							<p className="mt-4 text-sm text-destructive">
								{mutationError.message}
							</p>
						)}
					</div>

					<DialogFooter className="flex-row justify-between gap-2">
						<div className="flex gap-2">
							{currentStep > 0 && (
								<Button
									type="button"
									variant="outline"
									onClick={handleBack}
									disabled={isLoading}
								>
									{m.wizard_previous()}
								</Button>
							)}
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								disabled={isLoading}
							>
								{m.common_cancel()}
							</Button>
						</div>
						{isLastStep ? (
							<Button type="submit" disabled={isLoading}>
								{isLoading
									? m.common_saving()
									: isEditing
										? m.common_saveChanges()
										: m.item_addItem()}
							</Button>
						) : (
							<Button type="button" onClick={handleNext} disabled={isLoading}>
								{m.wizard_next()}
							</Button>
						)}
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
