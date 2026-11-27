/**
 * =============================================================================
 * BINARY, 3D & DOCUMENT FORMAT ADAPTERS (adapters/binaryAdapters.js)
 * =============================================================================
 * Upgraded Layout:
 *   - Every binary diagram aligns blocks LEFT-TO-RIGHT in exact Byte Order
 *     from Byte 0 -> EOF (`@0`, `@8`, `@33`...) along the TOP row (Backend File),
 *     connected by translation arrows down to the BOTTOM row (Frontend Output)!
 *   - Outer `<g transform="translate(x, y)">` keeps every block locked in place.
 * =============================================================================
 */

import { wrapSvg, drawPartCard, drawWire, drawLayerHeader, toHexSlice } from '../core/svgBuilder.js';

function readAscii(bytes, start, len) {
  let out = '';
  for (let i = start; i < start + len && i < bytes.length; i++) {
    const c = bytes[i];
    out += c >= 32 && c <= 126 ? String.fromCharCode(c) : '.';
  }
  return out;
}

// =============================================================================
// 1. PNG BINARY CHUNK PARSER (.png)
// =============================================================================
export function parsePngBinary(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const chunks = [];
  let width = 0, height = 0, bitDepth = 8, colorType = 2;

  let pos = 8;
  while (pos + 12 <= bytes.length && chunks.length < 12) {
    const length = view.getUint32(pos, false);
    const type = readAscii(bytes, pos + 4, 4);
    if (type === 'IHDR' && pos + 21 <= bytes.length) {
      width = view.getUint32(pos + 8, false);
      height = view.getUint32(pos + 12, false);
      bitDepth = bytes[pos + 16];
      colorType = bytes[pos + 17];
    }
    chunks.push({ type, length, offset: pos, hex: toHexSlice(bytes, pos, 10) });
    pos += 12 + length;
    if (type === 'IEND') break;
  }

  let inner = drawLayerHeader({ x: 20, y: 20, label: 'BACKEND FILE ON DISK (EXACT BYTE ORDER 0 -> EOF)', color: '#fbbf24' });
  inner += drawPartCard({
    id: 'part_png_sig',
    x: 20,
    y: 32,
    w: 165,
    h: 82,
    title: 'PNG Signature',
    subtitle: toHexSlice(bytes, 0, 5),
    badge: 'BYTES 0..7',
    color: '#ff4b4b',
  });

  const chunkIds = [];
  const wireIds = [];
  chunks.slice(0, 3).forEach((ch, idx) => {
    const id = `part_png_c_${idx}`;
    const wid = `wire_png_${idx}`;
    chunkIds.push(`#${id}`);
    wireIds.push(`#${wid}`);
    const cx = 205 + idx * 165;
    const sub = ch.type === 'IHDR' ? `${width}x${height}px ${bitDepth}b` : `${ch.length} B payload`;
    inner += drawPartCard({
      id,
      x: cx,
      y: 32,
      w: 145,
      h: 82,
      title: `Chunk: ${ch.type}`,
      subtitle: sub,
      badge: `BYTE @${ch.offset}`,
      color: ch.type === 'IHDR' ? '#38bdf8' : ch.type === 'IDAT' ? '#34d399' : '#a855f7',
    });
    inner += drawWire({ id: wid, points: `${cx - 20},73 ${cx},73`, color: '#38bdf8' });
  });

  inner += drawLayerHeader({ x: 20, y: 144, label: 'FRONTEND IMAGE VIEWER (DECODED PIXELS)', color: '#34d399' });
  inner += drawWire({ id: 'wire_png_decode', points: '350,114 350,156', color: '#34d399' });

  const blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
  inner += `
    <g transform="translate(20, 156)">
      <g id="part_png_preview" class="file-part" style="transform-box: fill-box; transform-origin: center;">
        <rect width="660" height="92" rx="10" fill="#06080d" stroke="#34d399" stroke-width="1.8" />
        <image href="${blobUrl}" x="16" y="14" width="64" height="64" style="image-rendering:pixelated;" />
        <text x="98" y="38" fill="#f8fafc" font-family="system-ui" font-size="13" font-weight="700">Browser Decoded Canvas (${width} × ${height} px)</text>
        <text x="98" y="60" fill="#94a3b8" font-family="monospace" font-size="10.5">File Size: ${bytes.length} B | ColorType: ${colorType} | BitDepth: ${bitDepth}</text>
      </g>
    </g>
  `;

  const rawTokens = [
    { id: 'png_sig', label: 'Magic Bytes @0', text: toHexSlice(bytes, 0, 8) },
    ...chunks.slice(0, 4).map((c, idx) => ({
      id: `png_c_${idx}`,
      label: `${c.type} @${c.offset}`,
      text: `${c.hex} (${c.length}B)`,
    })),
  ];

  return {
    formatId: 'png',
    title: 'PNG Image Binary (.png)',
    badge: 'Binary Chunks',
    ast: { width, height, bitDepth, colorType, chunks },
    svgMarkup: wrapSvg(705, 270, inner),
    rawTokens,
    cleanupUrls: [blobUrl],
    steps: [
      {
        title: '1. Byte 0–7: The Secret Handshake',
        kidText: 'Any photo app is just a Frontend! When it opens a .png file, it checks the first 8 bytes (89 50 4E 47) to confirm: "Yes, this really is a PNG picture!"',
        engText: 'Bytes 0..7 are fixed (`0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A`) to catch corruption before reading chunk lengths.',
        highlightIds: ['#part_png_sig'],
        wireIds: [],
        tokenIds: ['png_sig'],
      },
      {
        title: '2. Byte @8: IHDR Sets the Canvas Size',
        kidText: 'Next in line is the IHDR train car—telling the image viewer exact pixel width, height, and color depth before any pixels arrive!',
        engText: 'DataView reads Big-Endian uint32 width/height inside `IHDR` immediately after the 8-byte signature.',
        highlightIds: [chunkIds[0], '#part_png_preview'].filter(Boolean),
        wireIds: [wireIds[0]].filter(Boolean),
        tokenIds: ['png_c_0'],
      },
      {
        title: '3. IDAT Pixel Cargo -> Decoded Image',
        kidText: 'The IDAT car holds compressed pixel colors, and IEND closes the train. Your browser inflates IDAT and paints the picture below!',
        engText: 'Zlib-compressed `IDAT` scanlines decompress into RGBA pixels; `IEND` terminates the chunk loop.',
        highlightIds: ['#part_png_sig', ...chunkIds, '#part_png_preview'],
        wireIds: [...wireIds, '#wire_png_decode'],
        tokenIds: rawTokens.map((t) => t.id),
      },
    ],
  };
}

