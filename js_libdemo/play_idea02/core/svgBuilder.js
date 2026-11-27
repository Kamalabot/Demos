/**
 * =============================================================================
 * CORE SVG BUILDER (core/svgBuilder.js)
 * =============================================================================
 * Generates semantic, non-overlapping SVG diagrams where:
 *   - Outer `<g transform="translate(x, y)">` locks world coordinates.
 *   - Inner `<g id="part_..." class="file-part">` has `transform-box: fill-box`
 *     and `transform-origin: center` so Anime.js `scale` animations NEVER reset
 *     an element's `(x, y)` position back to `(0, 0)`!
 *   - Badges sit in a dedicated header row so titles/subtitles never collide.
 * =============================================================================
 */

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function toHexSlice(bytes, offset = 0, maxLen = 12) {
  if (!bytes || !bytes.length) return '';
  const end = Math.min(bytes.length, offset + maxLen);
  const parts = [];
  for (let i = offset; i < end; i++) {
    parts.push(bytes[i].toString(16).padStart(2, '0').toUpperCase());
  }
  return parts.join(' ') + (bytes.length > offset + maxLen ? ' …' : '');
}

export function wrapSvg(width, height, innerMarkup) {
  return `
    <svg
      id="anatomy-svg"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 ${width} ${height}"
      width="100%"
      height="100%"
    >
      <defs>
        <pattern id="bp-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(148,163,184,0.07)" stroke-width="1" />
        </pattern>
        <marker id="arrow-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
        </marker>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" fill="url(#bp-grid)" rx="12" />
      ${innerMarkup}
    </svg>
  `;
}

/**
 * Draws a clean "Backend File vs Frontend Tool" section divider label inside SVG.
 */
export function drawLayerHeader({ x = 20, y = 18, label, color = '#94a3b8' }) {
  return `
    <text x="${x}" y="${y}" fill="${esc(color)}" font-family="monospace" font-size="10.5" font-weight="700" letter-spacing="1.2">
      ${esc(label)}
    </text>
  `;
}

/**
 * Renders a semantic, collision-free File Block Card:
 *   - Dedicated top strip for badge & byte offset
 *   - Middle row for crisp title
 *   - Bottom row for technical subtitle
 */
export function drawPartCard({
  id,
  x,
  y,
  w = 190,
  h = 82,
  title,
  subtitle = '',
  badge = '',
  color = '#38bdf8',
}) {
  const maxTitleChars = Math.max(12, Math.floor((w - 28) / 7.5));
  const maxSubChars = Math.max(14, Math.floor((w - 28) / 6.3));
  const safeTitle = String(title).length > maxTitleChars ? String(title).slice(0, maxTitleChars - 1) + '…' : title;
  const safeSub = String(subtitle).length > maxSubChars ? String(subtitle).slice(0, maxSubChars - 1) + '…' : subtitle;

  return `
    <g transform="translate(${x}, ${y})">
      <g id="${esc(id)}" class="file-part" style="transform-box: fill-box; transform-origin: center;">
        <rect x="0" y="0" width="${w}" height="${h}" rx="10" fill="#0f172a" stroke="${esc(color)}" stroke-width="2" />
        <rect x="0" y="0" width="7" height="${h}" rx="3.5" fill="${esc(color)}" />
        ${
          badge
            ? `<rect x="16" y="9" width="${Math.min(w - 28, badge.length * 7 + 16)}" height="18" rx="5" fill="${esc(color)}" fill-opacity="0.18" />
               <text x="24" y="21" fill="${esc(color)}" font-family="monospace" font-size="9.5" font-weight="700">${esc(badge)}</text>`
            : ''
        }
        <text x="16" y="45" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700">${esc(safeTitle)}</text>
        <text x="16" y="65" fill="#94a3b8" font-family="monospace" font-size="10">${esc(safeSub)}</text>
      </g>
    </g>
  `;
}

export function drawWire({ id, points, color = '#38bdf8', arrow = true }) {
  return `
    <polyline
      id="${esc(id)}"
      class="file-wire"
      points="${esc(points)}"
      fill="none"
      stroke="${esc(color)}"
      stroke-width="2.5"
      stroke-dasharray="7 5"
      ${arrow ? 'marker-end="url(#arrow-head)"' : ''}
    />
  `;
}
