# BlobLens Design Reference

## Philosophy

Clean, institutional-grade analytics. Not flashy or neon — **quiet confidence**.
The design should feel like a Bloomberg terminal crossed with a modern SaaS dashboard.

---

## Color System

### Primary Palette (Teal)

The primary teal is the brand anchor. Used sparingly for active states, accents, and CTAs.

| Token | Dark | Light | Usage |
|---|---|---|---|
| `--primary` | `#00A7B5` | `#008A96` | Active states, links, accent borders |
| `--primary-hover` | `#008A96` | `#007680` | Hover states |
| `--accent` | `#5AD7E2` | `#00A7B5` | Sparklines, highlights |

### Surface Palette

Layered surfaces create depth without heavy shadows.

| Token | Dark | Light | Usage |
|---|---|---|---|
| `--background` | `#050809` | `#F8FBFB` | Page background |
| `--sidebar` | `#0B1113` | `#EFF5F5` | Sidebar background |
| `--surface` | `#0F1519` | `#FFFFFF` | Card/panel background |
| `--surface-elevated` | `#151D22` | `#F3F8F8` | Nested elements, hover states |
| `--border` | `#1E2D33` | `#D4E0E3` | Borders, dividers |

### Text Palette

| Token | Dark | Light | Usage |
|---|---|---|---|
| `--text-primary` | `#F0F4F5` | `#0D1618` | Headings, values |
| `--text-secondary` | `#7E9098` | `#5C7077` | Labels, captions, descriptions |

### Status Colors (Shared)

These stay the same across themes for instant recognition.

| Token | Value | Usage |
|---|---|---|
| `--status-healthy` | `#00A86B` | Good/healthy/up |
| `--status-warning` | `#F5A524` | Warning/elevated |
| `--status-critical` | `#E5484D` | Critical/error/down |
| `--status-neutral` | `#71717A` | Inactive/unknown |

---

## Typography

| Class | Size | Weight | Font | Usage |
|---|---|---|---|---|
| Section label | `10px` | 700 | Body | `PROTOCOL ANALYTICS` — uppercase, tracking-wide, primary color |
| Section title | `18px` | 700 | Display | `Network Overview` — sentence case |
| Card label | `10px` | 700 | Body | `DEMAND DENSITY` — uppercase, tracking-widest, text-secondary, 60% opacity |
| Metric value | `30px` | 700 | Mono | `14,238` — large number display |
| Metric unit | `18px` | 400 | Body | `%`, `Gwei` — beside value, text-secondary |
| Description | `11px` | 400 | Body | Below values, text-secondary, 50% opacity |
| Footer text | `10px` | 700/400 | Body/Mono | `bloblens.com` / `Updated HH:MM TZ` |

---

## Card Anatomy

```
┌─────────────────────────────────────┐
│ LABEL (10px, uppercase, secondary)  │  ← card label
│                                     │
│ Content Area                        │  ← chart / data
│                                     │
│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│  ← border-t, 30% opacity
│ bloblens.com          Updated 8:30  │  ← footer
└─────────────────────────────────────┘
```

**Card CSS:** `bg-surface border border-border rounded-xl p-6`
- No shadows (depth comes from surface layering)
- Rounded corners: `12px` (`rounded-xl`)
- Padding: `24px` (`p-6`)
- Footer: separated by `border-t border-border/30`, `pt-3 mt-3`

---

## Section Anatomy

```
LABEL (primary, uppercase, 10px)
Title (18px, bold)
Description (optional, 12px, secondary)

┌─────────────────┐ ┌─────────────────┐
│   Card A        │ │   Card B        │
└─────────────────┘ └─────────────────┘
```

- Section spacing: `mb-16` between sections
- Card gap: `gap-6`
- Section header margin-bottom: `mb-5` or `mb-6`

---

## Snapshot Cards (§02)

Premium metric cards with subtle accent corner.

```
┌──────────────────────────────────┐
│ TOTAL BLOBS (label)         ╲   │  ← subtle teal corner accent
│                               ╲ │
│ 14,238 (mono, 30px)            │
│ Combined throughput... (11px)   │
└──────────────────────────────────┘
```

- Corner accent: `bg-primary/[0.04]` (dark), `bg-primary/[0.06]` (light)
- Hover: `border-primary/25`
- Rounded: `rounded-xl`

---

## Light Mode Rules

1. **Never hardcode dark hex values.** Use CSS variables or Tailwind classes that resolve to variables.
2. **Chart tooltips** must use the theme's tooltip config from `chartTheme.ts`.
3. **Gauge pointer/anchor** must adapt: dark → white pointer, light → dark gray pointer.
4. **Text on cards** — always use `text-text-primary` or `text-text-secondary`, never `#F5F7F8` or similar.
5. **Borders** — always `border-border`, never `border-white/10`.

---

## Animation Tokens

| Name | Duration | Easing | Usage |
|---|---|---|---|
| `animate-fade-up` | `500ms` | `ease-out` | Section headers on mount |
| `animate-page-in` | `400ms` | `ease-out` | Page container entrance |
| `pulse-dot` | continuous | ease-in-out | Live indicator dot |

---

## Chart Footer (Standard)

Every chart card includes:

```html
<div class="flex items-center justify-between pt-3 mt-3 border-t border-border/30">
  <span class="text-[10px] font-bold text-text-secondary/40 tracking-wider uppercase">
    bloblens.com
  </span>
  <span class="text-[10px] font-mono text-text-secondary/40">
    Updated {time with timezone}
  </span>
</div>
```
