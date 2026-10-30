"use client";

import Link from "next/link";
import {SignedIn, SignedOut, SignInButton, UserButton} from "@clerk/nextjs";
import {useCart} from "@/hooks/useCart";
import {STORE_NAME} from "@/lib/config";

export function Header() {
  const {itemCount} = useCart();

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-semibold">
          {STORE_NAME}
        </Link>

        <nav className="flex items-center gap-5 text-sm">
          <Link href="/products" className="hover:underline">
            Shop
          </Link>

          <SignedIn>
            <Link href="/account/orders" className="hover:underline">
              Orders
            </Link>
            <Link href="/account/addresses" className="hover:underline">
              Addresses
            </Link>
          </SignedIn>

          <Link href="/cart" className="relative hover:underline">
            Cart
            {itemCount > 0 && (
              <span className="ml-1 rounded-full bg-neutral-900 px-2 py-0.5 text-xs text-white">
                {itemCount}
              </span>
            )}
          </Link>

          <SignedOut>
            <SignInButton mode="redirect">
              <button className="rounded bg-neutral-900 px-3 py-1.5 text-white">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </nav>
      </div>
    </header>
  );
}
