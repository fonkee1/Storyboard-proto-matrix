# Production Deployment Guide

## 🚀 How Production URLs Work

Your CES 2026 Holo-Deck now has a **dual-mode configuration system**:

### Development Mode (replit.dev domains)
- Loads media and settings from **localStorage**
- Fully editable via the Admin Panel
- Changes persist in browser storage
- Great for testing and iteration

### Production Mode (replit.app deployed domains)
- Loads media and settings from **production-config.json** (locked-in)
- Admin panel still accessible but changes are **session-only**
- Guaranteed consistent display across all viewers
- Perfect for 24/7 digital signage at CES 2026

## 📋 Current Production Configuration

**Locked-in URLs** (deployed to `https://matrix-ces-display-c-0-de-b0untyf3tt.replit.app/`):

### Media Playlist (7 items)
1. BeUnique Logo (IMAGE, 5s)
2. Cyberpunk LED Grid (VIDEO, 10s)
3. CES-2026 GIF (IMAGE, 5s)
4. Digital Rain Loop (VIDEO, 5s)
5. Cyberpunk City Neon (VIDEO, 5s)
6. BeUniq Blue Logo (IMAGE, 5s)
7. Cyberpunk LED Grid (VIDEO, 10s)

### Global Settings
- **Marquee Text**: "HACKED BY BE UNIQUE EXHIBITS"
- **Logo URL**: BeUnique_Logo.png
- **Audio Channels**: 3 background music tracks (continuous loop)

## 🔧 How to Update Production URLs

### Option 1: Edit Config File (Recommended)
1. Open `production-config.json` in your Replit workspace
2. Update URLs, durations, or settings
3. Click **Deploy** button in Replit to republish
4. Changes go live within ~30 seconds

### Option 2: Development → Production Sync
1. Edit media/settings in **development** admin panel
2. Export your localStorage data (browser console):
   ```javascript
   console.log(JSON.stringify({
     media: JSON.parse(localStorage.getItem('ces_media_ces-2026-demo')),
     settings: JSON.parse(localStorage.getItem('ces_settings_ces-2026-demo'))
   }, null, 2))
   ```
3. Copy output and update `production-config.json`
4. Redeploy

## 🔒 Important Notes

### Security
- ✅ Admin password (`b0untyf3ttYO!`) is **NOT** in the config file
- ✅ Password remains in compiled code (not publicly visible)
- ✅ Config only contains public media URLs

### Admin Panel Behavior in Production
- Admin panel still works on production domain
- Changes persist **only in that browser session**
- Refreshing the page reloads locked-in config
- Use this for quick testing, then update config file for permanent changes

### Deployment Process
1. Build command: `npm run build`
2. Output directory: `dist/`
3. Deployment target: Static hosting (CDN)
4. Config file automatically bundled with build

## 📊 Environment Detection

The app automatically detects which mode to use:

```javascript
// Production domains (loads production-config.json):
- *.replit.app
- *.repl.co
- Custom domains (non-localhost, non-replit.dev)

// Development domains (loads localStorage):
- localhost
- *.replit.dev
```

## 🎯 Recommended Workflow

1. **Test in Development**: Use admin panel to experiment with media/settings
2. **Lock in Production**: Copy final config to `production-config.json`
3. **Deploy**: Click Deploy button in Replit
4. **Verify**: Check deployed URL to confirm locked-in URLs are active
5. **Monitor**: Production display shows consistent media 24/7

## 🔮 Future Enhancements

If you need **permanent edits on production** without redeploying:
- Enable Firebase integration (already in code, just needs config)
- Use Replit Database for persistent cloud storage
- Both options allow real-time updates without rebuilding

---

**Questions?** The dual-mode system ensures you can iterate freely in development while maintaining rock-solid stability in production.
