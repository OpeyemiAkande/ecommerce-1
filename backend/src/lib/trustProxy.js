// Behind a reverse proxy (Render, Heroku, nginx...) every request appears to
// come from the proxy unless Express is told how many proxy hops to trust.
// That breaks per-IP rate limiting, but trusting too many hops lets clients
// spoof their IP, so it is opt-in: set TRUST_PROXY=1 for a single proxy.
export function parseTrustProxy(value) {
  if (!value || value === "false") return false;
  if (/^[0-9]+$/.test(value)) return Number(value);

  return value;
}
