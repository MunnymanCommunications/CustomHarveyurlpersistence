# Splash Screens Directory

This directory should contain splash screen images for various iPhone models.

## Required Splash Screens:

- iphone-15-pro-max.png (1290x2796)
- iphone-15-pro.png (1179x2556)
- iphone-14-pro-max.png (1284x2778)
- iphone-14-pro.png (1170x2532)

## Design Guidelines:

- Background color: #111827 (app's theme color)
- Center the app logo
- Keep it simple and clean
- Portrait orientation only

## Generate Splash Screens

You can use the `pwa-asset-generator` tool:

```bash
npx pwa-asset-generator ../../favicon.svg . --splash-only --background "#111827"
```

Then rename the generated files to match the required names above.

Or design manually in Figma/Photoshop with the specified dimensions.
