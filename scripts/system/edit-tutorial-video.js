// C:\Users\uriel\Downloads\enero 26\archivo2\scripts\system\edit-tutorial-video.js
// Edicion corta (~45s) del crudo 20261013_144011.mp4 segun la escaleta de
// scratch/backups/tutorials/crudos/gu_a_de_edici_n_din_mica_video_corto.md
// Uso: node scripts/system/edit-tutorial-video.js
// Salida: scratch/backups/tutorials/edit/erp-textil-corto-v1.mp4
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'scratch', 'backups', 'tutorials', 'crudos', '20261013_144011.mp4');
const LOGO = path.join(ROOT, 'public', 'logo.png');
const OUT_DIR = path.join(ROOT, 'scratch', 'backups', 'tutorials', 'edit');
const OUT = path.join(OUT_DIR, 'erp-textil-corto-v1.mp4');
const FONT = 'C\\:/Windows/Fonts/arial.ttf';

// [inicio, fin] en segundos + callout (ASCII seguro para drawtext)
const CLIPS = [
  { ss: 0, to: 3, text: 'Stock Centralizado - Cajas y Piezas' },
  { ss: 5, to: 9, text: 'Vista Grid B2B + Tabla Operativa' },
  { ss: 23, to: 28, text: 'Composicion, Telas y Multimedia' },
  { ss: 44, to: 53, text: 'Curvas de Talla-Color y CBM' },
  { ss: 128, to: 135, text: 'Pedidos B2B y Tipo de Cambio' },
  { ss: 148, to: 151, text: 'Seguimiento de Contenedores' },
  { ss: 166, to: 170, text: 'Control por Cajas y Packs' },
  { ss: 173, to: 180, text: 'Auditoria - Pedido vs Recibido' },
];

function banner(drawExtra) {
  return (
    'drawbox=y=ih-112:c=black@0.62:t=fill,' +
    `drawtext=fontfile=${FONT}:text='${drawExtra}':fontsize=32:fontcolor=white:x=(w-text_w)/2:y=h-84` +
    ':shadowcolor=black@0.8:shadowx=2:shadowy=2'
  );
}

function run() {
  if (!fs.existsSync(SRC)) throw new Error('No existe el crudo: ' + SRC);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ff = ffmpegInstaller.path;
  const args = [];
  // Entradas: un -ss/-t por clip sobre el mismo archivo (seek rapido de entrada)
  CLIPS.forEach((c) => {
    args.push('-ss', String(c.ss), '-t', String(c.to - c.ss), '-i', SRC);
  });
  // Entrada extra: logo para el outro de 3s
  const OUTRO_D = 3;
  args.push('-loop', '1', '-t', String(OUTRO_D), '-i', LOGO);

  const filters = CLIPS.map((c, i) => {
    let f = `[${i}:v]scale=1512:1134,crop=1440:1080,scale=960:720,setsar=1,fps=30,${banner(c.text)}`;
    if (i === 0) f += ',fade=t=in:st=0:d=0.4';
    return f + `[v${i}]`;
  });

  const li = CLIPS.length; // indice de la entrada del logo
  filters.push(
    `color=c=0x0e1526:s=960x720:d=${OUTRO_D}:r=30[bg];` +
      `[${li}:v]scale=360:-1[logo];` +
      `[bg][logo]overlay=(W-w)/2:(H-h)/2-60,` +
      `drawtext=fontfile=${FONT}:text='ERP Textil y Moda':fontsize=44:fontcolor=white:x=(w-text_w)/2:y=h-220,` +
      `drawtext=fontfile=${FONT}:text='Tu cadena de suministro bajo control':fontsize=26:fontcolor=white:x=(w-text_w)/2:y=h-160,` +
      `fade=t=out:st=${OUTRO_D - 1}:d=1[v${li}]`
  );

  const vlabels = CLIPS.map((_, i) => `[v${i}]`).join('') + `[v${li}]`;
  filters.push(`${vlabels}concat=n=${CLIPS.length + 1}:v=1:a=0,format=yuv420p[vcat]`);

  args.push(
    '-filter_complex', filters.join(';'),
    '-map', '[vcat]',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
    '-movflags', '+faststart',
    '-y', OUT
  );

  console.log('Renderizando', CLIPS.length, 'clips + outro...');
  const r = spawnSync(ff, args, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg fallo con codigo ' + r.status);
  const stat = fs.statSync(OUT);
  console.log('OK:', OUT, (stat.size / 1048576).toFixed(2) + ' MB');
}

run();
