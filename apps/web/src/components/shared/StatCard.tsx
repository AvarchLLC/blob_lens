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
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </CardHeader>
      <CardContent>
        <p className="font-mono text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
