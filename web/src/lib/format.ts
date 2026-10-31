import {CURRENCY} from "./config";

const priceFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: CURRENCY
});

export const formatPrice = (amount: number) => priceFormatter.format(amount);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
