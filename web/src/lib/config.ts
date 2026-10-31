export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "NGN";

export const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME ?? "Store";
