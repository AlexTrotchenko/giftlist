import type { ReactNode } from "react"
import { X } from "lucide-react"
import {
	Select,
	SelectContent,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface FilterSelectProps {
	value: string
	defaultValue?: string
	onValueChange: (value: string) => void
	icon: ReactNode
	placeholder: string
	isActive: boolean
	onClear: () => void
	children: ReactNode
	className?: string
	clearLabel?: string
}

export function FilterSelect({
	value,
	defaultValue = "all",
	onValueChange,
	icon,
	placeholder,
	isActive,
	onClear,
	children,
	className,
	clearLabel = "Clear filter",
}: FilterSelectProps) {
	return (
		<div className={cn("flex items-center", className)}>
			<Select value={value} onValueChange={onValueChange}>
				<SelectTrigger className={cn("w-full sm:w-[150px]", isActive && "rounded-r-none border-r-0")}>
					{icon}
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>{children}</SelectContent>
			</Select>
			{isActive && (
				<button
					type="button"
					onClick={onClear}
					className="flex h-11 shrink-0 items-center justify-center rounded-r-md border border-l-0 border-input bg-transparent px-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9"
					aria-label={clearLabel}
				>
					<X className="size-4" />
				</button>
			)}
		</div>
	)
}
