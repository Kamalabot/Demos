/**
 * =============================================================================
 * XML & ENGINEERING SCHEMATIC ADAPTERS (adapters/xmlAdapters.js)
 * =============================================================================
 * Upgraded Architecture:
 *   - Outer `<g transform="translate(x, y)">` wraps inner `<g class="file-part">`
 *     so Anime.js scaling NEVER snaps elements to (0, 0).
 *   - Every format clearly illustrates:
 *       LAYER 1 (TOP): The Backend File Blocks as stored in XML
 *       LAYER 2 (BOTTOM): What the Frontend Tool draws from those blocks!
 * =============================================================================
 */

import { XMLParser } from 'fast-xml-parser';
import { esc, wrapSvg, drawPartCard, drawWire, drawLayerHeader } from '../core/svgBuilder.js';

const asArray = (val) => (Array.isArray(val) ? val : val ? [val] : []);

function createParser(opts = {}) {
  return new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true,
    parseAttributeValue: true,
    trimValues: true,
    ...opts,
  });
}

// =============================================================================
// 1. QELECTROTECH (.qet) SCHEMATIC XML ADAPTER
// =============================================================================
export function parseQetXml(rawXml) {
  const parser = createParser();
  const ast = parser.parse(rawXml);
  const project = ast.project || {};
  const diagram = asArray(project.diagram)[0] || {};
  const elements = asArray(diagram.elements?.element);
  const conductors = asArray(diagram.conductors?.conductor);

  // Layer 1 (Top): File Backend XML Blocks
  let topXmlCards = drawLayerHeader({ x: 20, y: 20, label: 'BACKEND FILE ON DISK (.qet XML BLOCKS)', color: '#fbbf24' });
  topXmlCards += drawPartCard({
    id: 'part_qet_xml_proj',
    x: 20,
    y: 30,
    w: 205,
    h: 76,
    title: '<project><diagram>',
    subtitle: `Title: ${diagram['@_title'] || 'Sheet 1'}`,
    badge: 'XML HEADER',
    color: '#34d399',
  });
  topXmlCards += drawPartCard({
    id: 'part_qet_xml_els',
    x: 245,
    y: 30,
    w: 210,
    h: 76,
    title: `<elements> (${elements.length})`,
    subtitle: 'x, y, orientation, .elmt',
    badge: 'PARTS LIST',
    color: '#f59e0b',
  });
  topXmlCards += drawPartCard({
    id: 'part_qet_xml_conds',
    x: 475,
    y: 30,
    w: 205,
    h: 76,
    title: `<conductors> (${conductors.length})`,
    subtitle: 'x1, y1 -> x2, y2 wires',
    badge: 'WIRES LIST',
    color: '#38bdf8',
  });

  // Layer 2 (Bottom): Frontend QElectroTech Canvas Output
  const appY = 148;
  let bottomCanvas = drawLayerHeader({ x: 20, y: 138, label: 'FRONTEND TOOL OUTPUT (QELECTROTECH SCHEMATIC VIEWPORT)', color: '#38bdf8' });
  bottomCanvas += `<rect x="20" y="${appY}" width="660" height="145" rx="10" fill="#080d17" stroke="rgba(56,189,248,0.28)" />`;

  let minX = Infinity, maxX = -Infinity;
  elements.forEach((el) => {
    const x = Number(el['@_x'] ?? 100);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
  });
  if (!Number.isFinite(minX)) { minX = 80; maxX = 480; }
  const spanX = Math.max(120, maxX - minX);
  const mapX = (x) => 95 + ((x - minX) / spanX) * 490;
  const centerY = appY + 74;

  // Connecting translation wires from XML blocks down to rendered circuit
  bottomCanvas += drawWire({ id: 'wire_qet_parse_1', points: '350,106 350,148', color: '#f59e0b' });
  bottomCanvas += drawWire({ id: 'wire_qet_parse_2', points: '577,106 577,148', color: '#38bdf8' });

  const wireIds = [];
  const wireSvg = conductors
    .map((c, idx) => {
      const id = `wire_cond_${idx}`;
      wireIds.push(`#${id}`);
      const x1 = mapX(Number(c['@_x1'] ?? minX));
      const x2 = mapX(Number(c['@_x2'] ?? maxX));
      const label = c['@_num'] || `W${idx + 1}`;
      const mx = (x1 + x2) / 2;
      return `
        <g id="${id}" class="file-wire">
          <polyline points="${x1},${centerY} ${x2},${centerY}"
            fill="none" stroke="#38bdf8" stroke-width="3.5" stroke-dasharray="8 5" />
          <rect x="${mx - 18}" y="${centerY - 22}" width="36" height="16" rx="4" fill="#0f172a" stroke="#38bdf8" />
          <text x="${mx}" y="${centerY - 11}" text-anchor="middle" fill="#7dd3fc" font-family="monospace" font-size="9">${esc(label)}</text>
        </g>
      `;
    })
    .join('');

  const partIds = [];
  const elemSvg = elements
    .map((el, idx) => {
      const id = `part_el_${idx}`;
      partIds.push(`#${id}`);
      const x = mapX(Number(el['@_x'] ?? 100 + idx * 160));
      const rawType = String(el['@_type'] || 'component');
      const shortType = rawType.split('/').pop().replace('.elmt', '');
      const infos = asArray(el.informations?.information);
      const labelObj = infos.find((i) => i['@_name'] === 'label') || infos[0];
      const labelText = labelObj?.['#text'] || el['@_label'] || `K${idx + 1}`;

      return `
        <g transform="translate(${x - 52}, ${centerY - 32})">
          <g id="${id}" class="file-part" style="transform-box: fill-box; transform-origin: center;">
            <rect width="104" height="64" rx="8" fill="#111827" stroke="#f59e0b" stroke-width="2.2" />
            <circle cx="0" cy="32" r="4.5" fill="#38bdf8" />
            <circle cx="104" cy="32" r="4.5" fill="#38bdf8" />
            <text x="52" y="27" text-anchor="middle" fill="#fbbf24" font-family="monospace" font-size="11.5" font-weight="700">${esc(labelText)}</text>
            <text x="52" y="46" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="9">${esc(shortType.slice(0, 14))}</text>
          </g>
        </g>
      `;
    })
    .join('');

  const rawTokens = [
    { id: 'qet_proj', label: '<project>', text: `<project version="${project['@_version'] || '0.9'}" title="${project['@_title'] || 'QET'}">` },
    { id: 'qet_diag', label: '<diagram>', text: `<diagram title="${diagram['@_title'] || 'Sheet 1'}" cols="${diagram['@_cols'] || 17}">` },
    ...elements.map((el, idx) => ({
      id: `qet_el_${idx}`,
      label: `<element #${idx + 1}>`,
      text: `<element type="${el['@_type']}" x="${el['@_x']}" y="${el['@_y']}" />`,
    })),
    ...conductors.map((c, idx) => ({
      id: `qet_cond_${idx}`,
      label: `<conductor #${idx + 1}>`,
      text: `<conductor num="${c['@_num'] || idx + 1}" x1="${c['@_x1']}" y1="${c['@_y1']}" x2="${c['@_x2']}" y2="${c['@_y2']}" />`,
    })),
  ];

  return {
    formatId: 'qet',
    title: 'QElectroTech Schematic (.qet)',
    badge: 'XML Schematic',
    ast,
    svgMarkup: wrapSvg(700, 315, `${topXmlCards}${bottomCanvas}${wireSvg}${elemSvg}`),
    rawTokens,
    steps: [
      {
        title: '1. File Backend: The XML Project Sheet',
        kidText: 'QElectroTech is just a Frontend drawing board—the real circuit lives inside this plain XML file! First, the reader checks <project> and <diagram> to set up the paper.',
        engText: 'fast-xml-parser parses the root <project> and <diagram> tags into an in-memory JS object before any geometry is drawn to the viewport.',
        highlightIds: ['#part_qet_xml_proj'],
        wireIds: [],
        tokenIds: ['qet_proj', 'qet_diag'],
      },
      {
        title: '2. Reader Places <element> Symbols',
        kidText: 'Next, the parser reads every <element> block in the file and places each breaker, coil, or motor at its exact (x, y) spot on the screen below!',
        engText: 'Each <element> node supplies @_x, @_y, @_orientation, and symbol path (@_type). Our adapter maps them into positioned <g class="file-part"> SVG symbols.',
        highlightIds: ['#part_qet_xml_els', ...partIds],
        wireIds: ['#wire_qet_parse_1'],
        tokenIds: elements.map((_, i) => `qet_el_${i}`),
      },
      {
        title: '3. Reader Connects <conductor> Wires',
        kidText: 'Finally, the reader connects the parts using <conductor> wire coordinates—turning plain XML text into a live glowing electrical circuit!',
        engText: '<conductor> start/end attributes map onto SVG polylines (.file-wire) animated with Anime.js `strokeDashoffset` to visualize current flow.',
        highlightIds: ['#part_qet_xml_conds', ...partIds],
        wireIds: ['#wire_qet_parse_2', ...wireIds],
        tokenIds: conductors.map((_, i) => `qet_cond_${i}`),
      },
    ],
  };
}

