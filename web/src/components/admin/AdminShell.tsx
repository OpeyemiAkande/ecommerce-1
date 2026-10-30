"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect, useState} from "react";
import {UserButton, useUser} from "@clerk/nextjs";
import {IoBagHandle, IoMenu, IoStorefrontOutline} from "react-icons/io5";
import {initSentry} from "@/lib/admin/sentry";
import {AdminGate} from "./AdminGate";
import {ADMIN_NAV} from "./nav";

export function AdminShell({children}: {children: React.ReactNode}) {
  const pathname = usePathname() ?? "";
  const {user} = useUser();
  const [open, setOpen] = useState(false);
  const title = ADMIN_NAV.find((item) => pathname.startsWith(item.href))?.name ?? "Admin";

  useEffect(() => {
    initSentry();
  }, []);

  // Close the mobile drawer after navigating.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen">
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-background-light transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 p-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-on-primary">
            <IoBagHandle size={24} />
          </span>
          <span className="text-xl font-bold">Admin</span>
        </div>

        <nav aria-label="Admin" className="flex-1 space-y-1 px-3">
          {ADMIN_NAV.map(({name, href, icon: Icon}) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-primary text-on-primary"
                    : "text-text-secondary hover:bg-surface-light hover:text-text-primary"
                }`}
              >
                <Icon size={20} />
                {name}
              </Link>
            );
          })}

          <Link
            href="/"
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-text-secondary transition hover:bg-surface-light hover:text-text-primary"
          >
            <IoStorefrontOutline size={20} />
            View store
          </Link>
        </nav>

        <div className="flex items-center gap-3 border-t border-line p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user?.imageUrl}
            alt=""
            className="size-10 shrink-0 rounded-full bg-surface-light"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-xs text-text-tertiary">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-background/80 px-4 py-3 backdrop-blur-xl">
          <button
            type="button"
            className="icon-btn lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <IoMenu size={20} />
          </button>
          <h1 className="flex-1 text-xl font-bold">{title}</h1>
          <UserButton />
        </header>

        <main className="p-4 sm:p-6">
          <AdminGate>{children}</AdminGate>
        </main>
      </div>
    </div>
  );
}
