import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
const r=new URL('../',import.meta.url).pathname,rd=f=>fs.readFileSync(r+f,'utf8');
for(const f of ['app.js','games-arcade.js','anomaly3d.js','focusia-local.js','server.mjs','sw.js'])execFileSync(process.execPath,['--check',r+f]);
for(const f of fs.readdirSync(r+'game3d'))execFileSync(process.execPath,['--check',r+'game3d/'+f]);
const html=rd('index.html');assert.ok(!html.includes('world3d.js'));assert.equal((html.match(/data-mode="anomaly"/g)||[]).length,1);assert.ok(!/Campus 3D/.test(html));
for(const a of ['assets/characters/naruto_uzumaki_running_animation.glb','assets/characters/naruto_uzumaki_running_animation_mobile.glb','assets/characters/terrifying_hooded_horror_woman.glb']){assert.ok(fs.existsSync(r+a),a);assert.ok(fs.statSync(r+a).size<100*1024*1024)}
const m=rd('game3d/models.js');for(const a of ['naruto_uzumaki_running_animation.glb','terrifying_hooded_horror_woman.glb'])assert.ok(m.includes(a));
assert.ok(!/esm\.sh/.test(rd('anomaly3d.js')+rd('game3d/main.js')));assert.ok(!rd('game3d/main.js').includes('makeCharacter'));
console.log('STATIC CHECK PASS');
