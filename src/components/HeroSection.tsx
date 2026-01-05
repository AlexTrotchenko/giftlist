import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as m from "@/paraglide/messages";
import { localizeHref } from "@/paraglide/runtime";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
	className?: string;
}

export function HeroSection({ className }: HeroSectionProps) {
	const handleLearnMore = () => {
		const element = document.getElementById("how-it-works");
		if (element) {
			element.scrollIntoView({ behavior: "smooth" });
		}
	};

	return (
		<section
			className={cn(
				"relative min-h-[80vh] overflow-hidden bg-background",
				className,
			)}
		>
			{/* Background pattern - subtle topography */}
			<div
				className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
				style={{
					backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath opacity='.5' d='M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9zm-1 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9z'/%3E%3Cpath d='M6 5V0H5v5H0v1h5v94h1V6h94V5H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
				}}
			/>

			{/* Content container */}
			<div className="container relative mx-auto flex min-h-[80vh] max-w-screen-xl flex-col items-center justify-center px-4 py-24 text-center">
				{/* Headline with staggered animation */}
				<h1 className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:ease-decelerate text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
					{m.landing_heroTitle()}
				</h1>

				{/* Subheadline with delayed animation */}
				<p className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:ease-decelerate motion-safe:delay-150 mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
					{m.landing_heroDescription()}
				</p>

				{/* CTA buttons with delayed animation */}
				<div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:ease-decelerate motion-safe:delay-300 mt-10 flex flex-col gap-4 sm:flex-row sm:gap-6">
					{/* Primary CTA */}
					<Button
						asChild
						size="lg"
						className="motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-standard motion-safe:hover:scale-105"
					>
						<a href={localizeHref("/wishlist")}>{m.landing_getStarted()}</a>
					</Button>

					{/* Secondary CTA */}
					<Button
						variant="outline"
						size="lg"
						onClick={handleLearnMore}
						className="group motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-standard motion-safe:hover:scale-105"
					>
						{m.landing_learnMore()}
						<ArrowDown className="ml-2 size-4 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-y-0.5" />
					</Button>
				</div>
			</div>
		</section>
	);
}
