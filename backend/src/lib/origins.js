// CLIENT_URL may hold several origins, e.g. the admin app and the web storefront.
export function parseAllowedOrigins(value) {
  if (!value) return [];

  return value
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}
