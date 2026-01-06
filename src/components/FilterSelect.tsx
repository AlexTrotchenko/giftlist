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
		<div className="relative">
			<Select value={value} onValueChange={onValueChange}>
				<SelectTrigger className={cn("w-full sm:w-[150px]", isActive && "pr-8", className)}>
					{icon}
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>{children}</SelectContent>
			</Select>
			{isActive && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation()
						onClear()
					}}
					className="absolute right-6 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					aria-label={clearLabel}
				>
					<X className="size-3" />
				</button>
			)}
		</div>
	)
}