// =============================================================================
// 2. JPEG BINARY MARKER SCANNER (.jpg / .jpeg)
// =============================================================================
export function parseJpegBinary(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const markers = [];
  let width = 0, height = 0;

  let i = 0;
  while (i + 1 < bytes.length && markers.length < 10) {
    if (bytes[i] === 0xff && bytes[i + 1] !== 0x00 && bytes[i + 1] !== 0xff) {
      const m = bytes[i + 1];
      const names = { 0xd8: 'SOI', 0xe0: 'APP0', 0xe1: 'EXIF', 0xdb: 'DQT', 0xc0: 'SOF0', 0xc4: 'DHT', 0xda: 'SOS', 0xd9: 'EOI' };
      const name = names[m] || `0x${m.toString(16).toUpperCase()}`;
      markers.push({ name, code: `FF ${m.toString(16).toUpperCase().padStart(2, '0')}`, offset: i });

      if (m === 0xd8 || m === 0xd9) {
        i += 2;
      } else if (i + 3 < bytes.length) {
        const segLen = view.getUint16(i + 2, false);
        if (m === 0xc0 && i + 8 < bytes.length) {
          height = view.getUint16(i + 5, false);
          width = view.getUint16(i + 7, false);
        }
        if (m === 0xda) break;
        i += 2 + Math.max(2, segLen);
      } else {
        break;
      }
    } else {
      i++;
    }
  }

  let inner = drawLayerHeader({ x: 20, y: 20, label: 'BACKEND JPEG MARKER STREAM (0xFF SEGMENTS IN BYTE ORDER)', color: '#fbbf24' });
  const partIds = [];
  const wireIds = [];
  markers.slice(0, 4).forEach((mk, idx) => {
    const id = `part_jpg_${idx}`;
    partIds.push(`#${id}`);
    const x = 20 + idx * 170;
    inner += drawPartCard({
      id,
      x,
      y: 32,
      w: 152,
      h: 82,
      title: `${mk.name} (${mk.code})`,
      subtitle: mk.name === 'SOF0' && width ? `${width}×${height} px` : `Byte @${mk.offset}`,
      badge: `BYTE @${mk.offset}`,
      color: idx === 0 ? '#ff4b4b' : idx === 1 ? '#38bdf8' : '#f59e0b',
    });
    if (idx > 0) {
      const wid = `wire_jpg_${idx}`;
      wireIds.push(`#${wid}`);
      inner += drawWire({ id: wid, points: `${x - 18},73 ${x},73`, color: '#38bdf8' });
    }
  });

  inner += drawLayerHeader({ x: 20, y: 144, label: 'FRONTEND PHOTO APP (DECODED 8×8 DCT BLOCKS)', color: '#34d399' });
  inner += drawWire({ id: 'wire_jpg_decode', points: '350,114 350,156', color: '#34d399' });

  const blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
  inner += `
    <g transform="translate(20, 156)">
      <g id="part_jpg_preview" class="file-part" style="transform-box: fill-box; transform-origin: center;">
        <rect width="662" height="92" rx="10" fill="#06080d" stroke="#34d399" stroke-width="1.8" />
        <image href="${blobUrl}" x="16" y="14" width="64" height="64" />
        <text x="98" y="38" fill="#f8fafc" font-family="system-ui" font-size="13" font-weight="700">Rendered JPEG Photo (${width || '?'} × ${height || '?'} px)</text>
        <text x="98" y="60" fill="#94a3b8" font-family="monospace" font-size="10.5">Markers: ${markers.map((m) => m.name).join(' → ')} | ${bytes.length} B</text>
      </g>
    </g>
  `;

  const rawTokens = markers.map((mk, idx) => ({
    id: `jpg_m_${idx}`,
    label: `${mk.name} @${mk.offset}`,
    text: `${mk.code} (offset ${mk.offset})`,
  }));

  return {
    formatId: 'jpg',
    title: 'JPEG Binary Markers (.jpg)',
    badge: 'FF Marker Stream',
    ast: { width, height, markers },
    svgMarkup: wrapSvg(705, 270, inner),
    rawTokens,
    cleanupUrls: [blobUrl],
    steps: [
      {
        title: '1. Start Marker (FF D8) & Camera Tag (APP0)',
        kidText: 'Every JPEG starts with FF D8 ("Begin Picture!") followed by APP0/EXIF metadata like camera settings.',
        engText: 'JPEG readers scan `0xFF` marker bytes sequentially: `0xFFD8` (SOI) and `0xFFE0/E1` (APP0/EXIF).',
        highlightIds: [partIds[0], partIds[1]].filter(Boolean),
        wireIds: [wireIds[0]].filter(Boolean),
        tokenIds: rawTokens.slice(0, 2).map((t) => t.id),
      },
      {
        title: '2. Compression Tables -> Rendered Photo',
        kidText: 'Next come DQT math tables and SOS compressed pixel data—which your photo app decodes into the picture below!',
        engText: 'DQT quantization + SOF0 frame dimensions + DHT Huffman tables decode the `SOS` entropy stream.',
        highlightIds: [...partIds, '#part_jpg_preview'],
        wireIds: [...wireIds, '#wire_jpg_decode'],
        tokenIds: rawTokens.map((t) => t.id),
      },
    ],
  };
}

