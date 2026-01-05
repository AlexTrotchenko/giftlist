import { useEffect, useState } from "react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useInviteMember } from "@/hooks/useGroups";
import { createInvitationSchema } from "@/lib/validations/invitation";
import { resolveValidationMessage } from "@/i18n/zod-messages";
import { cn } from "@/lib/utils";
import * as m from "@/paraglide/messages";

interface InviteMemberDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	groupId: string;
}

interface FormData {
	email: string;
	role: "member" | "admin";
}

interface FormErrors {
	email?: string;
	role?: string;
}

export function InviteMemberDialog({
	open,
	onOpenChange,
	groupId,
}: InviteMemberDialogProps) {
	const inviteMember = useInviteMember(groupId);

	const [formData, setFormData] = useState<FormData>({
		email: "",
		role: "member",
	});
	const [errors, setErrors] = useState<FormErrors>({});

	useEffect(() => {
		if (open) {
			setFormData({ email: "", role: "member" });
			setErrors({});
		}
	}, [open]);

	const validateForm = (): boolean => {
		const newErrors: FormErrors = {};

		const result = createInvitationSchema.safeParse(formData);

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

		const sendInvitation = async () => {
			await inviteMember.mutateAsync(formData);
			onOpenChange(false);
		};

		toast.promise(sendInvitation(), {
			loading: m.common_sending(),
			success: m.invitations_sendSuccess(),
			error: (err) => err.message || m.errors_failedToSave(),
		});
	};

	const isLoading = inviteMember.isPending;
	const mutationError = inviteMember.error;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85dvh] overflow-y-auto overscroll-contain sm:max-w-[425px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>{m.invitations_inviteMember()}</DialogTitle>
						<DialogDescription>
							{m.invitations_inviteDescription()}
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="email">
								{m.invitations_emailAddress()} <span className="text-destructive">*</span>
							</Label>
							<Input
								id="email"
								type="email"
								value={formData.email}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, email: e.target.value }))
								}
								placeholder={m.invitations_emailPlaceholder()}
								aria-invalid={!!errors.email}
								className={cn(errors.email && "motion-safe:animate-shake")}
							/>
							{errors.email && (
								<p className="text-sm text-destructive">{resolveValidationMessage(errors.email)}</p>
							)}
						</div>

						<div className="grid gap-2">
							<Label htmlFor="role">{m.roles_role()}</Label>
							<Select
								value={formData.role}
								onValueChange={(value: "member" | "admin") =>
									setFormData((prev) => ({ ...prev, role: value }))
								}
							>
								<SelectTrigger id="role">
									<SelectValue placeholder={m.invitations_selectRole()} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="member">{m.roles_member()}</SelectItem>
									<SelectItem value="admin">{m.roles_admin()}</SelectItem>
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground">
								{m.roles_adminDescription()}
							</p>
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
							{isLoading ? m.common_sending() : m.invitations_sendInvitation()}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
