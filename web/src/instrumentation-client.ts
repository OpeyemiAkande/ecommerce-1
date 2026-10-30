import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Skipped entirely when no DSN is set (local dev, CI, e2e).
if (dsn) {
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
