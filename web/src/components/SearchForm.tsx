export function SearchForm({
  defaultValue,
  category
}: {
  defaultValue?: string;
  category?: string;
}) {
  return (
    <form action="/products" method="get" className="flex gap-2">
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search products"
        className="w-full rounded border border-neutral-300 px-3 py-2"
      />
      {category && <input type="hidden" name="category" value={category} />}
      <button className="rounded bg-neutral-900 px-4 py-2 text-white">
        Search
      </button>
    </form>
  );
}
