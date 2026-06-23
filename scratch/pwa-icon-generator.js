// C:\Users\uriel\Downloads\enero 26\archivo2\scratch\pwa-icon-generator.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = 'C:\\Users\\uriel\\.gemini\\antigravity-ide\\brain\\2bff7df8-e14a-4167-9c1a-37df5e610efb\\app_logo_base_1782167940473.png';
const outputDir = path.join(__dirname, '../public/icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  try {
    console.log('Generating 192x192 icon...');
    await sharp(inputPath)
      .resize(192, 192)
      .toFile(path.join(outputDir, 'icon-192.png'));
    console.log('192x192 icon generated successfully.');

    console.log('Generating 512x512 icon...');
    await sharp(inputPath)
      .resize(512, 512)
      .toFile(path.join(outputDir, 'icon-512.png'));
    console.log('512x512 icon generated successfully.');

    console.log('Generating 512x512 maskable icon...');
    // For maskable icon, we resize the logo to 384x384 (75% of 512)
    // and composite it onto a background matching the base theme color,
    // or we can resize it with padding.
    // Let's first inspect the average pixel color or use a dark background color.
    // Deep dark slate background: #0c1220 or similar.
    // Let's create a solid color background of 512x512 and overlay the 384x384 resized logo.
    
    // First, let's resize the logo to 384x384
    const resizedLogoBuffer = await sharp(inputPath)
      .resize(384, 384, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    // Now composite onto a 512x512 background of the same dominant dark color.
    // We'll read the background color of the input image at corner (0,0) or just use deep dark blue #0c1322.
    // Let's use #0a0e17 which is a nice dark theme background.
    await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 10, g: 14, b: 23, alpha: 1 } // #0a0e17
      }
    })
    .composite([{
      input: resizedLogoBuffer,
      gravity: 'center'
    }])
    .toFile(path.join(outputDir, 'icon-512-maskable.png'));

    console.log('512x512 maskable icon generated successfully.');
    console.log('All icons generated in public/icons/');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
