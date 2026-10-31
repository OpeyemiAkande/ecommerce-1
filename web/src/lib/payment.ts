// Paystack appends both `trxref` and `reference`; if the param is repeated it
// can arrive as an array or a comma-joined string, so take the first value.
export function parseReference(
  value: string | string[] | undefined
): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const reference = raw?.split(",")[0].trim();

  return reference || null;
}
