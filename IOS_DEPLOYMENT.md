# iOS App Store Deployment Guide

This guide will help you deploy the Ai Architect web application to the iOS App Store using Capacitor.

## Prerequisites

- macOS with Xcode installed (version 14.0 or later)
- Apple Developer Account ($99/year)
- Node.js 20.19.0 or later
- CocoaPods installed (`sudo gem install cocoapods`)

## Step 1: Install Dependencies

```bash
npm install
```

This will install all necessary dependencies including Capacitor iOS.

## Step 2: Generate App Icons

You need to generate PNG app icons from the existing `favicon.svg`. Use an online tool or script to create the following sizes:

### Required Icon Sizes:
- 72x72 → `/public/icons/icon-72.png`
- 96x96 → `/public/icons/icon-96.png`
- 120x120 → `/public/icons/icon-120.png`
- 128x128 → `/public/icons/icon-128.png`
- 144x144 → `/public/icons/icon-144.png`
- 152x152 → `/public/icons/icon-152.png`
- 167x167 → `/public/icons/icon-167.png`
- 180x180 → `/public/icons/icon-180.png`
- 192x192 → `/public/icons/icon-192.png`
- 256x256 → `/public/icons/icon-256.png`
- 512x512 → `/public/icons/icon-512.png`
- 1024x1024 → `/public/icons/icon-1024.png` (App Store requirement)

### Recommended Tools:
- **Online**: [favicon.io](https://favicon.io/) or [realfavicongenerator.net](https://realfavicongenerator.net/)
- **CLI**: Use ImageMagick or similar tools to batch convert

```bash
# Example using ImageMagick
mkdir -p public/icons
for size in 72 96 120 128 144 152 167 180 192 256 512 1024; do
  convert favicon.svg -resize ${size}x${size} public/icons/icon-${size}.png
done
```

## Step 3: Generate Splash Screens

Create splash screens for various iPhone models:

### Required Splash Screen Sizes:
- 1290x2796 → `/public/splash/iphone-15-pro-max.png`
- 1179x2556 → `/public/splash/iphone-15-pro.png`
- 1284x2778 → `/public/splash/iphone-14-pro-max.png`
- 1170x2532 → `/public/splash/iphone-14-pro.png`

Background should be `#111827` (the app's theme color) with the app logo centered.

### Recommended Tools:
- Use [pwa-asset-generator](https://github.com/onderceylan/pwa-asset-generator)
- Or design manually in Figma/Photoshop

```bash
npx pwa-asset-generator favicon.svg ./public/splash --splash-only --background "#111827"
```

## Step 4: Build the Web App

```bash
npm run build
```

This compiles the React app and creates optimized production files in the `dist` folder.

## Step 5: Initialize Capacitor iOS Project

```bash
npx cap add ios
```

This creates an `ios` folder with the native Xcode project.

## Step 6: Sync Web Assets to iOS

```bash
npx cap sync ios
```

This copies your built web app into the iOS project.

## Step 7: Configure iOS Project in Xcode

```bash
npm run ios:open
```

This opens the project in Xcode. You'll need to:

### 7.1 Set Bundle Identifier
- Select the project in the navigator
- Under "Signing & Capabilities", set your unique bundle ID (e.g., `com.yourcompany.aiarchitect`)

### 7.2 Configure Signing
- Select your development team
- Enable "Automatically manage signing"

### 7.3 Add Required Permissions

The app needs microphone access for voice features. Add to `ios/App/App/Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>This app requires microphone access to enable voice conversations with the AI assistant.</string>
<key>NSCameraUsageDescription</key>
<string>This app may need camera access for certain features.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>This app may need access to your photo library to upload images.</string>
```

### 7.4 Set App Icons in Xcode
- Go to `Assets.xcassets` → `AppIcon`
- Drag and drop your 1024x1024 icon (Xcode will generate other sizes)

### 7.5 Configure Launch Screen
- Edit `LaunchScreen.storyboard` to match your app's branding

## Step 8: Test on Simulator

In Xcode:
1. Select a simulator (e.g., iPhone 15 Pro)
2. Click the Play button or press Cmd+R
3. Test all features, especially:
   - Microphone/voice input
   - Navigation
   - Authentication
   - Data persistence

## Step 9: Test on Physical Device

1. Connect your iPhone via USB
2. Select your device in Xcode
3. Click Run
4. Trust the developer certificate on your iPhone (Settings → General → Device Management)

## Step 10: Prepare for App Store Submission

### 10.1 Update Version and Build Number
- In Xcode, increment the version (e.g., 1.0.0)
- Increment build number (e.g., 1)

### 10.2 Create App Store Connect Listing
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create a new app
3. Fill in metadata:
   - App name: "Ai Architect"
   - Subtitle: "Your AI Voice Assistant"
   - Description: Use the description from `manifest.json`
   - Keywords: AI, voice assistant, productivity
   - Category: Productivity
   - Screenshots: Take screenshots from simulator/device

### 10.3 Archive and Upload
1. In Xcode: Product → Archive
2. Once archived, click "Distribute App"
3. Select "App Store Connect"
4. Follow the wizard to upload

### 10.4 Submit for Review
1. In App Store Connect, select your app
2. Add required information:
   - Privacy policy URL
   - Support URL
   - Age rating
3. Submit for review

## Step 11: Ongoing Updates

When you make changes to the web app:

```bash
# 1. Make your changes to React code
# 2. Build the web app
npm run build

# 3. Sync to iOS
npx cap sync ios

# 4. Open in Xcode and test
npm run ios:open

# 5. Archive and upload new version
```

## Environment Variables

Make sure to set these in your deployment environment:
- `VITE_API_KEY` - Google Gemini API key
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

These can be configured in Xcode build settings or through Capacitor configuration.

## Troubleshooting

### Build Fails
- Ensure Xcode is up to date
- Clean build folder: Product → Clean Build Folder
- Delete derived data: Xcode → Preferences → Locations → Derived Data → Delete

### White Screen on Launch
- Check console in Safari Web Inspector
- Verify all environment variables are set
- Check network requests for failed API calls

### Microphone Not Working
- Verify Info.plist has `NSMicrophoneUsageDescription`
- Check device permissions: Settings → Privacy → Microphone

### App Rejected by Apple
- Common issues:
  - Missing privacy policy
  - Incomplete metadata
  - Crash on launch
  - Missing required permissions descriptions

## Resources

- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

## Support

For issues specific to this app, create an issue in the GitHub repository.
For Capacitor issues, visit [Capacitor Discussions](https://github.com/ionic-team/capacitor/discussions).
