import { Pencil, Trash2, Users } from "lucide-react";
import type { GroupResponse } from "@/db/types";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface GroupCardProps {
	group: GroupResponse;
	onEdit: (group: GroupResponse) => void;
	onDelete: (group: GroupResponse) => void;
}

export function GroupCard({ group, onEdit, onDelete }: GroupCardProps) {
	return (
		<Card className="group transition-shadow hover:shadow-md">
			<a href={`/groups/${group.id}`} className="block">
				<CardHeader>
					<div className="flex items-start justify-between gap-2">
						<div className="flex items-center gap-2">
							<div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
								<Users className="size-5 text-primary" />
							</div>
							<CardTitle className="text-base">{group.name}</CardTitle>
						</div>
					</div>
					{group.description && (
						<CardDescription className="line-clamp-2">
							{group.description}
						</CardDescription>
					)}
				</CardHeader>

				<CardContent className="py-0">
					<p className="text-xs text-muted-foreground">
						Created{" "}
						{group.createdAt
							? new Date(group.createdAt).toLocaleDateString()
							: "recently"}
					</p>
				</CardContent>
			</a>

			<CardFooter className="justify-end gap-1 pt-4">
				<div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						onClick={(e) => {
							e.preventDefault();
							onEdit(group);
						}}
						aria-label={`Edit ${group.name}`}
					>
						<Pencil className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
						onClick={(e) => {
							e.preventDefault();
							onDelete(group);
						}}
						aria-label={`Delete ${group.name}`}
					>
						<Trash2 className="size-4" />
					</Button>
				</div>
			</CardFooter>
		</Card>
	);
}
