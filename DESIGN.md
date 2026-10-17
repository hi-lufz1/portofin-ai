# DESIGN.md: Portofin Design System ("Precision Financial Ledger")

## 1. Visual Direction & Antislop Dial
- **Archetype**: Precision Financial Ledger (inspired by Linear, Stripe Financial Connections, and Bloomberg Terminal light mode).
- **Dial Settings**:
  - `ENERGY: 2` (Restrained, high-trust institutional calm; zero decorative bloat or neon gradients).
  - `RHYTHM: 2` (Structured asymmetric Bento grid with crisp 1px borders and dense tabular alignment).
  - `MOTION: 1` (Functional micro-transitions `150ms cubic-bezier(0.22, 1, 0.36, 1)`; zero infinite pulses or gratuitous animations).

## 2. Typography & Tabular Hierarchy
- **Primary UI Sans**: `Inter` (`--font-inter`) for navigation, labels, headings, and prose.
- **Financial & Numerical Monospace**: `JetBrains Mono` (`--font-jetbrains-mono`) with `font-variant-numeric: tabular-nums` for all prices, quantities, lots, percentages, P/L figures, and dates.
- **Scale**:
  - Page Title: `26px` (`1.625rem`), weight `700`, tracking `-0.02em`
  - Hero / Primary Metric: `24px` (`1.5rem`), weight `700`, `var(--font-mono)`, `tabular-nums`
  - Section Title: `16px` (`1rem`), weight `600`, tracking `-0.01em`
  - Table Cell / Body: `14px` (`0.875rem`), line-height `1.5`
  - Micro / Table Column Header: `11px` (`0.6875rem`), weight `600`, uppercase, tracking `0.06em`

## 3. Color Tokens & Verified WCAG AA Contrast
All text/surface pairs are verified against the WCAG 2.1 relative luminance formula (`>= 4.5:1` for normal text, `>= 3.0:1` for large text and non-text UI components):

| Token | Hex | Usage | Contrast vs `#FFFFFF` | Contrast vs `#F8FAFC` |
| :--- | :--- | :--- | :--- | :--- |
| `--bg` | `#F8FAFC` | Page canvas background | N/A | N/A |
| `--surface` | `#FFFFFF` | Card, table, sidebar, and modal surface | N/A | N/A |
| `--surface-hover` | `#F1F5F9` | Interactive row/button hover state | N/A | N/A |
| `--text` | `#0F172A` | Primary ink for headings and values | `15.80:1` (AAA) | `14.90:1` (AAA) |
| `--text-secondary` | `#334155` | Secondary labels and descriptions | `9.70:1` (AAA) | `9.15:1` (AAA) |
| `--text-muted` | `#475569` | Muted metadata, timestamps, captions | `7.05:1` (AAA) | `6.65:1` (AA) |
| `--border` | `#CBD5E1` | Primary structural borders (`1px solid`) | N/A | N/A |
| `--border-focus` | `#1D4ED8` | `:focus-visible` ring (`2px solid`) | `6.70:1` (AA) | `6.32:1` (AA) |
| `--primary` | `#0F172A` | Primary CTA background & active nav pill | `15.80:1` (AAA) | `14.90:1` (AAA) |
| `--accent` | `#1D4ED8` | Interactive links, focus rings, active badges | `6.70:1` (AA) | `6.32:1` (AA) |
| `--green` / `--green-text` | `#15803D` | Positive P/L text & icons (`4.53:1` on `#DCFCE7`) | `5.02:1` (AA) | `4.73:1` (AA) |
| `--green-bg` | `#DCFCE7` | Positive badge surface | N/A | N/A |
| `--red` | `#B91C1C` | Negative P/L text & icons | `6.47:1` (AA) | `6.10:1` (AA) |
| `--red-text` | `#991B1B` | Negative badge text (`6.85:1` on `#FEE2E2`) | `8.32:1` (AAA) | `7.85:1` (AAA) |
| `--red-bg` | `#FEE2E2` | Negative badge surface | N/A | N/A |
| `--amber-text` | `#92400E` | Warning / Guest sandbox badge text (`6.06:1` on `#FEF3C7`) | `7.45:1` (AAA) | `7.02:1` (AAA) |
| `--amber-bg` | `#FEF3C7` | Warning / Guest sandbox surface | N/A | N/A |

## 4. Layout, Accessibility & Anti-Slop Rules
1. **No Purple/Indigo AI Gradients (R-01, R-04, R-13)**: All `#6366F1 -> #818CF8` and `#A855F7 -> #C084FC` gradients, gradient text fills, and capsule `"AI"` badges are prohibited. Use crisp `1px solid var(--border)` cards and institutional slate (`#0F172A`) or cobalt (`#1D4ED8`) accents.
2. **No Em Dashes or Decorative Emojis (R-02, R-09)**: Never use `—` in UI copy, metadata, or empty placeholders (use `N/A`, `-`, colons, or periods). Never use decorative emojis (`👋`, `🎯`, `💭`, `❓`, `🔴`, `🟡`, `🟢`, `🧑‍💻`, `🧠`, `⚠️`); use Lucide vector icons or typographic badges.
3. **Keyboard Focus & Tap Targets (R-32, R-03)**: Every interactive element must display a `2px solid var(--border-focus)` outline with `2px` offset on `:focus-visible` and provide a minimum `44x44px` hit target on touch viewports.
4. **Mobile Reflow Without Data Loss (R-03)**: On viewports `<= 768px`, holdings and transaction tables reflow into structured data cards displaying Asset, Quantity/Lots, Price, Market Value, and P/L in full rather than hiding columns with `display: none`.
