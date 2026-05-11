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
      className={cn("border-glow group relative overflow-hidden", className)}
      style={{ borderTop: "1px solid rgba(0, 223, 129, 0.35)" }}
    >
      {/* Hover radial spotlight */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at top, rgba(0,223,129,0.07) 0%, transparent 70%)",
        }}
      />
      <CardHeader className="pb-1 min-h-0">
        <p className="stat-label">{label}</p>
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            "font-display text-[1.95rem] font-bold leading-none sm:text-[2.15rem]",
            !valueColor && "stat-value-accent"
          )}
          style={valueColor ? { color: valueColor } : undefined}
        >
          {value}
        </p>
        {sub && <p className="mt-2 caption">{sub}</p>}
      </CardContent>
    </Card>
  );
}
