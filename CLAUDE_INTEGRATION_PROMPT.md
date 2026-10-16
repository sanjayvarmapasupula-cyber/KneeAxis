# Prompt for Claude: Integrate the KneeAxis UI Design into My Existing Project

I have uploaded **KneeAxis_UI_Design_Package.zip**, which contains a visual HTML/CSS/JavaScript design reference, plus my existing KneeAxis React + TypeScript / Node + Express codebase.

## Goal

Integrate the **Classic Clinical Minimal** design from the ZIP across my actual existing application. Deliver a cohesive website and authenticated workspace with matching styles and shared components. Do not generate a disconnected second app.

The ZIP is a **design reference**, not a production backend. Inspect `index.html`, `assets/styles.css`, `assets/app.js`, `DESIGN_SYSTEM.md`, `README.md` and the legal/privacy checklist. The preview uses hash routes; convert those to the existing project's React Router (or current route solution). Do not copy the preview's simulated application state into production.

## Non-negotiable rules

1. **Inspect first.** Report actual existing routes, layout components, theme, backend API contracts and affected files. Provide a short file-by-file plan before changing anything.
2. **Preserve functionality.** Reuse current React code, Node/Express APIs, database configuration, auth infrastructure and patient features. No blanket rewrite. No renamed duplicate components like `DashboardNew2`.
3. **Keep AI code unchanged.** Do not train models, rewrite TensorFlow/Python, modify training scripts, model storage, segmentation label mappings or 3D reconstruction code.
4. **No demo mode, fabricated data or fake metrics.** Models remain `not_trained` until verified models and functioning inference exist. Do not invent patients, clinical accounts, alerts, 3D meshes, accuracy, Dice or approvals.
5. **No fake production claims.** KneeAxis is currently a research/preoperative decision-support prototype, not autonomous surgery or a certified medical device. Do not imply ROSA hardware connectivity or clinical validation without actual proof.
6. **Accessibility and responsiveness.** Use semantic HTML, form labels, focus indicators, keyboard navigation, mobile nav, loading/empty/error states and readable contrast.
7. **Security.** Never expose real patient information on public pages, never put secrets in client code, validate uploads in Express, enforce server-side access control and protect patient/mesh/report routes.

## Design language

- Product name: **KneeAxis**.
- Description: **AI-Assisted 3D Knee Reconstruction & Arthroplasty Planning**.
- Light backgrounds (`#F7F9FB`), white cards, dark navy typography (`#1B2C3F`), restrained teal-blue accent (`#256C83`), fine borders (`#E4EAF0`).
- Serif display headings for public-facing editorial sections; clean sans-serif everywhere else.
- Minimal shadows, 12–18px corners, consistent spacing, clean empty states.
- Remove dark flashy login screens, huge gradients, glowing panels, fake stats, irrelevant badges and developer status labels from the end-user interface.
- Apply the SAME header/footer/button/form/card language across Home, Features, Workflow, About, Contact, Privacy, Terms, Medical Disclaimer, Sign In and registration.
- Apply the SAME sidebar/topbar/cards/panels/states across all authenticated pages.

## Pages/routes to deliver

**Public layout** (shared header/footer):
- `/` Home
- `/features` Platform
- `/workflow` How It Works
- `/about` About KneeAxis
- `/contact` Contact
- `/privacy` Privacy Policy
- `/terms` Terms of Use
- `/medical-disclaimer` Medical Disclaimer

**Auth layout** (same brand and design tokens):
- `/login` Sign In
- `/register` or `/request-access` per existing authorization policy
- `/forgot-password` and reset flow only if backend actually supports them; otherwise visibly mark unavailable without faking emails

**Authenticated app layout** (consistent sidebar/topbar):
- `/app/dashboard`
- `/app/patients`, `/app/patients/:id`
- `/app/imaging`
- `/app/ai-analysis`
- `/app/reconstruction`
- `/app/planning`
- `/app/reports`
- `/app/analytics`
- `/app/settings`

If existing canonical routes differ, preserve them or provide safe redirects; do not break links.

## Behavior and data integration