// =============================================================================
// 3. WAV / RIFF AUDIO BINARY PARSER (.wav)
// =============================================================================
export function parseWavBinary(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const riff = readAscii(bytes, 0, 4);
  const wave = readAscii(bytes, 8, 4);
  const channels = bytes.length >= 24 ? view.getUint16(22, true) : 1;
  const sampleRate = bytes.length >= 28 ? view.getUint32(24, true) : 8000;
  const bitsPerSample = bytes.length >= 36 ? view.getUint16(34, true) : 8;

  const wavePoints = [];
  const sampleStart = 44;
  const count = Math.min(80, Math.max(8, bytes.length - sampleStart));
  for (let i = 0; i < count; i++) {
    const val = bytes[sampleStart + i] ?? 128;
    const x = 20 + (i / (count - 1)) * 620;
    const y = 52 + ((val - 128) / 128) * 32;
    wavePoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  let inner = drawLayerHeader({ x: 20, y: 20, label: 'BACKEND WAV HEADER & SAMPLES (BYTES 0 -> 44+)', color: '#fbbf24' });
  inner += drawPartCard({ id: 'part_wav_riff', x: 20, y: 32, w: 200, h: 82, title: `${riff} / ${wave}`, subtitle: `Size: ${bytes.length} bytes`, badge: 'BYTES 0..11', color: '#ff4b4b' });
  inner += drawPartCard({ id: 'part_wav_fmt', x: 245, y: 32, w: 215, h: 82, title: 'Chunk: "fmt "', subtitle: `${sampleRate}Hz | ${channels}ch | ${bitsPerSample}b`, badge: 'BYTES 12..35', color: '#38bdf8' });
  inner += drawPartCard({ id: 'part_wav_data', x: 485, y: 32, w: 195, h: 82, title: 'Chunk: "data"', subtitle: `${Math.max(0, bytes.length - 44)} PCM samples`, badge: 'BYTE @36+', color: '#34d399' });

  inner += drawWire({ id: 'wire_wav_1', points: '220,73 245,73', color: '#38bdf8' });
  inner += drawWire({ id: 'wire_wav_2', points: '460,73 485,73', color: '#34d399' });
  inner += drawWire({ id: 'wire_wav_play', points: '582,114 582,156', color: '#34d399' });

  inner += drawLayerHeader({ x: 20, y: 144, label: 'FRONTEND AUDIO PLAYER (PCM WAVEFORM OUTPUT)', color: '#34d399' });
  inner += `
    <g transform="translate(20, 156)">
      <g id="part_wav_wave" class="file-part" style="transform-box: fill-box; transform-origin: center;">
        <rect width="660" height="102" rx="10" fill="#06080d" stroke="#34d399" stroke-width="1.8" />
        <polyline id="wire_wav_signal" class="file-wire" points="${wavePoints.join(' ')}" fill="none" stroke="#34d399" stroke-width="2.8" stroke-dasharray="6 3" />
      </g>
    </g>
  `;

  const rawTokens = [
    { id: 'wav_riff', label: 'RIFF @0', text: `${toHexSlice(bytes, 0, 12)} ("${riff}..${wave}")` },
    { id: 'wav_fmt', label: 'fmt @12', text: `${sampleRate}Hz, ${channels}ch, ${bitsPerSample}-bit` },
    { id: 'wav_data', label: 'data @44+', text: toHexSlice(bytes, 44, 16) },
  ];

  return {
    formatId: 'wav',
    title: 'WAV / RIFF Audio (.wav)',
    badge: 'PCM Binary',
    ast: { riff, wave, channels, sampleRate, bitsPerSample },
    svgMarkup: wrapSvg(705, 280, inner),
    rawTokens,
    steps: [
      {
        title: '1. Bytes 0–11: RIFF / WAVE Container',
        kidText: 'Any music player is a Frontend! Bytes 0–11 spell "RIFF" and "WAVE" so the player knows uncompressed sound lives inside.',
        engText: 'Bytes 0..11 store `"RIFF"` magic, LE uint32 file size, and `"WAVE"` form type.',
        highlightIds: ['#part_wav_riff'],
        wireIds: ['#wire_wav_1'],
        tokenIds: ['wav_riff'],
      },
      {
        title: '2. Bytes 12–35: Sample Rate Rules ("fmt ")',
        kidText: 'Next, the "fmt " block tells your speaker how many thousand times per second to vibrate!',
        engText: '`fmt ` subchunk encodes PCM format, channel count (@22), sample rate (@24), and bit depth (@34).',
        highlightIds: ['#part_wav_fmt'],
        wireIds: ['#wire_wav_2'],
        tokenIds: ['wav_fmt'],
      },
      {
        title: '3. Byte 44+: Raw Sound Wave Played by App',
        kidText: 'Every byte after byte 44 draws the actual sound wave that vibrates your headphones!',
        engText: 'Raw PCM amplitude bytes from offset 44+ render directly as the acoustic waveform.',
        highlightIds: ['#part_wav_data', '#part_wav_wave'],
        wireIds: ['#wire_wav_play', '#wire_wav_signal'],
        tokenIds: ['wav_data'],
      },
    ],
  };
}

// =============================================================================
// 4. MP3 ID3v2 + MPEG FRAME PARSER (.mp3)
// =============================================================================
export function parseMp3Binary(buffer) {
  const bytes = new Uint8Array(buffer);
  const hasId3 = readAscii(bytes, 0, 3) === 'ID3';
  const id3Ver = hasId3 ? `v2.${bytes[3]}.${bytes[4]}` : 'None';
  const id3Size = hasId3
    ? ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) | ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f)
    : 0;

  let syncOffset = -1;
  for (let i = hasId3 ? 10 + id3Size : 0; i + 3 < bytes.length; i++) {
    if (bytes[i] === 0xff && (bytes[i + 1] & 0xe0) === 0xe0) {
      syncOffset = i;
      break;
    }
  }
  const songTitle = hasId3 ? readAscii(bytes, 14, 12).replace(/\./g, '') : 'Track';

  let inner = drawLayerHeader({ x: 20, y: 20, label: 'BACKEND MP3 BYTES ON DISK (BYTE 0 -> STREAM)', color: '#fbbf24' });
  inner += drawPartCard({ id: 'part_mp3_id3', x: 20, y: 32, w: 205, h: 82, title: `ID3 Tag (${id3Ver})`, subtitle: `Title/Artist (${id3Size} B)`, badge: 'BYTES 0..25', color: '#a855f7' });
  inner += drawPartCard({ id: 'part_mp3_sync', x: 250, y: 32, w: 205, h: 82, title: 'MPEG Sync (0xFFE)', subtitle: syncOffset >= 0 ? `Header @ byte ${syncOffset}` : 'Sync Frame', badge: `BYTE @${Math.max(0, syncOffset)}`, color: '#ff4b4b' });
  inner += drawPartCard({ id: 'part_mp3_frames', x: 480, y: 32, w: 200, h: 82, title: 'Audio Packets', subtitle: 'Compressed Sound Frames', badge: 'PAYLOAD STREAM', color: '#34d399' });

  inner += drawWire({ id: 'wire_mp3_1', points: '225,73 250,73', color: '#a855f7' });
  inner += drawWire({ id: 'wire_mp3_2', points: '455,73 480,73', color: '#34d399' });

  inner += drawLayerHeader({ x: 20, y: 144, label: 'FRONTEND MUSIC PLAYER (SPOTIFY / VLC / BROWSER)', color: '#38bdf8' });
  inner += drawWire({ id: 'wire_mp3_ui', points: '122,114 122,156', color: '#a855f7' });
  inner += drawWire({ id: 'wire_mp3_aud', points: '580,114 580,156', color: '#34d399' });
  inner += drawPartCard({
    id: 'part_mp3_player',
    x: 20,
    y: 156,
    w: 660,
    h: 82,
    title: `Now Playing: "${songTitle || 'XRay_Song'}"`,
    subtitle: `UI Title comes from ID3 (@0) | Audio comes from MPEG Frames (@${Math.max(0, syncOffset)})`,
    badge: 'FRONTEND PLAYER',
    color: '#38bdf8',
  });

  const rawTokens = [
    { id: 'mp3_id3', label: 'ID3v2 @0', text: toHexSlice(bytes, 0, 10) + ` (ID3 ${id3Ver})` },
    { id: 'mp3_sync', label: `Sync @${Math.max(0, syncOffset)}`, text: syncOffset >= 0 ? toHexSlice(bytes, syncOffset, 4) : '0xFF 0xFB' },
  ];

  return {
    formatId: 'mp3',
    title: 'MP3 Audio Binary (.mp3)',
    badge: 'ID3 + MPEG',
    ast: { hasId3, id3Ver, id3Size, syncOffset, songTitle },
    svgMarkup: wrapSvg(705, 265, inner),
    rawTokens,
    steps: [
      {
        title: '1. Byte 0: The Song Sticker (ID3v2)',
        kidText: 'Your music app reads the very first bytes ("ID3") to show the song title on screen—before decoding a single note of music!',
        engText: 'ID3v2 starts with `"ID3"`, version bytes, and a 28-bit synchsafe tag length.',
        highlightIds: ['#part_mp3_id3', '#part_mp3_player'],
        wireIds: ['#wire_mp3_1', '#wire_mp3_ui'],
        tokenIds: ['mp3_id3'],
      },
      {
        title: '2. 0xFFE Sync Frame -> Compressed Audio Playback',
        kidText: 'After the sticker, the player jumps to 0xFFE sync markers to stream tiny squeezed audio packets to your speakers!',
        engText: '11-bit `0xFFE` sync headers mark independent MPEG-1 Layer III frames decoded into PCM audio.',
        highlightIds: ['#part_mp3_sync', '#part_mp3_frames', '#part_mp3_player'],
        wireIds: ['#wire_mp3_2', '#wire_mp3_aud'],
        tokenIds: ['mp3_sync'],
      },
    ],
  };
}

