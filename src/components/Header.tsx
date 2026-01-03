import {
	SignedIn,
	SignedOut,
	SignInButton,
	UserButton,
	SignOutButton,
} from "@clerk/astro/react";
import { Gift, Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { InvitationsDropdown } from "@/components/InvitationsDropdown";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import * as m from "@/paraglide/messages";
import { localizeHref, type Locale } from "@/paraglide/runtime";

interface HeaderProps {
	locale?: Locale;
	currentPath?: string;
}

export function Header({ locale, currentPath }: HeaderProps) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="container mx-auto flex h-14 max-w-screen-xl items-center px-4">
				<a href={localizeHref("/")} className="flex items-center gap-2 font-semibold">
					<Gift className="size-5" />
					<span>{m.common_appName()}</span>
				</a>

				{/* Desktop Navigation */}
				<nav className="ml-8 hidden gap-6 md:flex">
					<a
						href={localizeHref("/wishlist")}
						className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						{m.nav_myWishlist()}
					</a>
					<a
						href={localizeHref("/shared")}
						className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						{m.nav_sharedWithMe()}
					</a>
					<a
						href={localizeHref("/groups")}
						className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						{m.nav_groups()}
					</a>
				</nav>

				<div className="ml-auto flex items-center gap-2 sm:gap-4">
					{/* Desktop Language Switcher (hidden on mobile) */}
					<div className="hidden md:block">
						<LanguageSwitcher locale={locale ?? "en"} currentPath={currentPath} />
					</div>

					<ThemeSwitcher />

					<SignedOut>
						<SignInButton mode="modal">
							<Button variant="default" size="sm">
								{m.auth_signIn()}
							</Button>
						</SignInButton>
					</SignedOut>

					<SignedIn>
						<InvitationsDropdown locale={locale ?? "en"} />
						<NotificationBell locale={locale ?? "en"} />
						{/* Desktop User Avatar (hidden on mobile) */}
						<div className="hidden md:block">
							<UserButton
								appearance={{
									elements: {
										avatarBox: "size-8",
									},
								}}
							/>
						</div>
					</SignedIn>

					{/* Mobile Navigation - Hamburger Menu (at the end) */}
					<Sheet open={isOpen} onOpenChange={setIsOpen}>
						<SheetTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="md:hidden"
								aria-label="Open navigation menu"
							>
								<Menu className="size-5" />
							</Button>
						</SheetTrigger>
						<SheetContent side="right" className="w-[280px] sm:w-[320px]">
							<SheetHeader className="mb-8">
								<SheetTitle>{m.common_appName()}</SheetTitle>
							</SheetHeader>
							<nav className="flex flex-col">
								<div className="flex flex-col gap-1">
									<a
										href={localizeHref("/wishlist")}
										className="rounded-md px-3 py-3 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
										onClick={() => setIsOpen(false)}
									>
										{m.nav_myWishlist()}
									</a>
									<a
										href={localizeHref("/shared")}
										className="rounded-md px-3 py-3 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
										onClick={() => setIsOpen(false)}
									>
										{m.nav_sharedWithMe()}
									</a>
									<a
										href={localizeHref("/groups")}
										className="rounded-md px-3 py-3 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
										onClick={() => setIsOpen(false)}
									>
										{m.nav_groups()}
									</a>
								</div>
								<div className="my-6 border-t" />
								<div className="flex flex-col gap-6">
									<div className="flex items-center justify-between px-3">
										<span className="text-sm font-medium text-muted-foreground">Language</span>
										<LanguageSwitcher locale={locale ?? "en"} currentPath={currentPath} />
									</div>
									<SignedIn>
										<div className="px-3">
											<SignOutButton>
												<Button variant="outline" className="w-full" size="lg">
													{m.auth_signOut()}
												</Button>
											</SignOutButton>
										</div>
									</SignedIn>
								</div>
							</nav>
						</SheetContent>
					</Sheet>
				</div>
			</div>
		</header>
	);
}