- Login/register must use existing real Express authentication. Forms in the design ZIP are preview-only. Do not substitute fake users or hard-coded password checks.
- Use backend endpoints for patients, imaging, metadata, dashboard counters, search and audit. Derive statistics from real records. Zero is fine.
- Build a `ModelStatusCard` component that consumes a real model-status endpoint. Missing/unloadable weights = unavailable; don't infer readiness from file existence alone.
- AI statuses should be `Not trained`, `Loading`, `Ready`, `Failed` as the backend actually reports. Model actions disabled with meaningful copy until ready.
- 3D reconstruction page should support the future existing-segmentation (`.nii/.nii.gz`) workflow. Use existing Python reconstruction through Express; don't replace it.
- The visual 3D viewer should be empty when there is no generated mesh. Load actual STL/OBJ via existing Three.js/VTK integration if present.
- Planning, reports, analytics and audits must use real data. Do not invent HKA, mLDFA, mMPTA, Dice, KL scores, approved plans or patient outcomes.
- Give genuine loading/error/empty states on every page. Do not add decorative nonfunctional CTA controls.

## Layout component architecture

Prefer adapting existing components to this conceptual organization:

```
frontend/src/
├── layouts/
│   ├── PublicLayout.tsx
│   ├── AuthLayout.tsx
│   └── AppLayout.tsx
├── components/
│   ├── common/ (Button, Input, EmptyState, StatusBadge, LoadingState)
│   ├── marketing/ (PageHero, FeatureCard, PublicFooter)
│   └── app/ (Sidebar, Topbar, PatientSelector, WorkflowStepper, ModelStatusCard)
├── pages/
│   ├── public/ (Home, Features, Workflow, About, Contact)
│   ├── legal/ (PrivacyPolicy, TermsOfUse, MedicalDisclaimer)
│   ├── auth/ (Login, Register, ForgotPassword)
│   └── app/ (Dashboard, Patients, Imaging, AIAnalysis, Reconstruction3D, Planning, Reports, Analytics, Settings)
└── styles/ (tokens, global styles)
```

This is a **conceptual target**. Don't force-file-move working code without necessity.

## Privacy/legal requirements

Port the legal pages' layout, but the text in the ZIP is **draft template material with unresolved placeholders**. Before public deployment:
- Obtain actual legal operator, contact information, data categories, retention periods, geographic storage, cookies, processors, user rights and research approval conditions.
- Preserve visible placeholders rather than inventing facts.
- Do not assert compliance with HIPAA, GDPR or India's DPDP Act without verified legal/technical review.
- Link privacy, terms and medical disclaimer from every public footer and from account/settings contexts.
- Add a cookie banner only if necessary for cookies/trackers that really exist; do not invent cookie consent behavior.

## Validation requirements

- No old Clinical Atlas/ROSA branding in user-facing text unless describing historical research and clearly labeled.
- No fake user names, mock patient records, online indicators or AI performance scores.
- Consistent styling at desktop, laptop, tablet and phone widths.
- Functional keyboard navigation and useful accessible labels.
- Existing React, TypeScript and Express scripts still build/start.
- All links route correctly; public legal pages accessible without login.
- Protected patient and mesh endpoints enforce backend auth/authorization.
- No breakage in model training, inference contracts, Python reconstruction or storage paths.
- Draft legal placeholders are reported as remaining launch blockers.

## Work order

1. Inspect existing project and enumerate affected files.
2. Establish shared design tokens and three layouts.
3. Apply public pages and consistent footer/legal navigation.
4. Simplify login and registration UI without changing authentication contracts.
5. Apply workspace shell/sidebar/topbar.
6. Port page-level styles and empty/loading/error states to real APIs.
7. Wire status and 3D mesh pages using existing services.
8. Eliminate dead demo code and duplicate components.
9. Test navigation, build, auth, file uploads, responsive behavior and empty states.
10. Summarize implemented changes, tests run, unresolved backend items and legal-policy placeholders.

**Do not merely output a plan. After inspecting and making the agreed file-level changes, implement the UI in the existing project and verify it with the available scripts.**
