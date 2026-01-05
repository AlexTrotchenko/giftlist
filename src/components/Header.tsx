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

	// Helper to check if a path is currently active
	const isActive = (href: string) => {
		if (!currentPath) return false;
		const localizedHref = localizeHref(href);
		// Exact match for home, prefix match for other routes
		if (href === "/") return currentPath === localizedHref;
		return currentPath.startsWith(localizedHref);
	};

	return (
		<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="container mx-auto flex h-14 max-w-screen-xl items-center px-4">
				<a href={localizeHref("/")} className="flex items-center gap-2 font-semibold">
					<Gift className="size-5" />
					<span>{m.common_appName()}</span>
				</a>

				{/* Desktop Navigation */}
				<nav className="ml-8 hidden gap-6 md:flex" aria-label="Main navigation">
					<a
						href={localizeHref("/wishlist")}
						className={`text-sm font-medium transition-colors hover:text-foreground ${
							isActive("/wishlist") ? "text-foreground" : "text-muted-foreground"
						}`}
						aria-current={isActive("/wishlist") ? "page" : undefined}
					>
						{m.nav_myWishlist()}
					</a>
					<a
						href={localizeHref("/shared")}
						className={`text-sm font-medium transition-colors hover:text-foreground ${
							isActive("/shared") ? "text-foreground" : "text-muted-foreground"
						}`}
						aria-current={isActive("/shared") ? "page" : undefined}
					>
						{m.nav_sharedWithMe()}
					</a>
					<a
						href={localizeHref("/groups")}
						className={`text-sm font-medium transition-colors hover:text-foreground ${
							isActive("/groups") ? "text-foreground" : "text-muted-foreground"
						}`}
						aria-current={isActive("/groups") ? "page" : undefined}
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
								className="size-11 md:hidden"
								aria-label="Open navigation menu"
								aria-expanded={isOpen}
								aria-controls="mobile-nav"
							>
								<Menu className="size-5" />
							</Button>
						</SheetTrigger>
						<SheetContent side="right" className="w-[280px] sm:w-[320px]">
							<SheetHeader className="mb-8">
								<SheetTitle>{m.common_appName()}</SheetTitle>
							</SheetHeader>
							<nav id="mobile-nav" className="flex flex-col" aria-label="Mobile navigation">
								<SignedIn>
									<div className="mb-4 flex items-center gap-3 px-3">
										<UserButton
											appearance={{
												elements: {
													avatarBox: "size-10",
												},
											}}
										/>
										<span className="text-sm text-muted-foreground">
											{m.nav_yourAccount()}
										</span>
									</div>
									<div className="mb-4 border-t" />
								</SignedIn>
								<div className="flex flex-col gap-1">
									<a
										href={localizeHref("/wishlist")}
										className={`min-h-11 rounded-md px-3 py-3 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
											isActive("/wishlist") ? "bg-accent text-accent-foreground" : ""
										}`}
										onClick={() => setIsOpen(false)}
										aria-current={isActive("/wishlist") ? "page" : undefined}
									>
										{m.nav_myWishlist()}
									</a>
									<a
										href={localizeHref("/shared")}
										className={`min-h-11 rounded-md px-3 py-3 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
											isActive("/shared") ? "bg-accent text-accent-foreground" : ""
										}`}
										onClick={() => setIsOpen(false)}
										aria-current={isActive("/shared") ? "page" : undefined}
									>
										{m.nav_sharedWithMe()}
									</a>
									<a
										href={localizeHref("/groups")}
										className={`min-h-11 rounded-md px-3 py-3 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
											isActive("/groups") ? "bg-accent text-accent-foreground" : ""
										}`}
										onClick={() => setIsOpen(false)}
										aria-current={isActive("/groups") ? "page" : undefined}
									>
										{m.nav_groups()}
									</a>
								</div>
								<div className="my-6 border-t" />
								<div className="flex flex-col gap-6">
									<div className="flex min-h-11 items-center justify-between px-3">
										<span className="text-sm font-medium text-muted-foreground">
											{m.nav_language()}
										</span>
										<LanguageSwitcher locale={locale ?? "en"} currentPath={currentPath} />
									</div>
									<SignedIn>
										<div className="px-3">
											<SignOutButton>
												<Button variant="outline" className="min-h-11 w-full" size="lg">
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
