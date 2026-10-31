import {Header} from "@/components/Header";

// Header and page wrapper for storefront pages. The admin has its own chrome.
export function StoreChrome({children}: {children: React.ReactNode}) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </>
  );
}
