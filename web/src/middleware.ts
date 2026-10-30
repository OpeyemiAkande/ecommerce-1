import {clerkMiddleware, createRouteMatcher} from "@clerk/nextjs/server";
import {PROTECTED_ROUTES} from "./lib/protectedRoutes";

const isProtected = createRouteMatcher(PROTECTED_ROUTES);

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)"
  ]
};
