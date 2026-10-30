import type {Metadata} from "next";
import {ClerkProvider} from "@clerk/nextjs";
import {Header} from "@/components/Header";
import {Providers} from "@/components/Providers";
import {SITE_URL, STORE_NAME} from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {default: STORE_NAME, template: `%s | ${STORE_NAME}`},
  description: `Shop the latest products at ${STORE_NAME}.`
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
          <Providers>
            <Header />
            <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
