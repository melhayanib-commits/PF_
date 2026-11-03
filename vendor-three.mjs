// Copia Three.js 0.170.0 a vendor/three/ para no depender del CDN. Uso: npm i three@0.170.0 && node tools/vendor-three.mjs
import fs from 'node:fs';
const src='node_modules/three/', dst='vendor/three/';
for(const f of ['build/three.module.js','examples/jsm/loaders/GLTFLoader.js','examples/jsm/utils/BufferGeometryUtils.js','LICENSE']){fs.mkdirSync(dst+f.split('/').slice(0,-1).join('/'),{recursive:true});fs.copyFileSync(src+f,dst+f)}
console.log('vendor/three listo. Súbelo al repositorio junto al resto.');
