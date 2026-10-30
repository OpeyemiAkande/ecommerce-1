import type {PublicProduct} from "./types";

// Instant, in-memory filter over products that were already fetched. It uses
// the same fields as the server search (name and description) so a local
// match and a server match agree.
export function filterProducts(
  products: PublicProduct[],
  query: string
): PublicProduct[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return products;

  return products.filter(
    (product) =>
      product.name.toLowerCase().includes(needle) ||
      product.description.toLowerCase().includes(needle)
  );
}

export function productsUrl({
  q,
  category,
  page
}: {
  q?: string;
  category?: string;
  page?: string;
}) {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  if (category) params.set("category", category);
  if (page && page !== "1") params.set("page", page);
  const query = params.toString();

  return `/products${query ? `?${query}` : ""}`;
}
