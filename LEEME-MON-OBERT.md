# Món obert: Observació — notas de esta versión

## Publicar (GitHub Pages bajo /PF/)
1. Descomprime el ZIP: `index.html`, `anomaly3d.js`, `sw.js`, `game3d/`, `assets/` quedan **directamente en la raíz** (no dentro de `pf/`).
2. Sustituye el contenido del repositorio por estos archivos, commit y push. Subir el ZIP NO actualiza la web.
3. Espera al despliegue; abre la web en pestaña privada. Con `?debug` en la URL (…/PF/?debug) el juego muestra qué GLB y qué Three.js usa; en consola: `window.__PF_MODELS`.
4. (Recomendado) Three.js: `npm i three@0.170.0 && node tools/vendor-three.mjs` y sube `vendor/three/`. Sin eso se usa el CDN jsDelivr con versión fija 0.170.0 (único recurso remoto, necesita internet).

## Modelos
- Naruto original: 124 MB, 24 texturas 4096² (~2,1 GB de GPU) → no cabe en GitHub (límite 100 MB) ni en móvil.
- Usado en PC: `naruto_uzumaki_running_animation.glb` (19,7 MB, texturas 1K). Verificado con `tools/glb_tools.py compare`: geometría, esqueleto (66 huesos), materiales y animación (70 canales) **idénticos byte a byte** al original; solo cambian las texturas (reducción 4K→1K).
- Usado en móvil: `…_mobile.glb` (9,2 MB, texturas 512, generado con `tools/glb_tools.py shrink`; mismo rig/animación).
- Terrifying: `terrifying_hooded_horror_woman.glb` (5,7 MB, 2K) en todos los dispositivos. Su variante de 3,5 MB tiene la misma geometría.
- Ambos GLB solo traen un clip de carrera: sin reposo, Naruto se congela en el fotograma 0 (pies juntos) y la carrera se acelera/ralentiza según la velocidad. No se inventan clips.

## Errores corregidos
- El «Asta» era `makeCharacter()`, siempre añadido a la escena y sustituido solo si el GLB cargaba; el fallo se silenciaba. Eliminado: ahora, si falla un GLB, se muestra un error con archivo y causa y el juego no arranca.
- Three.js/GLTFLoader venían de esm.sh por separado: ahora un único importmap (local o CDN fijo).
- Eliminado `world3d.js` (Campus 3D, sin entrada de menú). Un solo modo: «Món obert: Observació».
- Salas, puertas, colisiones, anomalías, alarma, persecución y mensajes reescritos en módulos (`game3d/`) con un único sistema de estados.
- Service worker: caché v14; assets pesados cache-first, código network-first.

## Pruebas realizadas (de verdad)
- `node tests/core-sim.mjs`: 44 comprobaciones sobre el núcleo real (sala 1 sin pregunta, pregunta solo en sala 2, respuesta correcta/incorrecta, explicación derivada de los datos, alarma, puertas que se cierran y bloquean, aparición a ≥6 m, persecución A* sin teletransporte ni salir de la sala, captura, fin, reinicio, pausa, anti-túnel).
- `node tests/static-check.mjs`, análisis de los GLB con Python.

## NO probado (limitaciones)
- **No pude ejecutar el render 3D**: este entorno no tiene red ni Three.js. Escena, carga de GLB con GLTFLoader, animaciones, cámara, controles táctiles, pantalla completa y audio **no se han probado en navegador**. Pueden aparecer errores que hay que revisar con `?debug` y la consola.
- Orientación (+Z frente) y escala de los modelos deducidas del esqueleto, no vistas.
- El Naruto original de 124 MB no está en el ZIP.
- iPhone: sin API de pantalla completa; se usa modo página completa.
