// Routes that require a signed-in user (the middleware redirects to sign-in).
export const PROTECTED_ROUTES = [
  "/cart(.*)",
  "/checkout(.*)",
  "/account(.*)",
  "/admin(.*)"
];
