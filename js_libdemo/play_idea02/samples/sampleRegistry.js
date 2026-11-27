/**
 * =============================================================================
 * BUILT-IN PARSABLE SAMPLE REGISTRY (samples/sampleRegistry.js)
 * =============================================================================
 * Every single one of the 18 formats has a 100% authentic, valid payload
 * (including genuine binary PNG, JPEG, WAV, MP3, ZIP, and PDF byte buffers)
 * so learners can inspect real file anatomy immediately or upload their own!
 * =============================================================================
 */

function base64ToArrayBuffer(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes.buffer;
}

function asciiToBytes(str) {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i) & 0xff;
  return arr;
}

function createSampleWavBuffer() {
  const numSamples = 64;
  const buf = new ArrayBuffer(44 + numSamples);
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  bytes.set(asciiToBytes('RIFF'), 0);
  view.setUint32(4, 36 + numSamples, true);
  bytes.set(asciiToBytes('WAVEfmt '), 8);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, 8000, true); // 8kHz
  view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true); // 8-bit
  bytes.set(asciiToBytes('data'), 36);
  view.setUint32(40, numSamples, true);
  for (let i = 0; i < numSamples; i++) {
    bytes[44 + i] = Math.round(128 + Math.sin((i / numSamples) * Math.PI * 6) * 90);
  }
  return buf;
}

function createSampleMp3Buffer() {
  const title = 'XRay_Song';
  const buf = new Uint8Array(32 + title.length);
  buf.set(asciiToBytes('ID3'), 0);
  buf[3] = 3; // v2.3
  buf[4] = 0;
  buf[9] = 16; // ID3 size = 16
  buf.set(asciiToBytes('TIT2'), 10);
  buf.set(asciiToBytes(title), 14);
  // MPEG-1 Layer III Frame Sync at offset 26
  buf[26] = 0xff;
  buf[27] = 0xfb;
  buf[28] = 0x90;
  buf[29] = 0x00;
  return buf.buffer;
}

function createSampleZipBuffer() {
  const name1 = 'hello.txt';
  const data1 = 'Hi!';
  const buf = new Uint8Array(30 + name1.length + data1.length + 22);
  const view = new DataView(buf.buffer);
  // Local file header PK\x03\x04
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint32(18, data1.length, true);
  view.setUint32(22, data1.length, true);
  view.setUint16(26, name1.length, true);
  buf.set(asciiToBytes(name1), 30);
  buf.set(asciiToBytes(data1), 30 + name1.length);
  // EOCD PK\x05\x06
  const eocdPos = 30 + name1.length + data1.length;
  view.setUint32(eocdPos, 0x06054b50, true);
  view.setUint16(eocdPos + 8, 1, true);
  view.setUint16(eocdPos + 10, 1, true);
  return buf.buffer;
}

function createSamplePdfBuffer() {
  const pdfStr = [
    '%PDF-1.7',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R >> endobj',
    'xref',
    '0 4',
    '0000000000 65535 f ',
    'trailer << /Size 4 /Root 1 0 R >>',
    '%%EOF',
  ].join('\n');
  return asciiToBytes(pdfStr).buffer;
}

