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
- Password-protected admin panel (password: "b0untyf3ttYO!")
- Dual color scheme toggle (Matrix GREEN / HOT NEON PINK)
- Audio visualizer with background music support
- **Independent audio system**: Plays all queued tracks continuously on loop until STOP button is pressed
- Shuffle and sequential playback modes
- **Decoupled systems**: Media carousel navigation operates independently from audio playback
- Interactive navigation (swipe, keyboard, mouse wheel)
- Direct-to-display loading (no blocking intro screen)
- Works offline with localStorage when Firebase is not configured

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

## Production Configuration
- **Dual-mode system**: Development uses localStorage (editable), Production uses production-config.json (locked-in)
- **Environment detection**: Automatically switches based on domain (.replit.dev = dev, .replit.app = prod)
- **Deployment**: Static hosting via `npm run build` → `dist/` directory
- **URL Management**: Edit `production-config.json` to update production media/settings, then redeploy

## Recent Changes
- **2025-11-21**: Media carousel reliability fixes and video muting
  - ✅ Fixed carousel hanging between media transitions (images, GIFs, videos)
  - ✅ Implemented safeAdvance guard to prevent double-advance race conditions
  - ✅ Added fallback timers to ensure carousel never stalls indefinitely
  - ✅ Videos now explicitly muted (both muted attribute and volume=0)
  - ✅ Robust error handling for failed media loads
  - ✅ Simplified video playback logic - uses natural autoPlay + onEnded flow
  - ✅ Added user interaction unlock for browsers that block autoplay
  - ✅ Production-ready for 24/7 operation with continuous rotation

- **2025-11-21**: Production deployment system and environment-aware configuration
  - ✅ Created production-config.json with locked-in media URLs and settings
  - ✅ Implemented dual-mode system (dev=localStorage, prod=config file)
  - ✅ Added environment detection for automatic mode switching
  - ✅ Configured static deployment (build → dist/)
  - ✅ Fixed audio playlist looping bug (tracks now play continuously)
  - ✅ Production URLs locked in for deployment at matrix-ces-display-c-0-de-b0untyf3tt.replit.app
  - ✅ Created PRODUCTION_DEPLOYMENT.md guide

- **2025-11-21**: Enhanced interactivity, theming, and user experience
  - ✅ Implemented password-protected admin access (password: "b0untyf3ttYO!")
  - ✅ Added SKIN toggle button with dual color schemes (Matrix GREEN / HOT NEON PINK)
  - ✅ Converted intro sequence to optional popup overlay (auto-dismisses, non-blocking)
  - ✅ App now loads directly to main display without requiring click-to-enter
  - ✅ CSS color mapping system for instant theme transformation
  - ✅ Centered robot head icon between countdown and location
  - ✅ Added swipe gesture support (swipe left to advance media)
  - ✅ Added keyboard navigation (Arrow Right or Space to advance)
  - ✅ **Fixed media carousel timing bugs** - removed fade transitions, timer now starts after media loads
  - ✅ **Made "UP NEXT" thumbnail clickable** - click to skip to next media, autoplay continues
  - ✅ **Added hover hint tooltips** - audio controls and UP NEXT preview show helpful hints on hover
  - ✅ **Fixed critical memory leak** - BackgroundAudio component now properly cleans up event listeners
  - ✅ **Decoupled audio and media systems** - Audio loops continuously independent of carousel navigation
  - ✅ Updated tooltips to clarify "Play all tracks on repeat" vs "Stop continuous audio loop"
  - ✅ Created SECURITY_AND_OPTIMIZATION.md guide
  - ✅ Created INTERACTIVE_EFFECTS_RECOMMENDATIONS.md with 10 effect ideas
  - ✅ Created OPTIMIZATION_GUIDE.md with comprehensive performance and deployment recommendations
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
