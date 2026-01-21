const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

async function convertSvgToPng(svgPath, pngPath, width, height) {
  try {
    await sharp(svgPath)
      .resize(width, height)
      .png()
      .toFile(pngPath);
    console.log(`✓ Generated ${pngPath} (${width}x${height})`);
  } catch (error) {
    console.error(`✗ Failed to generate ${pngPath}:`, error.message);
  }
}

async function main() {
  console.log('Generating favicon PNG files...\n');

  // Convert apple-touch-icon.svg to PNG (180x180)
  await convertSvgToPng(
    path.join(publicDir, 'apple-touch-icon.svg'),
    path.join(publicDir, 'apple-touch-icon.png'),
    180,
    180
  );

  // Convert favicon-32x32.svg to PNG (32x32)
  await convertSvgToPng(
    path.join(publicDir, 'favicon-32x32.svg'),
    path.join(publicDir, 'favicon-32x32.png'),
    32,
    32
  );

  // Convert favicon-16x16.svg to PNG (16x16)
  await convertSvgToPng(
    path.join(publicDir, 'favicon-16x16.svg'),
    path.join(publicDir, 'favicon-16x16.png'),
    16,
    16
  );

  // Convert og-image.svg to PNG (1200x630)
  await convertSvgToPng(
    path.join(publicDir, 'og-image.svg'),
    path.join(publicDir, 'og-image.png'),
    1200,
    630
  );

  console.log('\n✓ All favicon conversions complete!');
}

main().catch(console.error);
