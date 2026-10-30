import helmet from "helmet";

export function securityHeaders() {
  return helmet({
    // The API answers with JSON and, in production, also serves the built admin
    // app, which loads Clerk's scripts from other origins. A CSP would have to
    // be tuned per deployment, so it stays off here.
    contentSecurityPolicy: false,
    // Clerk's OAuth popups rely on window.opener.
    crossOriginOpenerPolicy: false,
    // The web, mobile and admin apps read these responses from other origins.
    crossOriginResourcePolicy: {policy: "cross-origin"}
  });
}
