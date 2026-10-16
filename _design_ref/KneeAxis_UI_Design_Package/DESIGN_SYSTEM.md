# KneeAxis UI Design System — “Classic Clinical Minimal”

## Design intent

Calm, timeless, legible, deliberate. The user should see a research-oriented orthopedic workspace, not a marketing landing page, developer console or flashy dashboard. Large whitespace, restrained medical teal, light backgrounds, subtle borders and editorial headings.

## Foundation

| Token | Value | Purpose |
|---|---|---|
| `--ink` | `#1B2C3F` | Primary text |
| `--ink-strong` | `#17283B` | Headings |
| `--muted` | `#68788B` | Secondary text |
| `--brand` | `#256C83` | Primary teal-blue button/link |
| `--brand-deep` | `#1D566B` | Hover and selected state |
| `--brand-wash` | `#EAF4F6` | Soft accent backgrounds |
| `--bg` | `#F7F9FB` | App/site base |
| `--surface` | `#FFFFFF` | Cards, forms |
| `--surface-alt` | `#F2F6F8` | Low-emphasis surfaces |
| `--line` | `#E4EAF0` | Borders/dividers |

Use semantic state colors sparingly; add WCAG-checked variants during React integration.

## Typography

- Body/UI: system sans-serif or Inter, 13–16 px.
- Editorial public headings: Georgia/serif, 36–51 px. App page headings: 30–32 px.
- Labels/nav: 11–13 px, semibold. No oversized all-caps blocks.
- Line height: around 1.6 for body; 1.1–1.25 for headings.
- Do not rely only on color to communicate status.

## Spacing, corners, structure

- 8px-aligned rhythm, 12–28px inner card padding.
- Containers: public max-width 1160px; dashboard content max-width 1310px.
- Cards: 12–18px radius; 1px gray borders; minimal shadow.
- Public header: 76px; footer shared across all public/auth/legal pages.
- App sidebar: 248px on desktop; horizontal scroll navigation on narrow screens.
- Preserve generous space in forms and empty states.

## Shared component language

- `Brand`, `PublicHeader`, `PublicFooter`
- `PageHero`, `SectionHeader`, `FeatureCard`, `StepCard`
- `PrimaryButton`, `SecondaryButton`, `TextButton`
- `TextField`, `SelectField`, `FormMessage`
- `WorkspaceSidebar`, `WorkspaceTopbar`, `PageHeading`
- `StatCard`, `Panel`, `EmptyState`, `StatusPill`, `DataTable`, `WorkflowStepper`
- `ModelStatusCard`, `MeshViewerPanel`, `PatientSelector`

All screens use the same core spacing, colors, typography, border treatments and component props.

## IA / routes

**Public:** `/`, `/features`, `/workflow`, `/about`, `/contact`, `/privacy`, `/terms`, `/medical-disclaimer`.

**Authentication:** `/login`, `/register` or `/request-access` according to real policy, `/forgot-password`.

**Protected app:** `/app/dashboard`, `/app/patients`, `/app/imaging`, `/app/ai-analysis`, `/app/reconstruction`, `/app/planning`, `/app/reports`, `/app/analytics`, `/app/settings`.

## Public vs protected layouts

Public/auth/legal pages share a header and footer. Auth pages use a centered minimal card. Application pages use a consistent left sidebar and topbar. Patient content must require real backend authorization, including mesh/download endpoints. No private records appear in public pages.

## Honest current implementation

- Before training: ResNet50 = `Not trained`; 3D U-Net = `Not trained`.
- 3D reconstruction may operate on existing ground-truth NIfTI segmentation independently of the model.
- Do not show predicted knee grade, segmentation Dice, patient metrics, plan approvals or charts unless backed by actual records.
- Never infer clinical readiness merely from `.h5` file presence.

## Accessibility/quality

- Keyboard navigation, visible focus, proper labels, correct input types.
- Responsive layout at 375, 768, 1024, 1366 and 1920 px.
- Form errors must be accessible and should reflect real API responses.
- Loading, empty, error and success states must be intentional and consistent.
- Avoid excessive animation; honor reduced-motion preferences in production.