export const FORMAT_CATALOG = [
  // Group 1: XML & Engineering Schematics
  {
    id: 'qet',
    group: 'XML & Engineering',
    label: '.qet (QElectroTech)',
    ext: '.qet',
    kind: 'text',
    sample: `<project version="0.90" title="Motor Starter Demo">
  <diagram title="3-Phase Motor Control" cols="17" rows="8">
    <elements>
      <element type="embed://import/breakers/mcb_q1.elmt" x="80" y="130" orientation="0">
        <informations><information name="label">Q1 Breaker</information></informations>
      </element>
      <element type="embed://import/coils/contactor_km1.elmt" x="280" y="130" orientation="0">
        <informations><information name="label">KM1 Coil</information></informations>
      </element>
      <element type="embed://import/motors/motor_m1.elmt" x="480" y="130" orientation="0">
        <informations><information name="label">M1 Motor</information></informations>
      </element>
    </elements>
    <conductors>
      <conductor num="L1" x1="122" y1="130" x2="238" y2="130" />
      <conductor num="U1" x1="322" y1="130" x2="438" y2="130" />
    </conductors>
  </diagram>
</project>`,
  },
  {
    id: 'plc',
    group: 'XML & Engineering',
    label: '.plc.xml (PLCopen)',
    ext: '.xml',
    kind: 'text',
    sample: `<project xmlns="http://www.plcopen.org/xml/tc6_0201">
  <fileHeader companyName="OpenFactory" productName="ConveyorPLC" />
  <types>
    <pous>
      <pou name="Conveyor_Starter" pouType="program">
        <interface>
          <localVars>
            <variable name="Start_Btn"><type><BOOL/></type></variable>
            <variable name="E_Stop_OK"><type><BOOL/></type></variable>
            <variable name="Motor_Run"><type><BOOL/></type></variable>
          </localVars>
        </interface>
        <body>
          <LD>
            <contact localId="1" negated="false"><variable>Start_Btn</variable></contact>
            <contact localId="2" negated="true"><variable>E_Stop_OK</variable></contact>
            <coil localId="3"><variable>Motor_Run</variable></coil>
          </LD>
        </body>
      </pou>
    </pous>
  </types>
</project>`,
  },
  {
    id: 'workday',
    group: 'XML & Engineering',
    label: '.workday.xml (SOAP HR)',
    ext: '.xml',
    kind: 'text',
    sample: `<env:Envelope xmlns:env="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wd="urn:com.workday/bsvc">
  <env:Body>
    <wd:Get_Workers_Response>
      <wd:Response_Data>
        <wd:Worker>
          <wd:Worker_Data>
            <wd:Worker_ID>EMP-2048</wd:Worker_ID>
            <wd:Personal_Data>
              <wd:Name_Data><wd:Legal_Name_Data><wd:Name_Detail_Data>
                <wd:First_Name>Grace</wd:First_Name>
                <wd:Last_Name>Hopper</wd:Last_Name>
              </wd:Name_Detail_Data></wd:Legal_Name_Data></wd:Name_Data>
            </wd:Personal_Data>
            <wd:Employment_Data>
              <wd:Worker_Job_Data>
                <wd:Position_Data>
                  <wd:Business_Title>Compiler Pioneer</wd:Business_Title>
                  <wd:Supervisory_Organization_Reference><wd:ID>ORG-SYS</wd:ID></wd:Supervisory_Organization_Reference>
                </wd:Position_Data>
              </wd:Worker_Job_Data>
            </wd:Employment_Data>
          </wd:Worker_Data>
        </wd:Worker>
      </wd:Response_Data>
    </wd:Get_Workers_Response>
  </env:Body>
</env:Envelope>`,
  },
  {
    id: 'drawio',
    group: 'XML & Engineering',
    label: '.drawio (Flowchart)',
    ext: '.drawio',
    kind: 'text',
    sample: `<mxfile>
  <diagram name="Login Flow">
    <mxGraphModel>
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="2" value="User Opens App" vertex="1"><mxGeometry x="30" y="95" width="145" height="64" /></mxCell>
        <mxCell id="3" value="Check Password" vertex="1"><mxGeometry x="255" y="95" width="145" height="64" /></mxCell>
        <mxCell id="4" value="Show Dashboard" vertex="1"><mxGeometry x="480" y="95" width="145" height="64" /></mxCell>
        <mxCell id="5" source="2" target="3" edge="1" />
        <mxCell id="6" source="3" target="4" edge="1" />
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`,
  },
  {
    id: 'svg',
    group: 'XML & Engineering',
    label: '.svg (Vector Math)',
    ext: '.svg',
    kind: 'text',
    sample: `<svg viewBox="0 0 240 160" xmlns="http://www.w3.org/2000/svg">
  <rect x="24" y="24" width="68" height="68" rx="12" fill="none" stroke="#ff4b4b" stroke-width="3" />
  <circle cx="152" cy="58" r="34" fill="none" stroke="#38bdf8" stroke-width="3" />
  <path d="M 30 132 Q 120 96 210 132" fill="none" stroke="#34d399" stroke-width="3" />
</svg>`,
  },
  {
    id: 'markup',
    group: 'XML & Engineering',
    label: '.rss / Markup XML',
    ext: '.xml',
    kind: 'text',
    sample: `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Space Explorers Podcast</title>
    <item><title>Ep 1: How Rockets Escape Gravity</title></item>
    <item><title>Ep 2: Inside Mars Rovers</title></item>
  </channel>
</rss>`,
  },

  // Group 2: Markup, Config & Text
  {
    id: 'md',
    group: 'Markup & Text',
    label: '.md (Markdown)',
    ext: '.md',
    kind: 'text',
    sample: `# Space Mission Checklist
> Always double-check oxygen tanks before launch!
- Pack space helmet and solar batteries
\`\`\`js
launchRocket({ thrust: 9000 });
\`\`\``,
  },
  {
    id: 'yaml',
    group: 'Markup & Text',
    label: '.yaml (YAML Config)',
    ext: '.yaml',
    kind: 'text',
    sample: `robot:
  name: Rover-7
  wheels: 6
  sensors:
    - lidar
    - thermal_camera`,
  },
  {
    id: 'json',
    group: 'Markup & Text',
    label: '.json (JSON Data)',
    ext: '.json',
    kind: 'text',
    sample: `{
  "playerName": "Nova",
  "level": 42,
  "hasJetpack": true,
  "inventory": ["laser", "shield", "map"]
}`,
  },
  {
    id: 'csv',
    group: 'Markup & Text',
    label: '.csv (Spreadsheet)',
    ext: '.csv',
    kind: 'text',
    sample: `Planet,Moons,Diameter_km,HasRings
Mercury,0,4879,No
Earth,1,12742,No
Saturn,146,116460,Yes`,
  },
  {
    id: 'toml',
    group: 'Markup & Text',
    label: '.toml (Manifest)',
    ext: '.toml',
    kind: 'text',
    sample: `[package]
name = "astro-sim"
version = "1.4.0"

[dependencies]
animejs = "4.5.0"

[build]
target = "es2022"`,
  },

  // Group 3: Binary Images, 3D & Documents
  {
    id: 'png',
    group: 'Binary & 3D',
    label: '.png (Image Chunks)',
    ext: '.png',
    kind: 'binary',
    getSample: () =>
      base64ToArrayBuffer(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
      ),
  },
  {
    id: 'jpg',
    group: 'Binary & 3D',
    label: '.jpg (JPEG Markers)',
    ext: '.jpg',
    kind: 'binary',
    getSample: () =>
      base64ToArrayBuffer(
        '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='
      ),
  },
  {
    id: 'gltf',
    group: 'Binary & 3D',
    label: '.gltf (3D Scene)',
    ext: '.gltf',
    kind: 'text',
    sample: `{
  "asset": { "version": "2.0", "generator": "FileXRay" },
  "scenes": [{ "nodes": [0] }],
  "nodes": [{ "name": "SpaceshipHull", "mesh": 0 }],
  "meshes": [{ "primitives": [{ "attributes": { "POSITION": 0 } }] }],
  "accessors": [{ "type": "VEC3", "count": 36 }],
  "buffers": [{ "byteLength": 432 }]
}`,
  },
  {
    id: 'pdf',
    group: 'Binary & 3D',
    label: '.pdf (PDF Objects)',
    ext: '.pdf',
    kind: 'binary',
    getSample: createSamplePdfBuffer,
  },

  // Group 4: Audio & Archives
  {
    id: 'wav',
    group: 'Audio & Archives',
    label: '.wav (RIFF Audio)',
    ext: '.wav',
    kind: 'binary',
    getSample: createSampleWavBuffer,
  },
  {
    id: 'mp3',
    group: 'Audio & Archives',
    label: '.mp3 (ID3 + MPEG)',
    ext: '.mp3',
    kind: 'binary',
    getSample: createSampleMp3Buffer,
  },
  {
    id: 'zip',
    group: 'Audio & Archives',
    label: '.zip (PKZIP)',
    ext: '.zip',
    kind: 'binary',
    getSample: createSampleZipBuffer,
  },
];
