import { cn } from "@/lib/utils";
import * as m from "@/paraglide/messages";

interface Step {
	name: string;
	label: string;
}

interface StepIndicatorProps {
	steps: Step[];
	currentStep: number;
	onStepClick?: (step: number) => void;
}

export function StepIndicator({
	steps,
	currentStep,
}: StepIndicatorProps) {
	// Calculate progress percentage (0 = first step, 100 = last step completed)
	const progressPercent = (currentStep / (steps.length - 1)) * 100;

	return (
		<div className="mb-6">
			{/* Step text: "Step X of Y" */}
			<div className="mb-2 flex items-center justify-between">
				<span className="text-sm font-medium text-foreground">
					{m.wizard_step({
						current: String(currentStep + 1),
						total: String(steps.length),
					})}
				</span>
				<span className="text-sm text-muted-foreground">
					{steps[currentStep]?.label}
				</span>
			</div>

			{/* Visual progress bar */}
			<div
				role="progressbar"
				aria-valuenow={currentStep + 1}
				aria-valuemin={1}
				aria-valuemax={steps.length}
				aria-label={m.wizard_step({
					current: String(currentStep + 1),
					total: String(steps.length),
				})}
				className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20"
			>
				<div
					className={cn(
						"h-full rounded-full bg-primary transition-all duration-300 ease-out"
					)}
					style={{ width: `${progressPercent}%` }}
				/>
			</div>
		</div>
	);
}
