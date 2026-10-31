let started = false;

// Loaded on demand from the admin shell so the storefront bundle never
// includes Sentry. Does nothing when no DSN is configured.
export async function initSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn || started) return;
  started = true;

  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn,
    // Keep default PII (e.g. IP addresses) out of Sentry events.
    sendDefaultPii: false,
    enableLogs: true,
    integrations: [Sentry.replayIntegration()],
    replaysSessionSampleRate: Number(
      process.env.NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE ?? 0
    ),
    replaysOnErrorSampleRate: 1.0
  });
}
