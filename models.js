/* Carga de los GLB originales (Naruto y Terrifying). NUNCA sustituye un modelo por una figura provisional:
   si falla, lanza ModelError con el archivo, la URL y la causa. */
export class ModelError extends Error { constructor(label, url, cause) { super(`${label}: ${cause?.message || cause}`); this.label = label; this.url = url; this.cause = cause; } }

export const MODEL_SPECS = {
  naruto: { label: 'Naruto', files: { high: 'assets/characters/naruto_uzumaki_running_animation.glb', low: 'assets/characters/naruto_uzumaki_running_animation_mobile.glb' }, height: 1.78, bindHeight: 175.02, idleTime: 0, minBones: 50 },
  terrifying: { label: 'Terrifying', files: { high: 'assets/characters/terrifying_hooded_horror_woman.glb', low: 'assets/characters/terrifying_hooded_horror_woman.glb' }, height: 2.05, bindHeight: 169.78, idleTime: 0, minBones: 20 },
};

export async function loadCharacter(THREE, GLTFLoader, key, quality, onProgress, maxAniso = 4) {
  const spec = MODEL_SPECS[key], rel = spec.files[quality] || spec.files.high, url = new URL(rel, document.baseURI).href;
  let gltf;
  try { gltf = await new GLTFLoader().loadAsync(url, ev => { if (ev && ev.total > 0) onProgress?.(ev.loaded / ev.total); }); }
  catch (e) { throw new ModelError(spec.label, url, e); }
  const root = gltf.scene; let skinned = 0, bones = 0, meshes = 0; const mats = new Set(), texs = new Set();
  root.traverse(o => {
    if (o.isMesh) { meshes++; o.frustumCulled = false; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { mats.add(m); for (const k of ['map', 'normalMap', 'emissiveMap', 'metalnessMap', 'roughnessMap', 'aoMap']) if (m[k]) { m[k].anisotropy = maxAniso; texs.add(m[k]); } }); }
    if (o.isSkinnedMesh) { skinned++; bones = Math.max(bones, o.skeleton.bones.length); }
  });
  const problems = [];
  if (!skinned) problems.push('el GLB no contiene malla con esqueleto (SkinnedMesh)');
  if (bones < spec.minBones) problems.push(`esqueleto con ${bones} huesos (mínimo esperado ${spec.minBones})`);
  if (!gltf.animations.length) problems.push('el GLB no contiene animaciones');
  if (!mats.size || !texs.size) problems.push('el GLB cargó sin materiales o sin texturas');
  if (problems.length) throw new ModelError(spec.label, url, new Error(problems.join('; ')));
  const scale = spec.height / spec.bindHeight; root.scale.setScalar(scale);
  const holder = new THREE.Group(); holder.add(root); // +Z es el frente del modelo en ambos GLB (comprobado en el esqueleto)
  const mixer = new THREE.AnimationMixer(root), clip = gltf.animations[0], action = mixer.clipAction(clip); action.play(); action.time = spec.idleTime; action.timeScale = 0; mixer.update(0);
  const report = { key, label: spec.label, url, variant: quality, bytes: null, skinnedMeshes: skinned, bones, meshes, materials: mats.size, textures: texs.size, clips: gltf.animations.map(a => `${a.name} (${a.duration.toFixed(2)} s, ${a.tracks.length} pistas)`), scale, heightMeters: spec.height };
  return { holder, root, mixer, action, clip, report, spec };
}
