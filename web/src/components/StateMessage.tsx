import type {IconType} from "react-icons";

// Icon + title + hint block, the shape mobile uses for empty/error states.
export function StateMessage({
  icon: Icon,
  title,
  description,
  tone = "muted",
  children
}: {
  icon: IconType;
  title: string;
  description?: string;
  tone?: "muted" | "error" | "success";
  children?: React.ReactNode;
}) {
  const color = {
    muted: "text-text-tertiary",
    error: "text-accent-red",
    success: "text-primary"
  }[tone];

  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <Icon size={64} className={color} />
      <h1 className="mt-4 text-xl font-semibold">{title}</h1>
      {description && (
        <p className="mt-2 max-w-sm text-text-secondary">{description}</p>
      )}
      {children && <div className="mt-6 flex gap-3">{children}</div>}
    </div>
  );
}

export function Spinner({label}: {label?: string}) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center py-20"
    >
      <span className="size-9 animate-spin rounded-full border-4 border-primary/25 border-t-primary" />
      {label && <p className="mt-4 text-text-secondary">{label}</p>}
    </div>
  );
}