// =============================================================================
// 2. PLCOPEN IEC 61131-3 LADDER XML ADAPTER (.plc.xml)
// =============================================================================
export function parsePlcXml(rawXml) {
  const parser = createParser();
  const ast = parser.parse(rawXml);
  const project = ast.project || {};
  const pou = asArray(project.types?.pous?.pou)[0] || {};
  const vars = asArray(pou.interface?.localVars?.variable);
  const ld = pou.body?.LD || {};
  const contacts = asArray(ld.contact);
  const coils = asArray(ld.coil);

  let inner = drawLayerHeader({ x: 20, y: 20, label: 'BACKEND FILE (.plc.xml) -> FRONTEND LADDER LOGIC IDE', color: '#a855f7' });
  inner += drawPartCard({
    id: 'part_plc_header',
    x: 20,
    y: 30,
    w: 310,
    h: 78,
    title: `POU: ${pou['@_name'] || 'Conveyor_Starter'}`,
    subtitle: `Vendor: ${project.fileHeader?.['@_companyName'] || 'IEC-61131-3'}`,
    badge: 'PROGRAM XML',
    color: '#a855f7',
  });
  inner += drawPartCard({
    id: 'part_plc_vars',
    x: 350,
    y: 30,
    w: 330,
    h: 78,
    title: `<localVars> (${vars.length} Tags)`,
    subtitle: vars.map((v) => v['@_name']).join(', '),
    badge: 'MEMORY MAP',
    color: '#38bdf8',
  });

  // Frontend Ladder Rung Canvas
  inner += `<rect x="20" y="135" width="660" height="145" rx="10" fill="#080d17" stroke="rgba(52,211,153,0.3)" />`;
  inner += `
    <g id="part_plc_rails" class="file-part" style="transform-box: fill-box; transform-origin: center;">
      <line x1="48" y1="152" x2="48" y2="262" stroke="#ef4444" stroke-width="5" stroke-linecap="round" />
      <text x="48" y="274" text-anchor="middle" fill="#ef4444" font-family="monospace" font-size="9">24V</text>
      <line x1="652" y1="152" x2="652" y2="262" stroke="#38bdf8" stroke-width="5" stroke-linecap="round" />
      <text x="652" y="274" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="9">0V</text>
    </g>
  `;

  inner += drawWire({ id: 'wire_plc_rung', points: '50,206 650,206', color: '#34d399', arrow: false });

  const contactIds = [];
  contacts.forEach((c, idx) => {
    const id = `part_plc_contact_${idx}`;
    contactIds.push(`#${id}`);
    inner += drawPartCard({
      id,
      x: 92 + idx * 175,
      y: 165,
      w: 150,
      h: 82,
      title: `| | ${c.variable || `IN_${idx}`}`,
      subtitle: c['@_negated'] ? 'NC Switch' : 'NO Switch',
      badge: '<contact>',
      color: '#34d399',
    });
  });

  const coilIds = [];
  coils.forEach((c, idx) => {
    const id = `part_plc_coil_${idx}`;
    coilIds.push(`#${id}`);
    inner += drawPartCard({
      id,
      x: 465,
      y: 165,
      w: 155,
      h: 82,
      title: `( ) ${c.variable || 'MOTOR'}`,
      subtitle: 'Output Coil',
      badge: '<coil>',
      color: '#f59e0b',
    });
  });

  const rawTokens = [
    { id: 'plc_hdr', label: '<pou>', text: `<pou name="${pou['@_name']}" pouType="program">` },
    { id: 'plc_vars', label: '<localVars>', text: vars.map((v) => `<variable name="${v['@_name']}"/>`).join(' ') },
    { id: 'plc_contacts', label: '<contact>', text: contacts.map((c) => `<contact><variable>${c.variable}</variable></contact>`).join(' ') },
    { id: 'plc_coil', label: '<coil>', text: coils.map((c) => `<coil><variable>${c.variable}</variable></coil>`).join(' ') },
  ];

  return {
    formatId: 'plc',
    title: 'PLCopen Ladder Logic (.plc.xml)',
    badge: 'Industrial XML',
    ast,
    svgMarkup: wrapSvg(700, 300, inner),
    rawTokens,
    steps: [
      {
        title: '1. Factory Code Lives in Portable XML',
        kidText: 'Even giant factory robot editors are just Frontends! The actual ladder program lives in a PLCopen XML file so Siemens, Rockwell, or Codesys can all read the exact same logic.',
        engText: 'IEC 61131-3 XML separates <fileHeader> metadata and <pou> program containers from proprietary binary vendor projects.',
        highlightIds: ['#part_plc_header', '#part_plc_vars'],
        wireIds: [],
        tokenIds: ['plc_hdr', 'plc_vars'],
      },
      {
        title: '2. Reader Builds the Live Ladder Rung',
        kidText: 'The PLC reader links <contact> switches and the <coil> motor onto a virtual 24V power rung—turning XML lines into an animated circuit!',
        engText: 'Each <contact> and <coil> binds to symbolic <localVars> and renders onto the Ladder Diagram scan rung.',
        highlightIds: [...contactIds, ...coilIds, '#part_plc_rails'],
        wireIds: ['#wire_plc_rung'],
        tokenIds: ['plc_contacts', 'plc_coil'],
      },
    ],
  };
}

