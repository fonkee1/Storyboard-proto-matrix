# CES 2026 Holo-Deck

## Overview
High-fidelity digital signage display with cyberpunk holographic interface. This is a React + TypeScript + Vite application designed for AI Studio, featuring a retro-futuristic holographic UI for displaying media content in a loop.

## Project Architecture

### Technology Stack
- **Frontend**: React 19.2.0 + TypeScript 5.8
- **Build Tool**: Vite 6.2.0
- **Styling**: TailwindCSS (via CDN)
- **Icons**: Lucide React
- **Backend (Optional)**: Firebase (with localStorage fallback)

### Key Features
- Holographic cyberpunk UI with glitch effects and scanlines
- Media carousel supporting images, videos, audio, and GIFs
- Admin panel for managing media and settings
- Audio visualizer with background music support
- Shuffle and sequential playback modes
- Works offline with localStorage when Firebase is not configured
- Touch and mouse wheel controls for zoom

### File Structure
```
/
├── App.tsx              # Main application component
├── index.tsx            # React entry point
├── index.html           # HTML template with TailwindCSS config
├── vite.config.ts       # Vite configuration (port 5000)
├── tsconfig.json        # TypeScript configuration
├── package.json         # Dependencies and scripts
└── metadata.json        # App metadata
```

## Configuration

### Development Server
- **Port**: 5000 (configured for Replit)
- **Host**: 0.0.0.0 (allows external access)
- **HMR**: Enabled with clientPort 5000

### Environment Variables (Optional)
- `GEMINI_API_KEY`: Optional Gemini API key (exposed via Vite define)

### Firebase Configuration (Optional)
Firebase config can be injected via `window.__firebase_config`. When not configured, the app falls back to localStorage mode.

## Running the Project

### Development
```bash
npm run dev
```
Server starts on http://0.0.0.0:5000

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Recent Changes
- **2025-11-21**: Enhanced interactivity and documentation
  - ✅ Centered robot head icon between countdown and location
  - ✅ Added swipe gesture support (swipe left to advance media)
  - ✅ Added keyboard navigation (Arrow Right or Space to advance)
  - ✅ Created SECURITY_AND_OPTIMIZATION.md guide
  - ✅ Created INTERACTIVE_EFFECTS_RECOMMENDATIONS.md with 10 effect ideas
  - Changed dev server port from 3000 to 5000
  - Configured HMR for Replit proxy support
  - Installed dependencies

## User Preferences
- None documented yet

## Notes
- This app was originally designed for AI Studio with CDN imports in production
- Development mode uses standard npm packages
- The app works in offline mode using localStorage when Firebase is not configured
- Default demo mode uses mock Firebase config for development
