import { m, AnimatePresence } from "@/components/MotionProvider";
import { MotionProvider } from "@/components/MotionProvider";
import * as msg from "@/paraglide/messages";
import {
	ListPlus,
	Users,
	CheckCircle,
	Heart,
	Lock,
	type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

// Animation variants for scroll-triggered sections
const sectionVariants = {
	hidden: { opacity: 0, y: 40 },
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: 0.5,
			ease: [0.0, 0.0, 0, 1.0], // ease-decelerate
		},
	},
};

const staggerContainer = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.1,
			delayChildren: 0.1,
		},
	},
};

const itemVariants = {
	hidden: { opacity: 0, y: 20 },
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: 0.4,
			ease: [0.0, 0.0, 0, 1.0],
		},
	},
};

// How It Works Step Card
function StepCard({
	step,
	icon: Icon,
	title,
	description,
}: {
	step: number;
	icon: LucideIcon;
	title: string;
	description: string;
}) {
	return (
		<m.div
			variants={itemVariants}
			className="flex flex-col items-center text-center"
		>
			<div className="relative mb-4">
				<div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
					<Icon className="size-8 text-primary" />
				</div>
				<span className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
					{step}
				</span>
			</div>
			<h3 className="mb-2 text-lg font-semibold">{title}</h3>
			<p className="text-muted-foreground">{description}</p>
		</m.div>
	);
}

// Feature Card
function FeatureCard({
	icon: Icon,
	title,
	description,
}: {
	icon: LucideIcon;
	title: string;
	description: string;
}) {
	return (
		<m.div variants={itemVariants}>
			<Card className="h-full motion-safe:transition-shadow motion-safe:hover:shadow-md">
				<CardContent className="flex flex-col items-center pt-6 text-center">
					<div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
						<Icon className="size-6 text-primary" />
					</div>
					<CardTitle className="mb-2">{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</CardContent>
			</Card>
		</m.div>
	);
}

// How It Works Section
function HowItWorksSection() {
	const steps = [
		{
			icon: ListPlus,
			title: msg.landing_step1Title(),
			description: msg.landing_step1Description(),
		},
		{
			icon: Users,
			title: msg.landing_step2Title(),
			description: msg.landing_step2Description(),
		},
		{
			icon: CheckCircle,
			title: msg.landing_step3Title(),
			description: msg.landing_step3Description(),
		},
	];

	return (
		<section className="bg-muted/30 py-16 sm:py-24">
			<div className="container mx-auto max-w-screen-xl px-4">
				<m.div
					variants={sectionVariants}
					initial="hidden"
					whileInView="visible"
					viewport={{ once: true, margin: "-100px" }}
					className="mb-12 text-center"
				>
					<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
						{msg.landing_howItWorksTitle()}
					</h2>
				</m.div>
				<m.div
					variants={staggerContainer}
					initial="hidden"
					whileInView="visible"
					viewport={{ once: true, margin: "-50px" }}
					className="grid gap-8 md:grid-cols-3"
				>
					{steps.map((step, index) => (
						<StepCard
							key={step.title}
							step={index + 1}
							icon={step.icon}
							title={step.title}
							description={step.description}
						/>
					))}
				</m.div>
			</div>
		</section>
	);
}

// Features Section
function FeaturesSection() {
	const features = [
		{
			icon: Heart,
			title: msg.landing_feature1Title(),
			description: msg.landing_feature1Description(),
		},
		{
			icon: Users,
			title: msg.landing_feature2Title(),
			description: msg.landing_feature2Description(),
		},
		{
			icon: Lock,
			title: msg.landing_feature3Title(),
			description: msg.landing_feature3Description(),
		},
	];

	return (
		<section className="py-16 sm:py-24">
			<div className="container mx-auto max-w-screen-xl px-4">
				<m.div
					variants={sectionVariants}
					initial="hidden"
					whileInView="visible"
					viewport={{ once: true, margin: "-100px" }}
					className="mb-12 text-center"
				>
					<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
						{msg.landing_featuresTitle()}
					</h2>
				</m.div>
				<m.div
					variants={staggerContainer}
					initial="hidden"
					whileInView="visible"
					viewport={{ once: true, margin: "-50px" }}
					className="grid gap-6 md:grid-cols-3"
				>
					{features.map((feature) => (
						<FeatureCard
							key={feature.title}
							icon={feature.icon}
							title={feature.title}
							description={feature.description}
						/>
					))}
				</m.div>
			</div>
		</section>
	);
}

// FAQ Section
function FAQSection() {
	const faqs = [
		{
			question: msg.landing_faq1Question(),
			answer: msg.landing_faq1Answer(),
		},
		{
			question: msg.landing_faq2Question(),
			answer: msg.landing_faq2Answer(),
		},
		{
			question: msg.landing_faq3Question(),
			answer: msg.landing_faq3Answer(),
		},
		{
			question: msg.landing_faq4Question(),
			answer: msg.landing_faq4Answer(),
		},
		{
			question: msg.landing_faq5Question(),
			answer: msg.landing_faq5Answer(),
		},
	];

	return (
		<section className="bg-muted/30 py-16 sm:py-24">
			<div className="container mx-auto max-w-screen-xl px-4">
				<m.div
					variants={sectionVariants}
					initial="hidden"
					whileInView="visible"
					viewport={{ once: true, margin: "-100px" }}
					className="mb-12 text-center"
				>
					<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
						{msg.landing_faqTitle()}
					</h2>
				</m.div>
				<m.div
					variants={sectionVariants}
					initial="hidden"
					whileInView="visible"
					viewport={{ once: true, margin: "-50px" }}
					className="mx-auto max-w-2xl"
				>
					<Accordion type="single" collapsible className="w-full">
						{faqs.map((faq, index) => (
							<AccordionItem key={index} value={`item-${index}`}>
								<AccordionTrigger className="text-left">
									{faq.question}
								</AccordionTrigger>
								<AccordionContent className="text-muted-foreground">
									{faq.answer}
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</m.div>
			</div>
		</section>
	);
}

// Final CTA Section
function FinalCTASection() {
	return (
		<section className="bg-primary py-16 text-primary-foreground sm:py-24">
			<div className="container mx-auto max-w-screen-xl px-4">
				<m.div
					variants={sectionVariants}
					initial="hidden"
					whileInView="visible"
					viewport={{ once: true, margin: "-100px" }}
					className="flex flex-col items-center text-center"
				>
					<h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
						{msg.landing_ctaTitle()}
					</h2>
					<p className="mb-8 max-w-lg text-lg text-primary-foreground/80">
						{msg.landing_ctaDescription()}
					</p>
					<Button
						size="lg"
						variant="secondary"
						className="text-base font-semibold"
						asChild
					>
						<a href="/wishlist">{msg.landing_getStarted()}</a>
					</Button>
				</m.div>
			</div>
		</section>
	);
}

// Footer Section
function Footer() {
	return (
		<footer className="border-t py-8">
			<div className="container mx-auto max-w-screen-xl px-4">
				<p className="text-center text-sm text-muted-foreground">
					{msg.landing_footerCopyright()}
				</p>
			</div>
		</footer>
	);
}

// Main LandingFeatures Component
export function LandingFeatures() {
	return (
		<MotionProvider>
			<HowItWorksSection />
			<FeaturesSection />
			<FAQSection />
			<FinalCTASection />
			<Footer />
		</MotionProvider>
	);
}