// =============================================================================
// 3. WORKDAY ENTERPRISE HR / SOAP XML ADAPTER (.workday.xml)
// =============================================================================
export function parseWorkdayXml(rawXml) {
  const parser = createParser();
  const ast = parser.parse(rawXml);
  const env = ast['env:Envelope'] || ast;
  const body = env['env:Body'] || env;
  const resp = body['wd:Get_Workers_Response'] || body.Get_Workers_Response || {};
  const worker = asArray(resp['wd:Response_Data']?.['wd:Worker'])[0] || {};
  const wData = worker['wd:Worker_Data'] || {};
  const person = wData['wd:Personal_Data']?.['wd:Name_Data']?.['wd:Legal_Name_Data']?.['wd:Name_Detail_Data'] || {};
  const emp = wData['wd:Employment_Data']?.['wd:Worker_Job_Data']?.['wd:Position_Data'] || {};

  const fullName = `${person['wd:First_Name'] || 'Grace'} ${person['wd:Last_Name'] || 'Hopper'}`;
  const workerId = wData['wd:Worker_ID'] || 'EMP-2048';
  const jobTitle = emp['wd:Business_Title'] || 'Compiler Pioneer';
  const orgRef = emp['wd:Supervisory_Organization_Reference']?.['wd:ID']?.['#text'] || emp['wd:Supervisory_Organization_Reference']?.['wd:ID'] || 'ORG-SYS';

  let inner = drawLayerHeader({ x: 20, y: 20, label: 'BACKEND SOAP XML (.workday.xml) -> FRONTEND HR PROFILE', color: '#38bdf8' });
  inner += drawPartCard({ id: 'part_wd_env', x: 20, y: 32, w: 300, h: 80, title: 'env:Envelope / Body', subtitle: 'xmlns:wd="urn:com.workday/bsvc"', badge: 'SOAP ENVELOPE', color: '#38bdf8' });
  inner += drawPartCard({ id: 'part_wd_id', x: 375, y: 32, w: 305, h: 80, title: `Worker ID: ${workerId}`, subtitle: 'wd:Get_Workers_Response', badge: 'RECORD KEY', color: '#f59e0b' });
  inner += drawPartCard({ id: 'part_wd_person', x: 20, y: 168, w: 300, h: 82, title: fullName, subtitle: 'Parsed from <wd:Personal_Data>', badge: 'HR PROFILE UI', color: '#34d399' });
  inner += drawPartCard({ id: 'part_wd_job', x: 375, y: 168, w: 305, h: 82, title: jobTitle, subtitle: `Org: ${orgRef} (<wd:Position_Data>)`, badge: 'ORG CHART UI', color: '#a855f7' });

  inner += drawWire({ id: 'wire_wd_1', points: '320,72 375,72', color: '#38bdf8' });
  inner += drawWire({ id: 'wire_wd_2', points: '525,112 525,140 170,140 170,168', color: '#34d399' });
  inner += drawWire({ id: 'wire_wd_3', points: '525,112 525,168', color: '#a855f7' });

  const rawTokens = [
    { id: 'wd_ns', label: 'env:Envelope', text: '<env:Envelope xmlns:wd="urn:com.workday/bsvc">' },
    { id: 'wd_ref', label: 'wd:Worker_ID', text: `<wd:Worker_ID>${workerId}</wd:Worker_ID>` },
    { id: 'wd_name', label: 'wd:Personal_Data', text: `<wd:First_Name>${person['wd:First_Name'] || 'Grace'}</wd:First_Name>` },
    { id: 'wd_job', label: 'wd:Position_Data', text: `<wd:Business_Title>${jobTitle}</wd:Business_Title>` },
  ];

  return {
    formatId: 'workday',
    title: 'Workday Enterprise XML (.workday.xml)',
    badge: 'SOAP / HR XML',
    ast,
    svgMarkup: wrapSvg(700, 275, inner),
    rawTokens,
    steps: [
      {
        title: '1. Envelope & Namespace Prefix (env: & wd:)',
        kidText: 'HR portals look sleek on screen, but under the hood they exchange Workday XML envelopes! Namespace prefixes like "wd:" stop tags from colliding.',
        engText: 'SOAP wraps Workday payloads in <env:Envelope> with explicit namespace URIs (`urn:com.workday/bsvc`).',
        highlightIds: ['#part_wd_env', '#part_wd_id'],
        wireIds: ['#wire_wd_1'],
        tokenIds: ['wd_ns', 'wd_ref'],
      },
      {
        title: '2. Frontend HR Cards Hydrated From XML',
        kidText: 'The HR website reads <wd:Personal_Data> and <wd:Position_Data> from the XML file and paints neat employee profile badges on your screen!',
        engText: 'Enterprise middleware extracts worker PII and supervisory org references to populate UI cards and org charts.',
        highlightIds: ['#part_wd_person', '#part_wd_job'],
        wireIds: ['#wire_wd_2', '#wire_wd_3'],
        tokenIds: ['wd_name', 'wd_job'],
      },
    ],
  };
}

