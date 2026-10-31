"use client";

import {useEffect} from "react";
import {IoClose} from "react-icons/io5";

export function Modal({
  title,
  onClose,
  closeDisabled = false,
  maxWidth = "max-w-2xl",
  children
}: {
  title: string;
  onClose: () => void;
  closeDisabled?: boolean;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !closeDisabled) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, closeDisabled]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={closeDisabled ? undefined : onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`card relative max-h-[90vh] w-full overflow-y-auto p-6 ${maxWidth}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            disabled={closeDisabled}
            aria-label="Close"
          >
            <IoClose size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
