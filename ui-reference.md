# BlobLens UI Reference & Design System Guide

This document provides a comprehensive reference of the **retro-technical / brutalist design system** implemented across the BlobLens platform. It serves as a guide for developers to build consistent, high-telemetry, and visually cohesive components that align with the platform's aesthetics.

---

## 1. Design Aesthetics & Philosophy

The BlobLens interface is built around a **retro-brutalist / technical telemetry console** aesthetic. It moves away from standard modern rounded dashboards in favor of a sharp, high-density, command-center look.

*   **Sharp Aesthetics**: All standard card and layout containers must have zero border-radius (`rounded-none`). No soft pill-shaped elements should be used for layout blocks.
*   **Precision Telemetry**: All data, numbers, block heights, gas fees, and hashes must be rendered using monospace typography (`font-mono`) with tabular numbers (`tabular-nums`) to ensure alignment.
*   **Dotted & Dashed Dividers**: Borders should utilize thin dashed or dotted styles rather than solid lines to evoke blueprint and schematic vibes.
*   **Interactive Visuals**: Subtle retro animations (like pulsing status indicators and scanline hover effects) are used to make the dashboard feel active and responsive.

---

## 2. Color Palette & CSS Variables

The application supports a fully synchronized light and dark theme. The theme tokens are declared in `globals.css` and map to custom CSS variables.

### Dark Theme: Cosmic Midnight (`bg-[#06060C]`)
A deep space theme characterized by violet, indigo, and pink accents over dark surfaces.
*   `--background`: `#06060C` (Main page canvas)
*   `--sidebar`: `#0A0A14` (Left sidebar background)
*   `--surface`: `#10101E` (Standard card and panel background)
*   `--surface-elevated`: `#16162A` (Hovered or elevated containers)
*   `--primary`: `#8B5CF6` (Main brand purple)
*   `--primary-hover`: `#7C3AED`
*   `--accent`: `#A78BFA` (Light purple highlighting)
*   `--border`: `rgba(139, 92, 246, 0.16)` (Subtle purple card outline)
*   `--border-dotted`: `rgba(139, 92, 246, 0.22)` (Dotted card divider)

### Light Theme: Silver Lavender Paper (`bg-[#F8F7FF]`)
A high-contrast, clean light paper theme with soft lavender elevations.
*   `--background`: `#F8F7FF`
*   `--sidebar`: `#F0EDFF`
*   `--surface`: `#FFFFFF`
*   `--surface-elevated`: `#F5F3FF`
*   `--primary`: `#7C3AED`
*   `--accent`: `#C084FC`
*   `--border`: `rgba(124, 58, 237, 0.12)`
*   `--border-dotted`: `rgba(124, 58, 237, 0.18)`

### Status & Regime Colors (Common)
*   `--status-healthy` / `Quiet`: `#10B981` (Emerald Green)
*   `--status-warning` / `Congested`: `#F59E0B` (Amber Gold)
*   `--status-critical` / `Spike`: `#EF4444` (Rose Red)
*   `--status-neutral`: `#6B7280` (Zinc Gray)

---

## 3. Core Utility CSS Classes

These CSS utilities are declared globally in `globals.css` and should be used to style containers and pages.

### `.cosmic-card`
The primary panel style. Represents a technical dashboard module.
```css
.cosmic-card {
  background-color: var(--surface);
  border: 1px dashed var(--border-dotted);
  border-radius: var(--radius-md); /* 0px in brutalist mode */
  padding: 1.5rem;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
```
*   **Hover State**: Translates upwards slightly, changes border style to solid brand-primary, and casts a subtle purple glow: `box-shadow: 0 8px 30px rgba(139, 92, 246, 0.08)`.

### `.cosmic-grid-bg`
Applied to the page container to draw a subtle technical grid overlay.
```css
.cosmic-grid-bg {
  background-size: 24px 24px;
  background-image: radial-gradient(circle, var(--border-subtle) 1px, transparent 1px);
}
```

### `.cosmic-divider-h` & `.cosmic-divider-v`
Dotted separators for grids and sections.
*   **Horizontal**: `border-top: 1px dotted var(--border-dotted)`
*   **Vertical**: `border-left: 1px dotted var(--border-dotted)`

### `.scanline-effect`
Adds a vintage terminal CRT scanline animation that sweeps downwards when a card is hovered.
```css
.scanline-effect:hover::after {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(to bottom, rgba(139, 92, 246, 0) 0%, rgba(139, 92, 246, 0.08) 50%, rgba(139, 92, 246, 0) 100%);
  animation: scanline 6s linear infinite;
  pointer-events: none;
}
```

### `.tech-bracket`
Draws high-precision L-bracket corners on the top-left and bottom-right of a hovered element. Perfect for main call-to-actions and interactive console grids.

### `.crt-grid`
Adds a faint, authentic CRT monitor pixel overlay to sections to enhance the retro console theme.

---

## 4. Standard Layout Components

BlobLens pages are structured using two primary semantic components defined in `apps/web/src/components/shared/PageHeader.tsx`.