// =============================================================================
// 4. DRAW.IO / MXGRAPH XML ADAPTER (.drawio)
// =============================================================================
export function parseDrawioXml(rawXml) {
  const parser = createParser();
  const ast = parser.parse(rawXml);
  const diagram = asArray(ast.mxfile?.diagram)[0] || {};
  const cells = asArray(diagram.mxGraphModel?.root?.mxCell);

  const vertices = cells.filter((c) => c['@_vertex'] === 1 || c['@_vertex'] === '1');
  const edges = cells.filter((c) => c['@_edge'] === 1 || c['@_edge'] === '1');

  let inner = drawLayerHeader({ x: 20, y: 20, label: 'BACKEND mxCell XML -> FRONTEND FLOWCHART CANVAS', color: '#38bdf8' });
  const boxMap = new Map();
  const partIds = [];

  vertices.forEach((v, idx) => {
    const id = `part_cell_${v['@_id'] || idx}`;
    partIds.push(`#${id}`);
    const x = 30 + idx * 225;
    const y = 78;
    const w = 185;
    const h = 86;
    boxMap.set(String(v['@_id']), { x, y, w, h });

    inner += drawPartCard({
      id,
      x,
      y,
      w,
      h,
      title: String(v['@_value'] || `Node ${v['@_id']}`),
      subtitle: `<mxCell id="${v['@_id']}" vertex="1">`,
      badge: 'VERTEX NODE',
      color: idx % 2 === 0 ? '#38bdf8' : '#34d399',
    });
  });

  const wireIds = [];
  edges.forEach((e, idx) => {
    const id = `wire_edge_${e['@_id'] || idx}`;
    wireIds.push(`#${id}`);
    const src = boxMap.get(String(e['@_source']));
    const dst = boxMap.get(String(e['@_target']));
    if (src && dst) {
      inner += drawWire({
        id,
        points: `${src.x + src.w},${src.y + src.h / 2} ${dst.x},${dst.y + dst.h / 2}`,
        color: '#f59e0b',
      });
    }
  });

  const rawTokens = [
    { id: 'dio_root', label: '<mxGraphModel>', text: '<mxfile><diagram><mxGraphModel><root>' },
    ...vertices.map((v) => ({
      id: `dio_v_${v['@_id']}`,
      label: `Vertex ${v['@_id']}`,
      text: `<mxCell id="${v['@_id']}" value="${v['@_value']}" vertex="1" />`,
    })),
    ...edges.map((e) => ({
      id: `dio_e_${e['@_id']}`,
      label: `Edge ${e['@_id']}`,
      text: `<mxCell id="${e['@_id']}" source="${e['@_source']}" target="${e['@_target']}" edge="1" />`,
    })),
  ];

  return {
    formatId: 'drawio',
    title: 'diagrams.net Flowchart (.drawio)',
    badge: 'mxGraph XML',
    ast,
    svgMarkup: wrapSvg(690, 220, inner),
    rawTokens,
    steps: [
      {
        title: '1. Boxes Are <mxCell vertex="1"> Records',
        kidText: 'Draw.io seems like a freehand drawing app, but every box is actually a numbered XML card storing its label and coordinates!',
        engText: 'mxGraph stores every node as an <mxCell vertex="1"> with nested <mxGeometry> bounds.',
        highlightIds: partIds,
        wireIds: [],
        tokenIds: ['dio_root', ...vertices.map((v) => `dio_v_${v['@_id']}`)],
      },
      {
        title: '2. Arrows Point by Cell ID (source -> target)',
        kidText: 'Connecting arrows remember the exact box IDs they connect—so when the app drags a box, the arrow stretches automatically!',
        engText: 'Edge cells bind `@_source` and `@_target` IDs rather than hardcoded pixels, preserving graph topology.',
        highlightIds: partIds,
        wireIds,
        tokenIds: edges.map((e) => `dio_e_${e['@_id']}`),
      },
    ],
  };
}

