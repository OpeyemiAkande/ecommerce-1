"use client";

import Image from "next/image";
import {useState} from "react";

export function ProductGallery({
  images,
  name
}: {
  images: string[];
  name: string;
}) {
  const [selected, setSelected] = useState(0);

  return (
    <div className="space-y-3">
      <div className="card relative aspect-square overflow-hidden bg-background-lighter">
        {images[selected] && (
          <Image
            src={images[selected]}
            alt={name}
            fill
            priority={selected === 0}
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((src, index) => (
            <button
              key={src}
              onClick={() => setSelected(index)}
              aria-label={`Show image ${index + 1} of ${images.length}`}
              aria-current={index === selected}
              className={`relative size-16 overflow-hidden rounded-2xl border-2 bg-background-lighter transition ${
                index === selected
                  ? "border-primary"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
