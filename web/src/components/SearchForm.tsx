import {IoSearch} from "react-icons/io5";

export function SearchForm({
  defaultValue,
  category
}: {
  defaultValue?: string;
  category?: string;
}) {
  return (
    <form action="/products" method="get" role="search" className="flex gap-2">
      <div className="relative flex-1">
        <IoSearch
          size={22}
          className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-text-tertiary"
        />
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder="Search for products"
          aria-label="Search for products"
          className="input pl-14"
        />
      </div>
      {category && <input type="hidden" name="category" value={category} />}
      <button className="btn-primary hidden sm:inline-flex">Search</button>
    </form>
  );
}