// =============================================================================
// 5. SCALABLE VECTOR GRAPHICS XML ADAPTER (.svg)
// =============================================================================
export function parseSvgXml(rawXml) {
  const parser = createParser();
  const ast = parser.parse(rawXml);
  const svgNode = ast.svg || {};
  const viewBox = svgNode['@_viewBox'] || '0 0 240 160';

  const domDoc = new DOMParser().parseFromString(rawXml, 'image/svg+xml');
  const rawShapes = Array.from(domDoc.querySelectorAll('path, rect, circle, polygon, line'));

  const shapesMarkup = rawShapes
    .map((el, idx) => {
      const clone = el.cloneNode(true);
      clone.setAttribute('id', `part_svg_${idx}`);
      clone.classList.add('file-part', 'svg-drawable-shape');
      if (!clone.getAttribute('stroke')) clone.setAttribute('stroke', '#38bdf8');
      if (!clone.getAttribute('stroke-width')) clone.setAttribute('stroke-width', '2.5');
      return clone.outerHTML;
    })
    .join('');

  let inner = drawLayerHeader({ x: 20, y: 20, label: 'BACKEND SVG MATH TAGS -> FRONTEND CRISP VECTOR RENDER', color: '#ff4b4b' });
  inner += drawPartCard({
    id: 'part_svg_meta',
    x: 20,
    y: 34,
    w: 230,
    h: 165,
    title: `<svg viewBox>`,
    subtitle: `${viewBox} (${rawShapes.length} shapes)`,
    badge: 'VECTOR XML',
    color: '#ff4b4b',
  });
  inner += drawWire({ id: 'wire_svg_pipe', points: '250,116 300,116', color: '#38bdf8' });

  inner += `
    <g transform="translate(300, 34)">
      <g id="part_svg_frame" class="file-part" style="transform-box: fill-box; transform-origin: center;">
        <rect x="0" y="0" width="360" height="165" rx="10" fill="#06080d" stroke="#38bdf8" stroke-width="1.8" />
        <svg x="10" y="10" width="340" height="145" viewBox="${esc(viewBox)}">
          ${shapesMarkup}
        </svg>
      </g>
    </g>
  `;

  const partIds = rawShapes.map((_, idx) => `#part_svg_${idx}`);
  const rawTokens = [
    { id: 'svg_vb', label: '<svg viewBox>', text: `<svg viewBox="${viewBox}">` },
    ...rawShapes.map((el, idx) => ({
      id: `svg_sh_${idx}`,
      label: `<${el.tagName}>`,
      text: el.outerHTML.slice(0, 110),
    })),
  ];

  return {
    formatId: 'svg',
    title: 'Scalable Vector Graphics (.svg)',
    badge: 'Vector XML',
    ast,
    svgMarkup: wrapSvg(690, 230, inner),
    rawTokens,
    steps: [
      {
        title: '1. Math Canvas Coordinates (viewBox)',
        kidText: 'An SVG file contains zero pixels! The browser reads the viewBox math rules and draws razor-sharp lines at any zoom level.',
        engText: '`viewBox` establishes the abstract coordinate space that scales losslessly to any physical DPI.',
        highlightIds: ['#part_svg_meta', '#part_svg_frame', ...partIds],
        wireIds: ['#wire_svg_pipe'],
        tokenIds: ['svg_vb'],
      },
      {
        title: '2. Tracing Vector Commands With Anime.js',
        kidText: 'Watch the browser’s virtual pen follow every <rect>, <circle>, and <path> command in the file!',
        engText: 'Anime.js `svg.createDrawable()` animates `stroke-dashoffset` across all extracted vector primitives.',
        highlightIds: ['#part_svg_frame', ...partIds],
        wireIds: ['#wire_svg_pipe'],
        tokenIds: rawShapes.map((_, idx) => `svg_sh_${idx}`),
        drawSelector: '.svg-drawable-shape',
      },
    ],
  };
}

