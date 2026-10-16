# KneeAxis — Classic Medical UI Design Reference

A complete **offline-viewable UI design reference** for the KneeAxis research platform. It is intended for integration into your existing React + TypeScript frontend using Claude or another coding assistant.

## Quick preview

1. Extract `KneeAxis_UI_Design_Package.zip`.
2. Open `index.html` in Chrome/Edge. No npm installation or internet connection required.
3. Use links to navigate across public pages, legal pages, authentication screens, and the application workspace.

Routes in this self-contained preview use URLs such as `#/home`, `#/privacy`, and `#/dashboard`. **These are design-reference routes, not your production React Router configuration.**

## Included pages

**Public:** Home, Platform Features, How It Works, About, Contact, Privacy Policy, Terms of Use, Medical Disclaimer.

**Authentication:** Sign In, Register, Forgot Password.

**Application:** Dashboard, Patients, Imaging, AI Analysis, 3D Reconstruction, Knee Planning, Reports, Analytics, Settings.

## Important scope

- **Visual reference only:** No real database, authentication, image upload, AI inference, mesh rendering, or report generation is included. UI-only form submissions explicitly say they need wiring to actual endpoints.
- **No fake medical data:** The workspace is deliberately empty. AI models display **Not trained**. No fabricated Dice scores, accuracies, patients, or approvals are shown.
- **Privacy and terms are DRAFT TEMPLATES**, with bracketed placeholders. Do not publish them as final legal policies until verified against actual operations and reviewed appropriately.
- **Medical research prototype:** The UI avoids claiming clinical approval, autonomous surgery, robotic integration, or clinically validated algorithms.
- **Keep existing implementation:** `CLAUDE_INTEGRATION_PROMPT.md` explains how to port the design to your current React/Express app without disturbing Python ML training, reconstruction, databases, or working endpoints.

## Package layout

```
KneeAxis_UI_Design_Package/
├── index.html                         # offline browser preview
├── assets/
│   ├── app.js                         # preview-only navigation/page templates
│   └── styles.css                     # visual design tokens and responsive styles
├── DESIGN_SYSTEM.md                   # colors, typography, layout, components
├── CLAUDE_INTEGRATION_PROMPT.md       # paste this into Claude with your codebase
├── docs/
│   └── LEGAL_AND_PRIVACY_CHECKLIST.md # what legal pages must be verified
└── README.md
```

## Recommended integration order

1. Have Claude inspect your existing project: do not generate a second app.
2. Port tokens, `PublicLayout`, `AuthLayout`, `AppLayout`, reusable cards and form components.
3. Apply design consistently across existing routes.
4. Connect forms and data to real Express endpoints; implement authorization **in the backend**, not merely by hiding UI links.
5. Keep AI status `not_trained` until model files are verified through actual inference.
6. Review privacy/terms wording and test accessibility and responsiveness.

Use the same color tokens and component properties on every page. Avoid marketing gradients, noisy panels, fake accounts or demo mode.
