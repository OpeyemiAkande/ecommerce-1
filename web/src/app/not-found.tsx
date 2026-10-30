import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-neutral-600">
        That page doesn&apos;t exist or is no longer available.
      </p>
      <Link
        href="/products"
        className="mt-6 inline-block rounded bg-neutral-900 px-4 py-2 text-white"
      >
        Browse products
      </Link>
    </div>
  );
}