// =============================================================================
// 5. ZIP ARCHIVE BINARY PARSER (.zip)
// =============================================================================
export function parseZipBinary(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const localFiles = [];
  let eocdOffset = -1;

  for (let i = 0; i + 4 <= bytes.length; i++) {
    const sig = view.getUint32(i, true);
    if (sig === 0x04034b50 && i + 30 <= bytes.length) {
      const nameLen = view.getUint16(i + 26, true);
      const fname = readAscii(bytes, i + 30, nameLen);
      const compSize = view.getUint32(i + 18, true);
      localFiles.push({ fname, compSize, offset: i });
    } else if (sig === 0x06054b50) {
      eocdOffset = i;
    }
  }

  let inner = drawLayerHeader({ x: 20, y: 20, label: 'BACKEND ZIP FILE LAYOUT (PACKED FILES -> TAIL INDEX)', color: '#fbbf24' });
  const fileIds = [];
  const wireIds = [];

  localFiles.slice(0, 2).forEach((f, idx) => {
    const id = `part_zip_f_${idx}`;
    fileIds.push(`#${id}`);
    const x = 20 + idx * 220;
    inner += drawPartCard({
      id,
      x,
      y: 32,
      w: 200,
      h: 82,
      title: `PK\\x03\\x04: ${f.fname}`,
      subtitle: `${f.compSize} B payload`,
      badge: `BYTE @${f.offset}`,
      color: '#38bdf8',
    });
    if (idx > 0) {
      const wid = `wire_zip_${idx}`;
      wireIds.push(`#${wid}`);
      inner += drawWire({ id: wid, points: `${x - 20},73 ${x},73`, color: '#38bdf8' });
    }
  });

  inner += drawPartCard({
    id: 'part_zip_eocd',
    x: 460,
    y: 32,
    w: 220,
    h: 82,
    title: 'End Central Dir (EOCD)',
    subtitle: eocdOffset >= 0 ? `PK\\x05\\x06 @ byte ${eocdOffset}` : 'Tail Index',
    badge: `TAIL @${Math.max(0, eocdOffset)}`,
    color: '#ff4b4b',
  });
  inner += drawWire({ id: 'wire_zip_end', points: '220,73 460,73', color: '#ff4b4b' });

  inner += drawLayerHeader({ x: 20, y: 144, label: 'FRONTEND FILE EXPLORER (READS TAIL INDEX FIRST!)', color: '#34d399' });
  inner += drawWire({ id: 'wire_zip_ui', points: '570,114 570,156', color: '#ff4b4b' });
  inner += drawPartCard({
    id: 'part_zip_ui',
    x: 20,
    y: 156,
    w: 660,
    h: 82,
    title: `Archive Contents: ${localFiles.map((f) => f.fname).join(', ') || 'Files'}`,
    subtitle: 'Windows/macOS jumps straight to EOCD at the end to list files instantly!',
    badge: 'FRONTEND EXPLORER',
    color: '#34d399',
  });

  const rawTokens = [
    ...localFiles.map((f, idx) => ({
      id: `zip_f_${idx}`,
      label: `${f.fname} @${f.offset}`,
      text: `50 4B 03 04 (${f.fname}, ${f.compSize}B)`,
    })),
    { id: 'zip_eocd', label: `EOCD @${Math.max(0, eocdOffset)}`, text: '50 4B 05 06' },
  ];

  return {
    formatId: 'zip',
    title: 'ZIP Archive Binary (.zip)',
    badge: 'PKZIP Suitcase',
    ast: { localFiles, eocdOffset },
    svgMarkup: wrapSvg(705, 265, inner),
    rawTokens,
    steps: [
      {
        title: '1. File Pouches Marked With "PK"',
        kidText: 'Inside a .zip file, every compressed file sits in its own pouch starting with "PK" (for inventor Phil Katz).',
        engText: 'Local File Headers (`0x04034B50` LE) store filename lengths and compressed payload byte counts.',
        highlightIds: fileIds,
        wireIds,
        tokenIds: localFiles.map((_, idx) => `zip_f_${idx}`),
      },
      {
        title: '2. Why Readers Jump to the End First!',
        kidText: 'Instead of reading gigabytes from the front, your OS jumps straight to the EOCD index at the VERY BACK to show the folder list!',
        engText: 'Seeking backward for `0x06054B50` locates the Central Directory index in O(1) time.',
        highlightIds: [...fileIds, '#part_zip_eocd', '#part_zip_ui'],
        wireIds: [...wireIds, '#wire_zip_end', '#wire_zip_ui'],
        tokenIds: rawTokens.map((t) => t.id),
      },
    ],
  };
}