// =============================================================================
// 6. MARKUP FAMILY XML ADAPTER (.rss / .xhtml / Generic Markup)
// =============================================================================
export function parseMarkupXml(rawXml) {
  const parser = createParser();
  const ast = parser.parse(rawXml);
  const rootKey = Object.keys(ast).find((k) => !k.startsWith('?')) || 'rss';
  const rootNode = ast[rootKey] || {};
  const channel = rootNode.channel || rootNode.body || rootNode;
  const items = asArray(channel.item || channel.section || channel.article || []);

  let inner = drawLayerHeader({ x: 20, y: 20, label: 'BACKEND NESTED MARKUP -> FRONTEND FEED / PAGE UI', color: '#34d399' });
  inner += drawPartCard({ id: 'part_mk_root', x: 230, y: 34, w: 230, h: 78, title: `<${rootKey}> Root`, subtitle: 'Single Root Container', badge: 'TREE ROOT', color: '#ff4b4b' });
  inner += drawPartCard({ id: 'part_mk_head', x: 40, y: 158, w: 270, h: 82, title: String(channel.title || 'Header Metadata'), subtitle: 'Parsed from <channel><title>', badge: 'APP TITLE UI', color: '#38bdf8' });
  inner += drawPartCard({ id: 'part_mk_items', x: 375, y: 158, w: 280, h: 82, title: `${items.length} Feed Episodes / Items`, subtitle: items[0]?.title || 'Article List', badge: 'APP LIST UI', color: '#34d399' });

  inner += drawWire({ id: 'wire_mk_1', points: '345,112 345,135 175,135 175,158', color: '#38bdf8' });
  inner += drawWire({ id: 'wire_mk_2', points: '345,112 345,135 515,135 515,158', color: '#34d399' });

  const rawTokens = [
    { id: 'mk_root', label: `<${rootKey}>`, text: `<${rootKey}>...</${rootKey}>` },
    { id: 'mk_meta', label: '<title>', text: `<title>${channel.title || 'Channel'}</title>` },
    { id: 'mk_items', label: `<item> ×${items.length}`, text: items.map((it) => `<item><title>${it.title || 'Entry'}</title></item>`).join(' ') },
  ];

  return {
    formatId: 'markup',
    title: 'Markup XML / RSS / XHTML (.xml)',
    badge: 'Markup Tree',
    ast,
    svgMarkup: wrapSvg(690, 265, inner),
    rawTokens,
    steps: [
      {
        title: '1. Nesting Dolls Root Tag',
        kidText: 'Podcast apps and web browsers are Frontends! They start at the outer <rss> or <html> box and open nested tags inside.',
        engText: 'XML enforces a strict single-root tree parsed into nested JS objects by `fast-xml-parser`.',
        highlightIds: ['#part_mk_root'],
        wireIds: [],
        tokenIds: ['mk_root'],
      },
      {
        title: '2. Metadata + Repeating List Cards',
        kidText: 'Your podcast app turns <title> into the show banner and turns every <item> tag into a clickable episode card!',
        engText: 'Separating header metadata from repeating <item> arrays lets any client render structured feeds uniformly.',
        highlightIds: ['#part_mk_head', '#part_mk_items'],
        wireIds: ['#wire_mk_1', '#wire_mk_2'],
        tokenIds: ['mk_meta', 'mk_items'],
      },
    ],
  };
}
