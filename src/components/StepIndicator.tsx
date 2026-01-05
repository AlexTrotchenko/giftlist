import { Check } from "lucide-react";
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
	onStepClick,
}: StepIndicatorProps) {
	return (
		<div className="mb-6">
			{/* Progress bar */}
			<div
				role="progressbar"
				aria-valuenow={currentStep + 1}
				aria-valuemin={1}
				aria-valuemax={steps.length}
				aria-label={m.wizard_step({
					current: String(currentStep + 1),
					total: String(steps.length),
				})}
				className="sr-only"
			>
				{m.wizard_step({
					current: String(currentStep + 1),
					total: String(steps.length),
				})}
			</div>

			{/* Visual step indicators */}
			<nav aria-label="Progress">
				<ol className="flex items-center justify-between">
					{steps.map((step, index) => {
						const isCompleted = index < currentStep;
						const isCurrent = index === currentStep;
						const isClickable = onStepClick && index < currentStep;

						return (
							<li key={step.name} className="flex flex-1 items-center">
								<button
									type="button"
									onClick={() => isClickable && onStepClick(index)}
									disabled={!isClickable}
									className={cn(
										"group flex flex-col items-center gap-1",
										isClickable && "cursor-pointer",
										!isClickable && "cursor-default"
									)}
									aria-label={m.wizard_stepLabel({
										number: String(index + 1),
										name: step.label,
									})}
									aria-current={isCurrent ? "step" : undefined}
								>
									{/* Step circle */}
									<span
										className={cn(
											"flex size-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
											isCompleted &&
												"border-primary bg-primary text-primary-foreground",
											isCurrent &&
												"border-primary bg-background text-primary",
											!isCompleted &&
												!isCurrent &&
												"border-muted-foreground/30 bg-background text-muted-foreground",
											isClickable &&
												"group-hover:border-primary/80 group-hover:bg-primary/10"
										)}
									>
										{isCompleted ? (
											<Check className="size-4" />
										) : (
											<span>{index + 1}</span>
										)}
									</span>

									{/* Step label - hide on mobile for space */}
									<span
										className={cn(
											"hidden text-xs sm:block",
											isCurrent && "font-medium text-foreground",
											!isCurrent && "text-muted-foreground"
										)}
									>
										{step.label}
									</span>
								</button>

								{/* Connector line */}
								{index < steps.length - 1 && (
									<div
										className={cn(
											"mx-2 h-0.5 flex-1 transition-colors",
											index < currentStep ? "bg-primary" : "bg-muted"
										)}
										aria-hidden="true"
									/>
								)}
							</li>
						);
					})}
				</ol>
			</nav>
		</div>
	);
}
