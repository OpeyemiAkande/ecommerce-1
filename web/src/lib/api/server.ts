import {API_URL} from "@/lib/config";
import type {ProductPage, PublicProduct} from "@/lib/types";

// Cached for 60s so public pages are served from ISR; failures are thrown so
// the route shows error.tsx instead of caching a broken page.
async function getJson<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API_URL}${path}`, {next: {revalidate: 60}});

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API request failed: ${res.status} ${path}`);

  return (await res.json()) as T;
}

interface ProductQuery {
  category?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export async function fetchProducts(
  params: ProductQuery = {}
): Promise<ProductPage> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();

  const data = await getJson<ProductPage>(
    `/public/products${query ? `?${query}` : ""}`
  );
  if (!data) throw new Error("Products endpoint returned 404");

  return data;
}

export const fetchProduct = (id: string) =>
  getJson<PublicProduct>(`/public/products/${encodeURIComponent(id)}`);

export async function fetchCategories(): Promise<string[]> {
  const data = await getJson<{categories: string[]}>("/public/categories");

  return data?.categories ?? [];
}

export async function fetchAllProducts(): Promise<PublicProduct[]> {
  const all: PublicProduct[] = [];
  let page = 1;
  let pages = 1;

  do {
    const data = await fetchProducts({page, limit: 100});
    all.push(...data.products);
    pages = data.pages;
    page += 1;
  } while (page <= pages);

  return all;
}
