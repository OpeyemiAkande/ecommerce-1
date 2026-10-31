// The callback is always built here from server config. The client only picks
// a platform, never a URL, so there is no open-redirect surface.
export function resolveCallbackUrl({platform, reference, webUrl, ngrokUrl}) {
  if (platform === "web") {
    if (!webUrl) throw new Error("WEB_URL is not configured");

    // Paystack appends ?trxref=...&reference=... to the callback URL itself.
    return `${webUrl.replace(/\/+$/, "")}/checkout/success`;
  }

  return `${ngrokUrl}/api/payments/payment-success?reference=${reference}`;
}
