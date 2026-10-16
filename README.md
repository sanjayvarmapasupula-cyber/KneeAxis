# ROSA Knee Surgical Planning System — Clinical Atlas

A comprehensive full-stack prototype for patient-specific knee segmentation, 3D anatomical reconstruction, and robotic-assisted Total Knee Arthroplasty (TKA) planning.

## 📁 Directory Structure

```text
Project/
├── frontend/               # React 19 + Vite Frontend
│   ├── public/             # Static assets & public files
│   ├── index.html          # Web entry point
│   └── src/
│       ├── assets/         # Images, icons, and media
│       ├── components/     # React UI & 3D visualization components
│       │   ├── 3d/         # Three.js knee anatomy & resection plane models
│       │   ├── layout/     # Header, Sidebar, Navigation
│       │   └── ui/         # Radix / shadcn UI primitives
│       ├── contexts/       # React Context providers (ThemeContext)
│       ├── data/           # Mock clinical datasets & patient records
│       ├── hooks/          # Custom React hooks (useMobile, useComposition, etc.)
│       ├── layouts/        # Application layout wrappers (AppLayout)
│       ├── pages/          # Application views (Dashboard, Imaging, Segmentation, etc.)
│       ├── routes/         # Wouter routing system (AppRoutes)
│       ├── services/       # API client layer & data fetching
│       ├── store/          # Zustand global state stores (useAppStore)
│       ├── styles/         # Global styles & Tailwind CSS (index.css)
│       ├── types/          # Runtime type compatibility definitions
│       ├── utils/          # Helper utilities (clsx, twMerge)
│       ├── App.jsx         # Root React Application component
│       ├── const.js        # Auth & client configuration
│       └── main.jsx        # React DOM entry point
│
├── backend/                # Express.js Backend Service
│   └── src/
│       ├── routes/         # Express API route handlers
│       ├── services/       # Business logic & AI orchestration
│       ├── models/         # Data schemas & entity models
│       ├── middleware/     # Auth, error handling, and logging middleware
│       ├── utils/          # Backend utility functions
│       └── server.js       # Express server entry point
│
├── shared/                 # Code & constants shared between frontend and backend
│   └── const.js
│
├── models/                 # Deep learning model weights & AI checkpoints (3D U-Net)
├── uploads/                # Incoming DICOM CT scans & raw imaging data
├── outputs/                # Generated 3D STL/OBJ meshes & surgical plan dossiers
├── docs/                   # System reports, clinical specifications & roadmaps
├── .gitignore              # Git ignore rules
├── package.json            # Project dependencies & npm scripts
├── vite.config.js          # Vite build & proxy configuration
└── README.md               # Project documentation
```

## 🚀 Getting Started

### Development Mode
```bash
# Run the Vite Frontend dev server
npm run dev

# Or run the Backend server
npm run dev:backend
```

### Production Build & Launch
```bash
# Build frontend bundle and backend executable
npm run build

# Start production server
npm start
```
