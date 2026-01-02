import {
	SignedIn,
	SignedOut,
	SignInButton,
	UserButton,
} from "@clerk/astro/react";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
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
	return (
		<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="container mx-auto flex h-14 max-w-screen-xl items-center px-4">
				<a href={localizeHref("/")} className="flex items-center gap-2 font-semibold">
					<Gift className="size-5" />
					<span>{m.common_appName()}</span>
				</a>

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

				<div className="ml-auto flex items-center gap-4">
					<LanguageSwitcher locale={locale ?? "en"} currentPath={currentPath} />
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
						<UserButton
							appearance={{
								elements: {
									avatarBox: "size-8",
								},
							}}
						/>
					</SignedIn>
				</div>
			</div>
		</header>
	);
}
