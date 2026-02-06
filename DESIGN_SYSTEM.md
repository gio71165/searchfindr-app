# SearchFindr Design System

## Design Tokens

Centralized in `app/globals.css` under `:root` and `html.dark`.

### Colors (Dark Mode)
| Token | Value | Usage |
|-------|-------|-------|
| `--surface` | #1e293b | Card backgrounds |
| `--surface-elevated` | #334155 | Elevated surfaces |
| `--surface-muted` | #0f172a | Page background |
| `--border-default` | #334155 | Borders |
| `--text-primary` | #f8fafc | Primary text |
| `--text-muted` | #94a3b8 | Secondary/muted text |
| `--brand` | #10b981 | Primary actions, focus |
| `--success` | #22c55e | Success states |
| `--warning` | #f59e0b | Warnings |
| `--danger` | #ef4444 | Errors, destructive |

### Spacing
- `--space-1` through `--space-12` (4px base)
- `--card-padding`, `--card-padding-sm`, `--card-padding-lg`
- `--card-radius`, `--card-radius-sm`
- `--section-gap`, `--card-gap`

### Shadows
- `--shadow-card` / `--shadow-card-hover`
- `--shadow-subtle`, `--shadow-soft`, `--shadow-medium`

---

## Card Variants

Use `components/ui/Card.tsx` or CSS classes:

| Variant | Class | Use case |
|---------|-------|----------|
| default | `.card-default` | Standard content cards |
| elevated | `.card-elevated` | Interactive cards with hover |
| bordered | `.card-bordered` | Emphasis without shadow |
| alert | `.card-alert` | Red flags, warnings |
| highlight | `.card-highlight` | Next steps, CTAs |

---

## Accessibility (Contrast Audit)

### Primary Paths Verified
- **Focus indicators**: 2px solid `--brand` (#10b981) on `:focus-visible` — 4.5:1+ on dark bg
- **Text on slate-900**: `text-slate-50` (#f8fafc), `text-slate-300` (#cbd5e1), `text-slate-400` (#94a3b8) — all pass WCAG AA
- **Brand/emerald on dark**: emerald-400 (#34d399) and emerald-500 (#10b981) on slate-900 — pass AA
- **Red/amber on dark**: red-400, amber-400 on slate-900 — pass AA for large text/icons

### Touch Targets
- Minimum 44×44px for interactive elements (`.touch-target`, `min-h-[44px]`)
- Input/select/textarea `font-size: 16px` to prevent iOS zoom

### Focus
- All interactive elements get `*:focus-visible` outline (emerald, 2px, 2px offset)

---

## Responsive

- `.responsive-content`: Overflow-x hidden, safe-area padding on mobile
- Deal views: `min-w-0 overflow-hidden` on flex children to prevent horizontal scroll
- Breakpoints: Tailwind defaults (sm: 640px, md: 768px, lg: 1024px)

---

## Loading States

- `AsyncButton`: `isLoading`, `loadingText` props — shows `LoadingDots` + text
- `LoadingSpinner` / `LoadingDots`: Use for inline loading
- `Skeleton`: Use for content placeholders
