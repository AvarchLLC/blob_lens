import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  className?: string;
}

export function StatCard({ label, value, sub, className }: Props) {
  return (
    <Card
      className={cn("group", className)}
      style={{ borderTop: "1px solid rgba(138, 79, 216, 0.4)" }}
    >
      <CardHeader className="pb-1 min-h-0">
        <p className="stat-label">{label}</p>
      </CardHeader>
      <CardContent>
        <p className="font-display text-[1.95rem] font-medium leading-none text-foreground sm:text-[2.15rem]">
          {value}
        </p>
        {sub && <p className="mt-2 caption">{sub}</p>}
      </CardContent>
    </Card>
  );
}
