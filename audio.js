/* Audio procedural (WebAudio): sin archivos que cargar, se crea tras un gesto del usuario. */
export function createAudio() {
  let ac = null, master = null, muted = false, amb = null, siren = null, beat = 0, stepT = 0; try { muted = localStorage.getItem('pf-anom-mute') === '1'; } catch {}
  const ensure = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = muted ? 0 : .8; master.connect(ac.destination); } catch { ac = null; } } if (ac && ac.state === 'suspended') ac.resume().catch(() => {}); return ac; };
  const noiseBuf = () => { const b = ac.createBuffer(1, ac.sampleRate * 1, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; };
  const tone = (f, d = .15, type = 'sine', v = .15, to = 0, delay = 0) => { if (!ensure()) return; const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g).connect(master); o.start(t); o.stop(t + d + .02); };
  const burst = (d = .15, v = .2, lp = 1800, hp = 0) => { if (!ensure()) return; const t = ac.currentTime, s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter(); s.buffer = noiseBuf(); f.type = 'lowpass'; f.frequency.value = lp; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + d + .02); };
  const api = {
    unlock() { ensure(); }, get muted() { return muted; },
    setMuted(m) { muted = m; try { localStorage.setItem('pf-anom-mute', m ? '1' : '0'); } catch {} if (master) master.gain.value = m ? 0 : .8; },
    ambient(on) {
      if (!ensure()) return; if (!on) { amb?.forEach(n => { try { n.stop(); } catch {} }); amb = null; return; } if (amb) return;
      const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter(); s.buffer = noiseBuf(); s.loop = true; f.type = 'lowpass'; f.frequency.value = 380; g.gain.value = .05; s.connect(f).connect(g).connect(master); s.start();
      const o = ac.createOscillator(), og = ac.createGain(); o.type = 'sawtooth'; o.frequency.value = 50; og.gain.value = .012; o.connect(og).connect(master); o.start(); amb = [s, o];
    },
    sfx(name) {
      switch (name) {
        case 'door': burst(.5, .22, 600); tone(110, .25, 'square', .08, 60); break;
        case 'ok': tone(660, .12, 'triangle', .18); tone(990, .2, 'triangle', .18, 0, .09); break;
        case 'wrong': tone(180, .45, 'sawtooth', .2, 70); break;
        case 'jump': tone(300, .12, 'sine', .08, 520); break;
        case 'spawn': tone(55, 1.4, 'sawtooth', .28, 38); burst(.9, .3, 900); tone(900, .7, 'square', .06, 120, .1); break;
        case 'capture': burst(.5, .45, 3000); tone(70, .9, 'sawtooth', .35, 30); tone(1400, .4, 'square', .12, 200); break;
        case 'win': [523, 659, 784, 1046].forEach((f, i) => tone(f, .25, 'triangle', .16, 0, i * .12)); break;
      }
    },
    alarm(on) {
      if (!ensure()) return; if (!on) { if (siren) { try { siren.o.stop(); } catch {} siren = null; } return; } if (siren) return;
      const o = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain(); o.type = 'sawtooth'; o.frequency.value = 760; g.gain.value = .07; lfo.frequency.value = 1.3; lg.gain.value = 170; lfo.connect(lg).connect(o.frequency); o.connect(g).connect(master); o.start(); lfo.start(); siren = { o, lfo };
    },
    step(dt, moving, sprint, grounded) { stepT -= dt; if (moving && grounded && stepT <= 0) { burst(.07, .1, 900); stepT = sprint ? .27 : .4; } },
    chase(dt, dist) { beat -= dt; const interval = Math.max(.28, Math.min(1, dist / 12)); if (beat <= 0) { tone(60, .14, 'sine', .3, 45); tone(52, .14, 'sine', .22, 40, .16); beat = interval; } },
    stop() { api.ambient(false); api.alarm(false); },
    close() { api.stop(); try { ac?.close(); } catch {} ac = null; master = null; },
  };
  return api;
}
