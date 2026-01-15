# OG Image Conversion

The OG image has been created as `og-image.svg`. To use it for social media sharing, you need to convert it to PNG format (1200x630px).

## Quick Conversion Options:

### Option 1: Online Converter
1. Visit https://svgtopng.com/ or https://convertio.co/svg-png/
2. Upload `og-image.svg`
3. Set dimensions to 1200x630
4. Download and save as `og-image.png` in the `public` folder

### Option 2: Using ImageMagick (if installed)
```bash
magick convert -background none -resize 1200x630 og-image.svg og-image.png
```

### Option 3: Using Node.js (requires sharp package)
```bash
npm install --save-dev sharp
node -e "const sharp = require('sharp'); sharp('public/og-image.svg').resize(1200, 630).png().toFile('public/og-image.png');"
```

### Option 4: Using Inkscape (if installed)
```bash
inkscape --export-type=png --export-width=1200 --export-height=630 public/og-image.svg --export-filename=public/og-image.png
```

Once converted, the metadata in `app/layout.tsx` will automatically use the PNG file for social media sharing.