// =============================================================================
// 6. PDF DOCUMENT INTERNALS PARSER (.pdf)
// =============================================================================
export function parsePdfBinary(buffer) {
  const bytes = new Uint8Array(buffer);
  const text = readAscii(bytes, 0, Math.min(bytes.length, 4096));
  const headerMatch = text.match(/%PDF-\d\.\d/);
  const objMatches = Array.from(text.matchAll(/(\d+)\s+0\s+obj/g)).map((m) => m[1]);
  const hasXref = text.includes('xref');

  let inner = drawLayerHeader({ x: 20, y: 20, label: 'BACKEND PDF OBJECT GRAPH -> FRONTEND PRINTABLE PAGE', color: '#ff4b4b' });
  inner += drawPartCard({ id: 'part_pdf_hdr', x: 20, y: 32, w: 170, h: 82, title: headerMatch?.[0] || '%PDF-1.7', subtitle: 'Header Signature', badge: 'BYTE @0', color: '#ff4b4b' });
  inner += drawPartCard({ id: 'part_pdf_objs', x: 215, y: 32, w: 235, h: 82, title: `Body (${objMatches.length} Objects)`, subtitle: `IDs: ${objMatches.slice(0, 4).join(', ')} 0 obj`, badge: 'PAGES / FONTS', color: '#38bdf8' });
  inner += drawPartCard({ id: 'part_pdf_xref', x: 475, y: 32, w: 205, h: 82, title: hasXref ? 'xref + %%EOF' : 'Trailer', subtitle: 'Random-Access Byte Map', badge: 'TAIL INDEX', color: '#34d399' });

  inner += drawWire({ id: 'wire_pdf_1', points: '190,73 215,73', color: '#38bdf8' });
  inner += drawWire({ id: 'wire_pdf_2', points: '450,73 475,73', color: '#34d399' });
  inner += drawWire({ id: 'wire_pdf_ui', points: '332,114 332,156', color: '#38bdf8' });

  inner += drawPartCard({
    id: 'part_pdf_ui',
    x: 20,
    y: 156,
    w: 660,
    h: 82,
    title: 'Frontend PDF Viewer (Chrome / Acrobat)',
    subtitle: 'Reads %%EOF -> xref jump table -> /Catalog -> Renders Exact Page!',
    badge: 'FRONTEND READER',
    color: '#a855f7',
  });

  const rawTokens = [
    { id: 'pdf_hdr', label: 'Header @0', text: headerMatch?.[0] || '%PDF-1.7' },
    { id: 'pdf_objs', label: 'Objects', text: objMatches.map((id) => `${id} 0 obj`).join(' | ') },
    { id: 'pdf_xref', label: 'xref / EOF', text: 'xref ... trailer << /Root 1 0 R >> %%EOF' },
  ];

  return {
    formatId: 'pdf',
    title: 'PDF Internals (.pdf)',
    badge: 'Object Graph',
    ast: { header: headerMatch?.[0], objects: objMatches, hasXref },
    svgMarkup: wrapSvg(705, 265, inner),
    rawTokens,
    steps: [
      {
        title: '1. Version Stamp (%PDF-1.7)',
        kidText: 'PDF viewers start at byte 0 to check the PDF version stamp, then immediately look at the bottom for the xref map!',
        engText: 'PDF opens with `%PDF-1.x` header and finishes with `xref` byte offsets + `%%EOF` trailer.',
        highlightIds: ['#part_pdf_hdr', '#part_pdf_xref'],
        wireIds: ['#wire_pdf_1'],
        tokenIds: ['pdf_hdr', 'pdf_xref'],
      },
      {
        title: '2. Numbered Objects -> Rendered Document',
        kidText: 'Pages and text live inside numbered boxes (`1 0 obj`, `2 0 obj`). Your PDF viewer follows the map to paint any page instantly!',
        engText: 'Indirect object references (`1 0 R`) link `/Catalog` -> `/Pages` -> `/Page` drawing streams.',
        highlightIds: ['#part_pdf_objs', '#part_pdf_ui'],
        wireIds: ['#wire_pdf_2', '#wire_pdf_ui'],
        tokenIds: ['pdf_objs'],
      },
    ],
  };
}

