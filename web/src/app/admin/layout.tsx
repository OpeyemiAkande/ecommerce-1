import type {Metadata} from "next";
import {forbidden, redirect} from "next/navigation";
import {auth} from "@clerk/nextjs/server";
import {AdminShell} from "@/components/admin/AdminShell";
import {checkAdminAccess} from "@/lib/admin/access";
import {API_URL} from "@/lib/config";

export const metadata: Metadata = {
  title: {default: "Admin", template: "%s | Admin"},
  robots: {index: false, follow: false}
};

// The admin is only rendered for the admin: the backend is asked first, and
// everyone else gets the 403 page without receiving any admin UI.
export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const {getToken} = await auth();
  const access = await checkAdminAccess({apiUrl: API_URL, token: await getToken()});

  if (access === "signed-out") redirect("/sign-in?redirect_url=/admin");
  if (access === "forbidden") forbidden();

  return <AdminShell>{children}</AdminShell>;
}
