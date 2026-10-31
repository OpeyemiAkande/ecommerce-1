export type BadgeTone = "success" | "info" | "warning" | "error" | "ghost";

export const PRODUCT_CATEGORIES = [
  "Electronics",
  "Accessories",
  "Fashion",
  "Sports"
];

export const capitalizeText = (text: string) =>
  text ? text.charAt(0).toUpperCase() + text.slice(1) : text;

export function orderStatusTone(status?: string): BadgeTone {
  switch (status?.toLowerCase()) {
    case "delivered":
      return "success";
    case "shipped":
      return "info";
    case "pending":
      return "warning";
    default:
      return "ghost";
  }
}

export function stockStatus(stock: number): {text: string; tone: BadgeTone} {
  if (stock === 0) return {text: "Out of Stock", tone: "error"};
  if (stock < 20) return {text: "Low Stock", tone: "warning"};
  return {text: "In Stock", tone: "success"};
}

// ApiError already carries the server's `message`/`error` text.
export const getErrorMessage = (error: unknown, fallback = "Something went wrong") =>
  error instanceof Error && error.message ? error.message : fallback;
