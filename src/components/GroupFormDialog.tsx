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
import { useCreateGroup, useUpdateGroup } from "@/hooks/useGroups";
import type { GroupResponse } from "@/db/types";
import { createGroupSchema, updateGroupSchema } from "@/lib/validations/group";
import { resolveValidationMessage } from "@/i18n/zod-messages";
import * as m from "@/paraglide/messages";

interface GroupFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	group?: GroupResponse | null;
}

interface FormData {
	name: string;
	description: string;
}

interface FormErrors {
	name?: string;
	description?: string;
}

export function GroupFormDialog({
	open,
	onOpenChange,
	group,
}: GroupFormDialogProps) {
	const isEditing = !!group;
	const createGroup = useCreateGroup();
	const updateGroup = useUpdateGroup();

	const [formData, setFormData] = useState<FormData>({
		name: "",
		description: "",
	});
	const [errors, setErrors] = useState<FormErrors>({});

	useEffect(() => {
		if (open) {
			if (group) {
				setFormData({
					name: group.name,
					description: group.description ?? "",
				});
			} else {
				setFormData({ name: "", description: "" });
			}
			setErrors({});
		}
	}, [open, group]);

	const validateForm = (): boolean => {
		const newErrors: FormErrors = {};

		const data = {
			name: formData.name,
			description: formData.description || null,
		};

		const schema = isEditing ? updateGroupSchema : createGroupSchema;
		const result = schema.safeParse(data);

		if (!result.success) {
			for (const issue of result.error.issues) {
				const field = issue.path[0] as keyof FormErrors;
				if (field && !newErrors[field]) {
					newErrors[field] = issue.message;
				}
			}
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) return;

		const data = {
			name: formData.name,
			description: formData.description || null,
		};

		try {
			if (isEditing && group) {
				await updateGroup.mutateAsync({ id: group.id, data });
			} else {
				await createGroup.mutateAsync(data);
			}
			onOpenChange(false);
		} catch {
			// Error is handled by mutation state
		}
	};

	const isLoading = createGroup.isPending || updateGroup.isPending;
	const mutationError = createGroup.error || updateGroup.error;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>{isEditing ? m.groups_editGroup() : m.groups_createGroup()}</DialogTitle>
						<DialogDescription>
							{isEditing
								? m.groups_editDescription()
								: m.groups_createDescription()}
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="name">
								{m.groups_name()} <span className="text-destructive">*</span>
							</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, name: e.target.value }))
								}
								placeholder={m.groups_namePlaceholder()}
								aria-invalid={!!errors.name}
							/>
							{errors.name && (
								<p className="text-sm text-destructive">{resolveValidationMessage(errors.name)}</p>
							)}
						</div>

						<div className="grid gap-2">
							<Label htmlFor="description">{m.groups_description()}</Label>
							<Textarea
								id="description"
								value={formData.description}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										description: e.target.value,
									}))
								}
								placeholder={m.groups_descriptionPlaceholder()}
								rows={3}
								aria-invalid={!!errors.description}
							/>
							{errors.description && (
								<p className="text-sm text-destructive">{resolveValidationMessage(errors.description)}</p>
							)}
						</div>

						{mutationError && (
							<p className="text-sm text-destructive">{mutationError.message}</p>
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
									: m.groups_createGroup()}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
