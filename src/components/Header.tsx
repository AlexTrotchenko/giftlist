import {
	SignedIn,
	SignedOut,
	SignInButton,
	UserButton,
} from "@clerk/astro/react";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
	return (
		<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="container mx-auto flex h-14 max-w-screen-xl items-center px-4">
				<a href="/" className="flex items-center gap-2 font-semibold">
					<Gift className="size-5" />
					<span>GiftList</span>
				</a>

				<nav className="ml-8 hidden gap-6 md:flex">
					<a
						href="/wishlist"
						className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						My Wishlist
					</a>
				</nav>

				<div className="ml-auto flex items-center gap-4">
					<SignedOut>
						<SignInButton mode="modal">
							<Button variant="default" size="sm">
								Sign In
							</Button>
						</SignInButton>
					</SignedOut>
					<SignedIn>
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