// =============================================================================
// 7. GLTF 2.0 3D SCENE GRAPH ADAPTER (.gltf)
// =============================================================================
export function parseGltfJson(rawText) {
  const ast = JSON.parse(rawText);
  const scenes = ast.scenes?.length || 1;
  const nodes = ast.nodes?.length || 1;
  const meshes = ast.meshes?.length || 1;
  const accessors = ast.accessors?.length || 1;

  let inner = drawLayerHeader({ x: 20, y: 20, label: 'BACKEND glTF SCENE GRAPH -> FRONTEND 3D GPU ENGINE', color: '#38bdf8' });
  inner += drawPartCard({ id: 'part_gl_scene', x: 20, y: 34, w: 148, h: 82, title: `Scene (${scenes})`, subtitle: ast.asset?.version || 'glTF 2.0', badge: 'ROOT', color: '#ff4b4b' });
  inner += drawPartCard({ id: 'part_gl_node', x: 192, y: 34, w: 155, h: 82, title: `Nodes (${nodes})`, subtitle: ast.nodes?.[0]?.name || 'Transform', badge: 'MATRIX', color: '#38bdf8' });
  inner += drawPartCard({ id: 'part_gl_mesh', x: 371, y: 34, w: 148, h: 82, title: `Meshes (${meshes})`, subtitle: 'Triangles + Mat', badge: '3D MESH', color: '#a855f7' });
  inner += drawPartCard({ id: 'part_gl_buf', x: 543, y: 34, w: 145, h: 82, title: `Buffers (${accessors})`, subtitle: 'Float32 Verts', badge: 'GPU DATA', color: '#34d399' });

  inner += drawWire({ id: 'wire_gl_1', points: '168,75 192,75', color: '#38bdf8' });
  inner += drawWire({ id: 'wire_gl_2', points: '347,75 371,75', color: '#a855f7' });
  inner += drawWire({ id: 'wire_gl_3', points: '519,75 543,75', color: '#34d399' });
  inner += drawWire({ id: 'wire_gl_gpu', points: '615,116 615,156', color: '#34d399' });

  inner += drawPartCard({
    id: 'part_gl_ui',
    x: 20,
    y: 156,
    w: 668,
    h: 82,
    title: 'Frontend 3D Viewport (Three.js / Blender / Babylon)',
    subtitle: 'Uploads Buffer Float32 triangles directly to Graphics Card VRAM!',
    badge: 'FRONTEND 3D',
    color: '#38bdf8',
  });

  const rawTokens = [
    { id: 'gl_asset', label: 'asset/scene', text: JSON.stringify({ asset: ast.asset, scenes: ast.scenes }) },
    { id: 'gl_nodes', label: 'nodes/meshes', text: JSON.stringify({ nodes: ast.nodes, meshes: ast.meshes }) },
    { id: 'gl_buf', label: 'accessors/buffers', text: JSON.stringify({ accessors: ast.accessors, buffers: ast.buffers }) },
  ];

  return {
    formatId: 'gltf',
    title: 'glTF 2.0 3D Scene (.gltf)',
    badge: '3D Scene Graph',
    ast,
    svgMarkup: wrapSvg(710, 265, inner),
    rawTokens,
    steps: [
      {
        title: '1. Scene -> Node -> Mesh Hierarchy',
        kidText: '3D apps like Blender or Three.js read a glTF file like a puppet stage: Scene holds Nodes (positions), and Nodes wear 3D Meshes!',
        engText: 'glTF 2.0 decouples spatial hierarchy (`nodes`) from geometry definitions (`meshes`).',
        highlightIds: ['#part_gl_scene', '#part_gl_node', '#part_gl_mesh'],
        wireIds: ['#wire_gl_1', '#wire_gl_2'],
        tokenIds: ['gl_asset', 'gl_nodes'],
      },
      {
        title: '2. Buffers Upload Straight to the GPU',
        kidText: 'Accessors hand packed vertex numbers straight to your graphics card so the 3D spaceship spins at 60 frames per second!',
        engText: '`accessors` and `buffers` stream zero-copy Float32 arrays directly into WebGL/WebGPU vertex buffers.',
        highlightIds: ['#part_gl_mesh', '#part_gl_buf', '#part_gl_ui'],
        wireIds: ['#wire_gl_3', '#wire_gl_gpu'],
        tokenIds: ['gl_buf'],
      },
    ],
  };
}
