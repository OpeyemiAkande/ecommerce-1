import {parseReference} from "@/lib/payment";
import {PaymentResult} from "./PaymentResult";

export default async function CheckoutSuccessPage({
  searchParams
}: {
  searchParams: Promise<{reference?: string | string[]}>;
}) {
  const {reference} = await searchParams;

  return <PaymentResult reference={parseReference(reference)} />;
}
