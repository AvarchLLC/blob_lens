# BlobLens UI Reference (Protocol Intelligence)

This document serves as the definitive design system and UI reference for BlobLens, following the **"Protocol Intelligence"** revamp.

## 1. Design Philosophy
BlobLens is a **protocol intelligence platform**. The UI is designed for:
- **Precision:** Clean lines, solid surfaces, and explicit borders.
- **Data Density:** Efficient use of space to present complex protocol-level analytics.
- **Institutional Polish:** A quiet, professional aesthetic resembling technical observability platforms.
- **Clarity:** Standardized page structures that answer "Where am I?", "What am I looking at?", and "Why does it matter?".

---

## 2. Color System

### Dark Theme (Operational Analysis)
| Layer | Hex Code | Usage |
| :--- | :--- | :--- |
| **Background** | `#050809` | Main application background |
| **Sidebar** | `#0B1113` | Global navigation background |
| **Surface** | `#11181C` | Primary cards and sections |
| **Surface Elev.** | `#172126` | Secondary cards, hover states |
| **Border** | `#1C2A30` | Standard component borders |
| **Primary (Teal)** | `#00A7B5` | Call-to-actions, active states, healthy indicators |
| **Foreground** | `#F5F7F8` | Primary text |
| **Secondary Text** | `#8FA1A8` | Captions, metadata, muted labels |

### Status / Regime Colors
| State | Hex Code | Usage |
| :--- | :--- | :--- |
| **Healthy** | `#00A86B` | Optimal utilization, low fees |
| **Warning** | `#F5A524` | Rising utilization, congestion risk |
| **Critical** | `#E5484D` | Full saturation, fee spikes |
| **Neutral** | `#71717A` | Inactivity, low significance |

---

## 3. Typography

- **Display / Headings:** `Space Grotesk` (Bold, tracking: `-0.02em`)
- **Body / Navigation:** `Plus Jakarta Sans` (Clean, modern sans-serif)
- **Metrics / Data:** `JetBrains Mono` (High-legibility monospace for hashes and numbers)

### Hierarchy
- **Display Hero:** 64px / 700
- **H1 (Page Title):** 40px / 700
- **H2 (Section):** 30px / 650
- **H3 (Sub-section):** 22px / 600
- **Metric Display:** 32–40px / 700 (JetBrains Mono)

---

## 4. Application Layout

### Global App Shell
- **Sidebar (280px):** Fixed left navigation with grouped items (Overview, Live Data, Market, Research, Developer). Active state uses a 3px teal rail.
- **Navbar (64px):** Sticky top bar with breadcrumbs, global search, and utility actions.
- **Main Content:** Standardized padding (`p-6` to `p-8`) with a `max-w-[1440px]` container.

---

## 5. Core Components

### PageHeader
Standardized header for every page.
- **Meta Label:** Small uppercase teal text (e.g., "ANALYTICS").
- **Title:** Large `h1` heading.
- **Summary:** 2-3 sentence explanatory text.
- **Action Row:** Right-aligned area for badges, price feeds, or primary buttons.

### PageSection
Structured block for content modules.
- **Section Label:** Faint uppercase metadata tag.
- **Visualization:** Chart, table, or metric grid.
- **Interpretation Layer:** A highlighted box at the bottom explaining "What this means".

### MetricCard
KPI-focused data display.
- **Value:** Uses the `Metric Display` font (JetBrains Mono).
- **Delta:** Green/Red indicators for trend analysis.
- **Context Note:** Small caption for additional clarity.

---

## 6. Charting Standards (ECharts)

- **Palette:** Primary Teal (`#00A7B5`), Status Warning (`#F5A524`), Status Critical (`#E5484D`).
- **Grid:** Subtle borders (`#1C2A30`), minimal split lines (4% opacity).
- **Tooltip:** Solid surface (`#11181C`) with explicit border.
- **Animation:** `cubicOut` easing, 600ms duration.

---

## 7. Global CSS Classes
- `.surface`: Basic solid card background.
- `.surface-elevated`: Darker background for nested or secondary elements.
- `.metric-display`: Large, bold monospace font for key numbers.
- `.animate-page-in`: Subtle fade-in for page transitions.
- `.sidebar-item-active`: Specific styling for the current route in the sidebar.
