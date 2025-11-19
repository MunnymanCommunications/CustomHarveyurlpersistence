# App Icons Directory

This directory should contain PNG app icons in the following sizes:

- icon-72.png (72x72)
- icon-96.png (96x96)
- icon-120.png (120x120)
- icon-128.png (128x128)
- icon-144.png (144x144)
- icon-152.png (152x152)
- icon-167.png (167x167)
- icon-180.png (180x180)
- icon-192.png (192x192)
- icon-256.png (256x256)
- icon-512.png (512x512)
- icon-1024.png (1024x1024) - **Required for App Store**

## Generate Icons

You can generate these from the root `favicon.svg` using ImageMagick:

```bash
cd public/icons
for size in 72 96 120 128 144 152 167 180 192 256 512 1024; do
  convert ../../favicon.svg -resize ${size}x${size} icon-${size}.png
done
```

Or use an online tool like:
- https://favicon.io/
- https://realfavicongenerator.net/

Make sure the icons have a transparent or solid background matching the app's theme (#111827).
