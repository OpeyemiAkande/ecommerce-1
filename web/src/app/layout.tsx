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

// Clerk reads our CSS variables, so its UI follows the light/dark palette.
const clerkAppearance = {
  variables: {
    colorPrimary: "var(--primary)",
    colorPrimaryForeground: "var(--on-primary)",
    colorBackground: "var(--surface)",
    colorForeground: "var(--text-primary)",
    colorMutedForeground: "var(--text-secondary)",
    colorMuted: "var(--background-lighter)",
    colorInput: "var(--background-lighter)",
    colorInputForeground: "var(--text-primary)",
    colorNeutral: "var(--text-primary)",
    colorDanger: "var(--accent-red)",
    borderRadius: "1rem"
  }
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en">
        <body className="min-h-screen">
          <Providers>
            <Header />
            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
              {children}
            </main>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
