import { Progress } from "@/components/ui/progress";
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
	// Calculate progress percentage (current step / total steps)
	// Add 1 to currentStep since it's 0-indexed, showing partial progress for current step
	const progressValue = ((currentStep + 1) / steps.length) * 100;
	const currentLabel = steps[currentStep]?.label ?? "";

	return (
		<div className="mb-6 space-y-2">
			<div className="flex items-center justify-between text-sm">
				<span className="font-medium text-foreground">
					{currentLabel}
				</span>
				<span className="text-muted-foreground">
					{m.wizard_step({
						current: String(currentStep + 1),
						total: String(steps.length),
					})}
				</span>
			</div>
			<Progress
				value={progressValue}
				aria-label={m.wizard_step({
					current: String(currentStep + 1),
					total: String(steps.length),
				})}
			/>
		</div>
	);
}
