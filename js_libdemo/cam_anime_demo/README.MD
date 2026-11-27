`camera\_anime\_demo.js` uses bare ES module specifiers (`import \* as THREE from "three"`, `import { animate } from "animejs"`), which browsers cannot resolve directly without either a \*\*local dev bundler (Vite)\*\* or an \*\*HTML `<script type="importmap">\*\*` pointing into `node\_modules/`.



\---



\### Option 1: Vite Dev Server (Recommended — Zero Importmap Boilerplate)



Run this inside your project folder where `package.json` and `node\_modules` live:



1\. \*\*Install Vite:\*\*

```bat

npm install -D vite



```





2\. \*\*Create `index.html` alongside `camera\_anime\_demo.js`:\*\*

```html

<!DOCTYPE html>

<html lang="en">

<head>

&#x20; <meta charset="UTF-8" />

&#x20; <title>Three.js + Anime.js Camera Demo</title>

&#x20; <style>

&#x20;   body { margin: 0; overflow: hidden; background: #121113; }

&#x20; </style>

</head>

<body>

&#x20; <script type="module" src="./camera\_anime\_demo.js"></script>

</body>

</html>



```





3\. \*\*Start the local server:\*\*

```bat

npx vite



```





Open the local URL printed in the terminal (typically `http://localhost:5173`).



