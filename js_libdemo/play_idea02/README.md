# File Anatomy X-Ray Studio (`play_idea02`)

A single-page interactive scrollytelling studio designed to teach **kids, students, and engineers** what actually lives inside **18 different file formats**—combining **`animejs` v4.5.0**, **`scrollama` v3.2.0**, **`fast-xml-parser` v5.12.1**, **`svg-pan-zoom` v3.6.2**, and sovereign **`Uint8Array` / `DataView`** binary parsers.

## How to Run (Windows DOS / `cmd.exe`)

From the `js_libdemo` root directory:

```cmd
npx vite play_idea02
```

---

## 18 Supported File Formats (Built-in Samples + Real File Upload)

### 1. XML & Engineering Schematics (`fast-xml-parser`)
- **`.qet`** — QElectroTech Electrical Schematics (`<project>`, `<diagram>`, `<element>`, `<conductor>` wire current flow)
- **`.plc.xml`** — PLCopen IEC 61131-3 Industrial Ladder Logic (`<pou>`, `<localVars>`, `<contact>`, `<coil>`)
- **`.workday.xml`** — Workday Enterprise SOAP / HR XML (`env:Envelope`, `wd:Worker_ID`, `wd:Personal_Data`, `wd:Position_Data`)
- **`.drawio`** — diagrams.net / mxGraph Flowcharts (`<mxCell vertex="1">`, `<mxCell edge="1">`)
- **`.svg`** — Scalable Vector Graphics (`viewBox`, `<path>`, `<rect>`, `<circle>` animated with `svg.createDrawable()`)
- **`.rss` / Markup XML** — Nested XML/RSS/XHTML tag trees

### 2. Markup, Config & Structured Text
- **`.md`** — Markdown AST (`# Headings`, `> Quotes`, `- Lists`, Code Fences)
- **`.yaml`** — Indentation-based configuration trees
- **`.json`** — Key-Value Objects `{}`, Arrays `[]`, and Data Types
- **`.csv`** — Comma-separated spreadsheet headers & records
- **`.toml`** — Bracketed `[section]` manifests

### 3. Binary Images, 3D & Documents (`Uint8Array` / `DataView`)
- **`.png`** — 8-byte Magic Signature (`89 50 4E 47...`), `IHDR`, `IDAT`, `IEND` chunks + live decoded preview
- **`.jpg`** — JPEG Marker Stream (`FF D8` SOI, `APP0`, `DQT`, `SOF0`, `SOS`, `FF D9` EOI) + live preview
- **`.gltf`** — glTF 2.0 3D Scene Graph (`scenes -> nodes -> meshes -> accessors -> buffers`)
- **`.pdf`** — `%PDF-1.7` header, numbered indirect objects (`1 0 obj`), `xref` table, `%%EOF`

### 4. Audio & Archives (`Uint8Array` / `DataView`)
- **`.wav`** — `RIFF` / `WAVE` container, `"fmt "` chunk, `"data"` PCM waveform plotted live in SVG
- **`.mp3`** — `ID3v2` metadata tag + `0xFFE` MPEG sync frames
- **`.zip`** — `PK\x03\x04` Local File Headers + `PK\x05\x06` End of Central Directory index

---

## Teaching Features
- **Kid Explorer vs Engineer Mode**: Toggle top-bar explanations between fun visual analogies and byte-level / AST engineering internals.
- **Synchronized Raw X-Ray Strip**: Highlights the exact XML tag, JSON key, or hexadecimal bytes corresponding to the active scroll step.
- **Drag & Drop Any Real File**: Drop your own `.qet`, `.xml`, `.svg`, `.json`, `.png`, `.jpg`, `.wav`, `.mp3`, `.zip`, or `.pdf` onto the window to dissect it live!