### `PageHeader`
The top-of-page navigation and summary block. Automatically appends a horizontal dotted divider below itself.
```tsx
<PageHeader 
  meta="Telemetry Console"
  title="Real-Time Data"
  summary="Observed block space and blob gas fees on Ethereum Mainnet."
>
  <button className="rounded-none bg-primary text-white font-mono text-xs px-4 py-2 uppercase tracking-wider">
    [ Live Feed ]
  </button>
</PageHeader>
```

### `PageSection`
A standard page module wrapping child components. It renders a clean header block with optional descriptions and an **Interpretation Panel** at the bottom to translate complex technical metrics for end users.
```tsx
<PageSection
  label="Congestion"
  title="Fee Forecast"
  description="Predictive modeling of blob base fees."
  interpretation="When the exponential fee mechanism triggers, fees double every ~12 blocks under full capacity."
>
  <YourChartComponent />
</PageSection>
```

---

## 5. UI Component Library (Client side)

When building dashboard pages (such as `/mev`, `/wallet-360`, and `/rollup`), use the following specialized helper components:

### A. Dashboard Card (`Card`)
Standard panel wrapping stats or charts. Integrates theme-config (`tc`) classes dynamically.
```tsx
function Card({ tc, title, sub, children, className = "" }: {
  tc: TC; title: string; sub?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-none border ${tc.card} ${tc.cardBorder} p-5 ${className}`}>
      <div className="mb-4">
        <p className={`text-[13px] font-bold uppercase tracking-wider font-mono ${tc.text}`}>{title}</p>
        {sub && <p className={`text-xs mt-0.5 font-mono opacity-60 ${tc.faint}`}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}
```

### B. KPI Stat Box (`Kpi`)
High-density numeric telemetry metrics.
```tsx
function Kpi({ tc, label, value, sub, accent }: {
  tc: TC; label: string; value: string; sub?: string; accent?: string;
}) {
  return (
    <div className={`rounded-none border ${tc.kpiBg} ${tc.kpiBorder} px-5 py-4`}>
      <p className={`text-[10px] font-bold uppercase tracking-widest font-mono ${tc.muted}`}>{label}</p>
      <p className={`mt-1.5 text-2xl font-bold tabular-nums font-mono ${accent ?? tc.text}`}>{value}</p>
      {sub && <p className={`mt-0.5 text-xs font-mono opacity-60 ${tc.faint}`}>{sub}</p>}
    </div>
  );
}
```

### C. Data Table Wrapper (`TableShell`)
Wraps tabular telemetry lists. Ensures responsive scrolling and clean headers.
```tsx
function TableShell({ tc, title, sub, head, children }: {
  tc: TC; title: string; sub?: string; head: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className={`rounded-none border ${tc.cardBorder} ${tc.card} overflow-hidden`}>
      <div className={`border-b ${tc.tableBorder} px-5 py-3`}>
        <p className={`text-[13px] font-bold uppercase tracking-wider font-mono ${tc.text}`}>{title}</p>
        {sub && <p className={`text-xs ${tc.muted} mt-0.5 font-mono opacity-60`}>{sub}</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b ${tc.tableBorder} text-[10px] uppercase tracking-widest font-mono ${tc.tableHead}`}>
              {head}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
```

### D. Empty & Backfill State Indicator (`EmptyState`)
Used in place of empty graphs or while waiting for background workers to backfill ClickHouse.
```tsx
function EmptyState({ tc, msg = "No data available" }: { tc: TC; msg?: string }) {
  return (
    <div className={`flex items-center justify-center py-16 text-xs font-mono opacity-50 uppercase tracking-wider ${tc.text}`}>
      {msg}
    </div>
  );
}
```

### E. Standardized Metadata Footer (`ChartCardFooter`)
Must be appended to the bottom of all telemetry panels and tables to indicate source authenticity and live update timestamps.
```tsx
import { ChartCardFooter } from "@/components/shared/ChartCardFooter";

// Inside card or table shell:
<div className="px-6 py-4 border-t border-border/10">
  <ChartCardFooter />
</div>
```

---

## 6. Recharts Theming & Adaptation

Recharts components must be styled inline to match the brutalist theme without using external CSS files that disrupt light/dark switching.

### Chart Grid and Axes
Always bind grid strokes and axis labels to the active theme configuration (`tc`):
*   **Cartesian Grid**: `<CartesianGrid strokeDasharray="3 3" stroke={tc.grid} />`
*   **X-Axis / Y-Axis**:
    ```tsx
    const TICK = { fill: tc.axis, fontSize: 10, fontFamily: "var(--font-geist-mono)" };
    
    <XAxis dataKey="week" tick={TICK} tickLine={false} />
    <YAxis tick={TICK} tickLine={false} axisLine={false} />
    ```

### Chart Bars
Bar charts must have a border-radius of 0 to follow the sharp-edged brutalist aesthetic:
*   **Brutalist Bar**: `<Bar dataKey="bots" fill="#818cf8" radius={0} />`

### Custom Tooltips
Tooltips should have flat square corners, matching backgrounds, and monospace typography:
```tsx
const TIP = {
  contentStyle: {
    background: tc.ttBg,
    border: `1px solid ${tc.ttBorder}`,
    borderRadius: 0,
    color: tc.ttColor,
    fontSize: 11,
    fontFamily: "var(--font-geist-mono)"
  }
};

<Tooltip {...TIP} />
```
