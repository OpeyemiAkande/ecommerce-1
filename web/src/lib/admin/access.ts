export type AdminAccess = "admin" | "forbidden" | "signed-out";

// Asks the backend (the single source of truth for who is an admin) whether
// this session may use the admin. Anything unexpected throws, so an outage
// shows the error page instead of being mistaken for "not an admin".
export async function checkAdminAccess({
  apiUrl,
  token,
  fetchImpl = (...args) => fetch(...args)
}: {
  apiUrl: string;
  token: string | null;
  fetchImpl?: typeof fetch;
}): Promise<AdminAccess> {
  if (!token) return "signed-out";

  const res = await fetchImpl(`${apiUrl}/admin/me`, {
    headers: {Authorization: `Bearer ${token}`},
    cache: "no-store"
  });

  if (res.ok) return "admin";
  if (res.status === 401) return "signed-out";
  // 404: the Clerk user has no record in our database, so can't be the admin.
  if (res.status === 403 || res.status === 404) return "forbidden";

  throw new Error(`Admin access check failed: ${res.status}`);
}
