import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  className?: string;
  valueColor?: string;
}

export function StatCard({ label, value, sub, className, valueColor }: Props) {
  return (
    <Card
      className={cn("group", className)}
      style={{ borderTop: "2px solid #10B981" }}
    >
      <CardHeader className="pb-1 min-h-0">
        <p className="stat-label">{label}</p>
      </CardHeader>
      <CardContent>
        <p
          className="font-display text-[1.95rem] font-bold leading-none sm:text-[2.15rem]"
          style={{ color: valueColor ?? "var(--foreground)" }}
        >
          {value}
        </p>
        {sub && <p className="mt-2 caption">{sub}</p>}
      </CardContent>
    </Card>
  );
}
