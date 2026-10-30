import {formatPrice} from "@/lib/format";
import {computeTotals} from "@/lib/pricing";

export function OrderSummary({subtotal}: {subtotal: number}) {
  const totals = computeTotals(subtotal);

  const rows = [
    ["Subtotal", totals.subtotal, true],
    ["Shipping", totals.shipping, false],
    ["Tax", totals.tax, false]
  ] as const;

  return (
    <div className="card p-5">
      <h2 className="mb-4 text-xl font-bold">Order summary</h2>

      <div className="space-y-3">
        {rows.map(([label, amount, highlight]) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-text-secondary">{label}</span>
            <span
              className={`font-semibold ${highlight ? "text-primary-text" : ""}`}
            >
              {formatPrice(amount)}
            </span>
          </div>
        ))}

        <div className="flex items-center justify-between border-t border-line pt-3">
          <span className="text-lg font-bold">Total</span>
          <span className="text-2xl font-bold text-primary-text">
            {formatPrice(totals.total)}
          </span>
        </div>
      </div>
    </div>
  );
}
