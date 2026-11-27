/**
 * =============================================================================
 * TEXT, MARKUP & CONFIG FORMAT ADAPTERS (adapters/textAdapters.js)
 * =============================================================================
 * Every adapter uses outer `<g transform="translate(x, y)">` wrappers around
 * `.file-part` nodes so Anime.js animations never reset coordinates, and shows
 * Backend File Syntax (Top/Left) -> Frontend Tool Output (Bottom/Right).
 * =============================================================================
 */

import { esc, wrapSvg, drawPartCard, drawWire, drawLayerHeader } from '../core/svgBuilder.js';

// =============================================================================
// 1. MARKDOWN MARKUP ADAPTER (.md)
// =============================================================================
export function parseMarkdown(rawText) {
  const lines = rawText.split(/\r?\n/);
  const blocks = [];
  let inCode = false;

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (!inCode) blocks.push({ type: 'CODE', label: 'Code Fence', raw: line });
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    if (/^#{1,6}\s+/.test(line)) {
      blocks.push({ type: 'HEADING', label: line.replace(/^#+\s+/, ''), raw: line });
    } else if (/^>\s+/.test(line)) {
      blocks.push({ type: 'QUOTE', label: line.replace(/^>\s+/, ''), raw: line });
    } else if (/^[-*]\s+/.test(line)) {
      blocks.push({ type: 'LIST', label: line.replace(/^[-*]\s+/, ''), raw: line });
    } else if (line.trim()) {
      blocks.push({ type: 'PARA', label: line.trim(), raw: line });
    }
  }

  const shown = blocks.slice(0, 4);
  const colors = { HEADING: '#ff4b4b', CODE: '#a855f7', QUOTE: '#fbbf24', LIST: '#34d399', PARA: '#38bdf8' };
  const htmlTag = { HEADING: '<h1>', CODE: '<pre><code>', QUOTE: '<blockquote>', LIST: '<ul><li>', PARA: '<p>' };

  let inner = drawLayerHeader({ x: 20, y: 20, label: 'BACKEND MARKDOWN SYMBOLS (.md) -> FRONTEND BROWSER HTML', color: '#38bdf8' });
  const partIds = [];
  const wireIds = [];

  shown.forEach((b, idx) => {
    const id = `part_md_${idx}`;
    const outId = `part_md_out_${idx}`;
    const wid = `wire_md_${idx}`;
    partIds.push(`#${id}`, `#${outId}`);
    wireIds.push(`#${wid}`);

    const y = 34 + idx * 66;
    inner += drawPartCard({
      id,
      x: 20,
      y,
      w: 270,
      h: 56,
      title: b.raw.slice(0, 28),
      subtitle: `Token: ${b.type}`,
      badge: b.type,
      color: colors[b.type] || '#38bdf8',
    });
    inner += drawWire({ id: wid, points: `290,${y + 28} 355,${y + 28}`, color: colors[b.type] || '#38bdf8' });
    inner += drawPartCard({
      id: outId,
      x: 355,
      y,
      w: 315,
      h: 56,
      title: `${htmlTag[b.type] || '<p>'} ${b.label.slice(0, 22)}`,
      subtitle: 'Rendered Webpage Element',
      badge: 'FRONTEND DOM',
      color: '#34d399',
    });
  });

  const rawTokens = shown.map((b, i) => ({ id: `md_tok_${i}`, label: b.type, text: b.raw }));

  return {
    formatId: 'md',
    title: 'Markdown Markup (.md)',
    badge: 'AST Markup',
    ast: blocks,
    svgMarkup: wrapSvg(695, 315, inner),
    rawTokens,
    steps: [
      {
        title: '1. Keyboard Shorthand in the Backend File',
        kidText: 'In a .md file, you don’t write heavy HTML tags—just # for a big title, > for a quote, and - for bullets!',
        engText: 'CommonMark lexers scan line prefixes (#, >, -, ```) into an Abstract Syntax Tree.',
        highlightIds: partIds.filter((_, i) => i % 2 === 0),
        wireIds: [],
        tokenIds: rawTokens.map((t) => t.id),
      },
      {
        title: '2. Frontend Docs App Renders Styled HTML',
        kidText: 'When GitHub, Notion, or VS Code opens the file, its reader translates each symbol on the left into styled webpage blocks on the right!',
        engText: 'Each AST node compiles into semantic HTML (`<h1>`, `<blockquote>`, `<ul><li>`, `<pre><code>`).',
        highlightIds: partIds,
        wireIds,
        tokenIds: rawTokens.map((t) => t.id),
      },
    ],
  };
}

// =============================================================================
// 2. YAML CONFIGURATION ADAPTER (.yaml)
// =============================================================================
export function parseYaml(rawText) {
  const lines = rawText.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#'));
  const entries = lines.map((line) => {
    const indent = line.search(/\S/);
    const clean = line.trim();
    const isList = clean.startsWith('- ');
    const [k, ...rest] = clean.replace(/^-\s*/, '').split(':');
    return { indent, isList, key: k.trim(), val: rest.join(':').trim(), raw: clean };
  });

  const roots = entries.filter((e) => e.indent === 0).slice(0, 3);
  const children = entries.filter((e) => e.indent > 0).slice(0, 4);

  let inner = drawLayerHeader({ x: 20, y: 20, label: 'BACKEND YAML INDENTATION -> NESTED RUNTIME OBJECT', color: '#ff4b4b' });
  const rootIds = [];
  const childIds = [];
  const wireIds = [];

  roots.forEach((r, idx) => {
    const id = `part_yml_r_${idx}`;
    rootIds.push(`#${id}`);
    inner += drawPartCard({
      id,
      x: 20,
      y: 34 + idx * 92,
      w: 220,
      h: 78,
      title: r.key,
      subtitle: r.val || '(nested block)',
      badge: 'INDENT 0',
      color: '#ff4b4b',
    });
  });

  children.forEach((c, idx) => {
    const id = `part_yml_c_${idx}`;
    const wid = `wire_yml_${idx}`;
    childIds.push(`#${id}`);
    wireIds.push(`#${wid}`);
    const cy = 34 + idx * 66;
    inner += drawPartCard({
      id,
      x: 340,
      y: cy,
      w: 330,
      h: 58,
      title: c.isList ? `Array Item: "${c.key}"` : `${c.key}: ${c.val}`,
      subtitle: `Indented ${c.indent} spaces under parent`,
      badge: c.isList ? 'SEQUENCE (-)' : `INDENT ${c.indent}`,
      color: c.isList ? '#34d399' : '#38bdf8',
    });
    inner += drawWire({ id: wid, points: `240,73 290,73 290,${cy + 29} 340,${cy + 29}`, color: '#38bdf8' });
  });

  const rawTokens = entries.slice(0, 6).map((e, i) => ({
    id: `yml_tok_${i}`,
    label: `Indent ${e.indent}sp`,
    text: `${' '.repeat(e.indent)}${e.raw}`,
  }));

  return {
    formatId: 'yaml',
    title: 'YAML Config (.yaml)',
    badge: 'Indentation Tree',
    ast: entries,
    svgMarkup: wrapSvg(695, 315, inner),
    rawTokens,
    steps: [
      {
        title: '1. Indentation Spaces Build the Family Tree',
        kidText: 'YAML uses spaces instead of curly braces! Moving a line 2 spaces to the right puts it inside the parent folder on the left.',
        engText: 'YAML parsers track leading whitespace counts to construct nested maps and arrays.',
        highlightIds: rootIds,
        wireIds: [],
        tokenIds: rawTokens.slice(0, 2).map((t) => t.id),
      },
      {
        title: '2. Keys & Dash Lists Feed Cloud Tools',
        kidText: 'Tools like Docker and robot configs read these indented settings and list dashes (-) straight into memory!',
        engText: 'Sequence markers (`- `) compile into JS/Python arrays while `key: value` entries form dictionary properties.',
        highlightIds: [...rootIds, ...childIds],
        wireIds,
        tokenIds: rawTokens.map((t) => t.id),
      },
    ],
  };
}

// =============================================================================
// 3. JSON DATA INTERCHANGE ADAPTER (.json)
// =============================================================================
export function parseJson(rawText) {
  const ast = JSON.parse(rawText);
  const keys = Object.keys(ast).slice(0, 4);

  let inner = drawLayerHeader({ x: 20, y: 20, label: 'BACKEND JSON PAYLOAD -> FRONTEND APP STATE', color: '#fbbf24' });
  inner += drawPartCard({
    id: 'part_json_root',
    x: 20,
    y: 110,
    w: 190,
    h: 84,
    title: 'Root { Object }',
    subtitle: `${Object.keys(ast).length} properties`,
    badge: 'JSON ROOT',
    color: '#fbbf24',
  });

  const childIds = [];
  const wireIds = [];
  keys.forEach((k, idx) => {
    const val = ast[k];
    const isArr = Array.isArray(val);
    const isObj = val && typeof val === 'object' && !isArr;
    const typeLabel = isArr ? 'ARRAY []' : isObj ? 'OBJECT {}' : typeof val;
    const preview = isArr ? `[${val.length} items]` : isObj ? `{${Object.keys(val).length} keys}` : JSON.stringify(val);

    const id = `part_json_k_${idx}`;
    const wid = `wire_json_${idx}`;
    childIds.push(`#${id}`);
    wireIds.push(`#${wid}`);

    const cy = 36 + idx * 68;
    inner += drawPartCard({
      id,
      x: 290,
      y: cy,
      w: 380,
      h: 58,
      title: `"${k}": ${String(preview).slice(0, 26)}`,
      subtitle: `Parsed JS Type: ${typeLabel}`,
      badge: typeLabel.toUpperCase(),
      color: isArr ? '#34d399' : isObj ? '#a855f7' : '#38bdf8',
    });
    inner += drawWire({ id: wid, points: `210,152 250,152 250,${cy + 29} 290,${cy + 29}`, color: '#fbbf24' });
  });

  const rawTokens = keys.map((k, idx) => ({
    id: `json_tok_${idx}`,
    label: `"${k}"`,
    text: `"${k}": ${JSON.stringify(ast[k])}`,
  }));

  return {
    formatId: 'json',
    title: 'JSON Data (.json)',
    badge: 'Key-Value Tree',
    ast,
    svgMarkup: wrapSvg(695, 320, inner),
    rawTokens,
    steps: [
      {
        title: '1. The Outer Curly-Brace Box { }',
        kidText: 'Web apps and video games pass data around inside JSON files—a giant curly-brace box holding labeled drawers!',
        engText: '`JSON.parse()` tokenizes RFC 8259 strings into live JavaScript Objects, Arrays, Booleans, and Numbers in microseconds.',
        highlightIds: ['#part_json_root'],
        wireIds: [],
        tokenIds: rawTokens.slice(0, 1).map((t) => t.id),
      },
      {
        title: '2. Typed Drawers Power the App UI',
        kidText: 'Numbers become player levels, true/false switches turn jetpacks on, and [arrays] fill your inventory bar!',
        engText: 'Every parsed key directly hydrates frontend UI state without manual string splitting.',
        highlightIds: ['#part_json_root', ...childIds],
        wireIds,
        tokenIds: rawTokens.map((t) => t.id),
      },
    ],
  };
}

// =============================================================================
// 4. CSV TABULAR SPREADSHEET ADAPTER (.csv)
// =============================================================================
export function parseCsv(rawText) {
  const lines = rawText.trim().split(/\r?\n/);
  const rows = lines.map((line) => {
    const out = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') inQ = !inQ;
      else if (ch === ',' && !inQ) { out.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    out.push(cur.trim());
    return out;
  });

  const headers = rows[0] || [];
  const dataRows = rows.slice(1, 5);
  const colW = Math.max(100, Math.floor(640 / Math.max(1, headers.length)));

  let inner = drawLayerHeader({ x: 20, y: 20, label: 'BACKEND COMMA-SEPARATED LINES (.csv) -> FRONTEND SPREADSHEET GRID', color: '#fbbf24' });
  inner += `<g transform="translate(20, 34)"><g id="part_csv_header" class="file-part" style="transform-box: fill-box; transform-origin: center;">`;
  headers.forEach((h, cIdx) => {
    inner += `
      <rect x="${cIdx * colW}" y="0" width="${colW - 8}" height="46" rx="6" fill="#1e293b" stroke="#fbbf24" stroke-width="2" />
      <text x="${cIdx * colW + (colW - 8) / 2}" y="28" text-anchor="middle" fill="#fbbf24" font-family="monospace" font-size="11.5" font-weight="700">${esc(h)}</text>
    `;
  });
  inner += `</g></g>`;

  const rowIds = [];
  dataRows.forEach((r, rIdx) => {
    const id = `part_csv_row_${rIdx}`;
    rowIds.push(`#${id}`);
    inner += `<g transform="translate(20, ${96 + rIdx * 48})"><g id="${id}" class="file-part" style="transform-box: fill-box; transform-origin: center;">`;
    headers.forEach((_, cIdx) => {
      inner += `
        <rect x="${cIdx * colW}" y="0" width="${colW - 8}" height="38" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-width="1.4" />
        <text x="${cIdx * colW + (colW - 8) / 2}" y="24" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="11">${esc(r[cIdx] ?? '')}</text>
      `;
    });
    inner += `</g></g>`;
  });

  const rawTokens = lines.slice(0, 5).map((l, i) => ({
    id: `csv_row_${i}`,
    label: i === 0 ? 'HEADER' : `ROW ${i}`,
    text: l,
  }));

  return {
    formatId: 'csv',
    title: 'CSV Spreadsheet (.csv)',
    badge: 'Comma-Separated',
    ast: { headers, dataRows },
    svgMarkup: wrapSvg(690, 300, inner),
    rawTokens,
    steps: [
      {
        title: '1. Line 1 Names the Columns (Header)',
        kidText: 'Excel and Google Sheets are Frontends! When you save as .csv, there are no table borders—just commas (,) separating column titles on Line 1.',
        engText: 'Row 0 defines schema headers; RFC-4180 parsers split on unquoted commas to map column indices.',
        highlightIds: ['#part_csv_header'],
        wireIds: [],
        tokenIds: ['csv_row_0'],
      },
      {
        title: '2. Every New Line Draws a Table Row',
        kidText: 'Each line underneath slots neatly under its matching column header—turning plain text with commas into a full spreadsheet grid!',
        engText: 'Each newline (`\\n`) constructs one row tuple aligned to the header schema.',
        highlightIds: ['#part_csv_header', ...rowIds],
        wireIds: [],
        tokenIds: rawTokens.map((t) => t.id),
      },
    ],
  };
}

// =============================================================================
// 5. TOML / INI MANIFEST ADAPTER (.toml)
// =============================================================================
export function parseToml(rawText) {
  const lines = rawText.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#'));
  const sections = [];
  let current = { name: 'global', pairs: [] };
  sections.push(current);

  for (const line of lines) {
    const trimmed = line.trim();
    const secMatch = trimmed.match(/^\[(.+)\]$/);
    if (secMatch) {
      current = { name: secMatch[1], pairs: [] };
      sections.push(current);
    } else if (trimmed.includes('=')) {
      const [k, ...rest] = trimmed.split('=');
      current.pairs.push({ key: k.trim(), val: rest.join('=').trim() });
    }
  }

  const shownSecs = sections.filter((s) => s.pairs.length > 0).slice(0, 3);
  let inner = drawLayerHeader({ x: 20, y: 20, label: 'BACKEND TOML [SECTIONS] -> FRONTEND BUILD TOOL CONFIG', color: '#38bdf8' });
  const partIds = [];
  const wireIds = [];

  shownSecs.forEach((sec, idx) => {
    const id = `part_toml_${idx}`;
    partIds.push(`#${id}`);
    const x = 22 + idx * 225;
    inner += drawPartCard({
      id,
      x,
      y: 44,
      w: 200,
      h: 130,
      title: `[${sec.name}]`,
      subtitle: sec.pairs.slice(0, 2).map((p) => `${p.key}=${p.val}`).join(' | '),
      badge: 'TABLE HEADER',
      color: idx === 0 ? '#ff4b4b' : idx === 1 ? '#38bdf8' : '#34d399',
    });
    if (idx > 0) {
      const wid = `wire_toml_${idx}`;
      wireIds.push(`#${wid}`);
      inner += drawWire({ id: wid, points: `${x - 25},109 ${x},109`, color: '#fbbf24' });
    }
  });

  const rawTokens = shownSecs.map((s, i) => ({
    id: `toml_s_${i}`,
    label: `[${s.name}]`,
    text: `[${s.name}] ${s.pairs.map((p) => `${p.key} = ${p.val}`).join(' | ')}`,
  }));

  return {
    formatId: 'toml',
    title: 'TOML / INI Manifest (.toml)',
    badge: 'Section Table',
    ast: sections,
    svgMarkup: wrapSvg(695, 220, inner),
    rawTokens,
    steps: [
      {
        title: '1. Bracketed Section Folders ([package])',
        kidText: 'TOML organizes project settings using [folder] tabs in square brackets so build tools find your app’s name, version, and plugins fast!',
        engText: 'TOML scopes `key = value` settings cleanly under `[table]` headers for Rust Cargo, Python `pyproject.toml`, and Vite configs.',
        highlightIds: partIds,
        wireIds,
        tokenIds: rawTokens.map((t) => t.id),
      },
    ],
  };
}
