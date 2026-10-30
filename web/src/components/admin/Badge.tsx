import type {BadgeTone} from "@/lib/admin/utils";

export function Badge({
  tone,
  children
}: {
  tone: BadgeTone;
  children: React.ReactNode;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
