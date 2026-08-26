// scripts\system\generate_icons.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputPath = 'C:\\Users\\uriel\\.gemini\\antigravity-ide\\brain\\1f1656b1-9029-4e00-8252-31d8486fa9e9\\.user_uploaded\\media_1787252194731.jpg';
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
const publicDir = path.join(__dirname, '..', 'public');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

async function generate() {
  console.log('Procesando imagen fuente:', inputPath);

  // 1. Icono 512x512
  await sharp(inputPath)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(iconsDir, 'icon-512.png'));
  console.log('✓ public/icons/icon-512.png');

  // 2. Icono 192x192
  await sharp(inputPath)
    .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(iconsDir, 'icon-192.png'));
  console.log('✓ public/icons/icon-192.png');

  // 3. Icono 512x512 Maskable (con margen de seguridad del 15% para que no se corte en Android)
  const innerSize = Math.round(512 * 0.75); // 384px
  const innerBuffer = await sharp(inputPath)
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite([{ input: innerBuffer, gravity: 'center' }])
    .png()
    .toFile(path.join(iconsDir, 'icon-512-maskable.png'));
  console.log('✓ public/icons/icon-512-maskable.png');

  // 4. Logo general en public/logo.png
  await sharp(inputPath)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(publicDir, 'logo.png'));
  console.log('✓ public/logo.png');

  // 5. Apple Touch Icon (180x180)
  await sharp(inputPath)
    .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ public/apple-touch-icon.png');

  // 6. Favicon 32x32 y 48x48
  await sharp(inputPath)
    .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('✓ public/favicon.png');

  console.log('¡Todos los iconos y logos se generaron exitosamente!');
}

generate().catch(console.error);
