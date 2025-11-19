#!/bin/bash

# iOS Asset Generation Script
# This script generates all required app icons and splash screens for iOS deployment

set -e

echo "🎨 Generating iOS Assets..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick is not installed. Please install it first:"
    echo "   macOS: brew install imagemagick"
    echo "   Linux: sudo apt-get install imagemagick"
    exit 1
fi

# Create directories if they don't exist
mkdir -p public/icons
mkdir -p public/splash

# Generate app icons
echo "📱 Generating app icons..."
SIZES=(72 96 120 128 144 152 167 180 192 256 512 1024)

for size in "${SIZES[@]}"; do
    echo "  Creating icon-${size}.png..."
    convert favicon.svg -resize ${size}x${size} -background none -gravity center -extent ${size}x${size} public/icons/icon-${size}.png
done

# Generate splash screens
echo "🖼️  Generating splash screens..."

# Define splash screen dimensions (width x height)
declare -A SPLASHES=(
    ["iphone-15-pro-max"]="1290x2796"
    ["iphone-15-pro"]="1179x2556"
    ["iphone-14-pro-max"]="1284x2778"
    ["iphone-14-pro"]="1170x2532"
)

# App theme color
BG_COLOR="#111827"

for name in "${!SPLASHES[@]}"; do
    dimensions="${SPLASHES[$name]}"
    width=$(echo $dimensions | cut -d'x' -f1)
    height=$(echo $dimensions | cut -d'x' -f2)

    echo "  Creating ${name}.png (${dimensions})..."

    # Create splash screen with centered logo
    # Logo will be 30% of screen width
    logo_size=$((width * 30 / 100))

    convert -size ${dimensions} xc:"${BG_COLOR}" \
            \( favicon.svg -resize ${logo_size}x${logo_size} \) \
            -gravity center -composite \
            public/splash/${name}.png
done

echo "✅ All iOS assets generated successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Review generated icons in public/icons/"
echo "2. Review generated splash screens in public/splash/"
echo "3. Customize if needed"
echo "4. Run 'npm run build' to build the app"
echo "5. Run 'npx cap add ios' to create iOS project"
echo "6. Run 'npx cap sync ios' to sync assets"
echo ""
