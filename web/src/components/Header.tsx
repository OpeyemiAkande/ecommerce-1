"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {SignedIn, SignedOut, SignInButton, UserButton} from "@clerk/nextjs";
import {
  IoBagHandle,
  IoCart,
  IoGrid,
  IoLocation,
  IoReceipt
} from "react-icons/io5";
import type {IconType} from "react-icons";
import {useCart} from "@/hooks/useCart";
import {STORE_NAME} from "@/lib/config";

function NavLink({
  href,
  label,
  icon: Icon,
  badge
}: {
  href: string;
  label: string;
  icon: IconType;
  badge?: number;
}) {
  const pathname = usePathname();
  const active = pathname?.startsWith(href) ?? false;

  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition ${
        active
          ? "bg-primary/15 text-primary-text"
          : "text-text-secondary hover:bg-surface-light hover:text-text-primary"
      }`}
    >
      <Icon size={20} />
      <span className="hidden md:inline">{label}</span>
      {badge ? (
        <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-5 text-on-primary">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

export function Header() {
  const {itemCount} = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold tracking-tight"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-on-primary">
            <IoBagHandle size={20} />
          </span>
          <span className="hidden sm:inline">{STORE_NAME}</span>
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink href="/products" label="Shop" icon={IoGrid} />
          <SignedIn>
            <NavLink href="/account/orders" label="Orders" icon={IoReceipt} />
            <NavLink
              href="/account/addresses"
              label="Addresses"
              icon={IoLocation}
            />
          </SignedIn>
          <NavLink href="/cart" label="Cart" icon={IoCart} badge={itemCount} />

          <div className="ml-2 flex items-center">
            <SignedOut>
              <SignInButton mode="redirect">
                <button className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-on-primary transition hover:bg-primary-light">
                  Sign in
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </nav>
      </div>
    </header>
  );
}
