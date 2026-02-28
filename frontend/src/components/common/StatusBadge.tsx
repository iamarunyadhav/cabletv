import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusVariantMap: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  paid: "default",
  success: "default",
  pending: "secondary",
  draft: "secondary",
  inactive: "secondary",
  overdue: "destructive",
  suspended: "destructive",
  disconnected: "destructive",
  failed: "destructive",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status?.toLowerCase?.() ?? "";
  const variant = statusVariantMap[normalized] || "outline";
  const label = status?.replace(/_/g, " ") ?? "";

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
