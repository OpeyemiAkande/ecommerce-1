import {formatPrice} from "@/lib/format";
import {computeTotals} from "@/lib/pricing";

export function OrderSummary({subtotal}: {subtotal: number}) {
  const totals = computeTotals(subtotal);

  const rows = [
    ["Subtotal", totals.subtotal],
    ["Shipping", totals.shipping],
    ["Tax", totals.tax]
  ] as const;

  return (
    <div className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4">
      {rows.map(([label, amount]) => (
        <div key={label} className="flex justify-between text-sm">
          <span>{label}</span>
          <span>{formatPrice(amount)}</span>
        </div>
      ))}
      <div className="flex justify-between border-t border-neutral-200 pt-2 font-semibold">
        <span>Total</span>
        <span>{formatPrice(totals.total)}</span>
      </div>
    </div>
  );
}
