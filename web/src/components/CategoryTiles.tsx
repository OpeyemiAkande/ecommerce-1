import Image from "next/image";
import Link from "next/link";
import {IoGridOutline, IoPricetagOutline} from "react-icons/io5";

// Artwork copied from the mobile app; unknown categories fall back to an icon.
const CATEGORY_IMAGES: Record<string, string> = {
  Electronics: "/categories/electronics.png",
  Fashion: "/categories/fashion.png",
  Sports: "/categories/sports.png",
  Books: "/categories/books.png"
};

function Tile({
  href,
  label,
  selected,
  children
}: {
  href: string;
  label: string;
  selected: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className="group flex shrink-0 flex-col items-center gap-2"
    >
      <span
        className={`flex size-20 items-center justify-center overflow-hidden rounded-2xl border transition group-hover:scale-105 ${
          selected
            ? "border-primary bg-primary text-on-primary"
            : "border-line bg-surface text-text-primary"
        }`}
      >
        {children}
      </span>
      <span
        className={`text-xs font-semibold ${selected ? "text-primary-text" : "text-text-secondary"}`}
      >
        {label}
      </span>
    </Link>
  );
}

export function CategoryTiles({
  categories,
  selected,
  hrefFor
}: {
  categories: string[];
  selected?: string;
  hrefFor: (category?: string) => string;
}) {
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      <Tile href={hrefFor()} label="All" selected={!selected}>
        <IoGridOutline size={36} />
      </Tile>

      {categories.map((category) => {
        const image = CATEGORY_IMAGES[category];

        return (
          <Tile
            key={category}
            href={hrefFor(category)}
            label={category}
            selected={selected === category}
          >
            {image ? (
              <Image src={image} alt="" width={48} height={48} />
            ) : (
              <IoPricetagOutline size={32} />
            )}
          </Tile>
        );
      })}
    </div>
  );
}
