# iOS App Store - Quick Start Guide

Ready to deploy **Ai Architect** to the iOS App Store? Follow these steps:

## Prerequisites Checklist

- [ ] macOS with Xcode 14.0+ installed
- [ ] Active Apple Developer Account
- [ ] Node.js 20.19.0+ installed
- [ ] CocoaPods installed (`sudo gem install cocoapods`)
- [ ] ImageMagick installed (`brew install imagemagick`)

## Quick Setup (5 Steps)

### 1️⃣ Install Dependencies

```bash
npm install
```

### 2️⃣ Generate App Assets

```bash
./scripts/generate-ios-assets.sh
```

This creates all required app icons and splash screens from `favicon.svg`.

### 3️⃣ Build the Web App

```bash
npm run build
```

### 4️⃣ Initialize iOS Project

```bash
# First time only
npx cap add ios

# Every time you update the web app
npx cap sync ios
```

### 5️⃣ Open in Xcode

```bash
npm run ios:open
```

## In Xcode

1. **Set Bundle ID**: Select project → Signing & Capabilities → Set unique ID (e.g., `com.yourcompany.aiarchitect`)
2. **Select Team**: Choose your Apple Developer team
3. **Add Permissions**: Already configured in `Info.plist` (microphone, camera, photos)
4. **Set App Icon**: Go to Assets → AppIcon → Add your 1024x1024 icon
5. **Test**: Select simulator/device → Press Run (⌘R)

## Submit to App Store

1. **Archive**: Product → Archive in Xcode
2. **Upload**: Distribute App → App Store Connect
3. **App Store Connect**: Fill in metadata, screenshots, descriptions
4. **Submit**: Submit for review

## For Updates

```bash
# Make changes to your React code
npm run build
npx cap sync ios
npm run ios:open
# Archive and upload new version
```

## Need Help?

See [IOS_DEPLOYMENT.md](./IOS_DEPLOYMENT.md) for detailed instructions and troubleshooting.

## Important Configuration Files

- `capacitor.config.ts` - Capacitor/iOS configuration
- `manifest.json` - PWA manifest with app icons
- `index.html` - iOS meta tags and splash screens
- `package.json` - iOS build scripts

## Environment Variables Required

Set these in Xcode build settings or `.env` file:

- `VITE_API_KEY` - Your Google Gemini API key
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

---

**App Name**: Ai Architect
**Bundle ID**: com.aiarchitect.app (change this!)
**Version**: 0.1.0
**Category**: Productivity

Good luck with your App Store submission! 🚀
