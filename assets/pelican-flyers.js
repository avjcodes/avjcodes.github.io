// Flyer pole: this week's shows stapled to a pole, tonight's on top.
// Procedural three.js, flyer faces drawn to canvas textures, no assets. Respects prefers-reduced-motion.
import * as THREE from './vendor/three.module.min.js';

export function mountFlyerPole(canvas) {
  const css = getComputedStyle(document.documentElement);
  const read = (v, fb) => (css.getPropertyValue(v).trim() || fb);
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const red = read('--red', '#b8321f'), ink = read('--ink', '#1a1816'), paper = read('--paper', '#fbf8f1');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  cam.position.set(0.35, 0.25, 11.2); cam.lookAt(0, 0.02, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6f685e, dark ? 1.2 : 1.7));
  const key = new THREE.DirectionalLight(0xffffff, dark ? 1.4 : 1.6); key.position.set(-3, 5, 6); scene.add(key);

  // the pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.54, 14, 28), new THREE.MeshStandardMaterial({ color: dark ? '#2e2a25' : '#a3978a', roughness: 0.95 }));
  pole.position.set(0, 0, -1.1); scene.add(pole);

  function face(show, i) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 704; const g = c.getContext('2d');
    g.fillStyle = i === 0 ? paper : (dark ? '#2a2622' : '#efe9dc'); g.fillRect(0, 0, c.width, c.height);
    // printed border
    g.strokeStyle = ink; g.lineWidth = i === 0 ? 10 : 6; g.strokeRect(22, 22, c.width - 44, c.height - 44);
    g.fillStyle = ink; g.textAlign = 'center';
    g.font = '700 34px ui-monospace, Consolas, monospace';
    g.fillText((show.when || '').toUpperCase(), c.width / 2, 96);
    // band name, wrapped, big
    g.fillStyle = i === 0 ? red : ink;
    g.font = '700 78px "Clash Display", system-ui, sans-serif';
    const words = (show.name || '').toUpperCase().split(' '); const lines = []; let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > 440 && line) { lines.push(line); line = w; } else line = t; }
    lines.push(line);
    let y = 230; for (const l of lines.slice(0, 4)) { g.fillText(l, c.width / 2, y); y += 84; }
    g.fillStyle = ink; g.font = '700 30px ui-monospace, Consolas, monospace';
    g.fillText(((show.time ? show.time + '  ·  ' : '') + (show.cover || '')).toUpperCase(), c.width / 2, c.height - 120);
    g.font = '500 26px ui-monospace, Consolas, monospace';
    g.fillText('THE BRASS PELICAN', c.width / 2, c.height - 64);
    // staples
    g.fillStyle = '#9a9a9a'; [[90, 40], [c.width - 110, 40]].forEach(([x, yy]) => g.fillRect(x, yy, 22, 6));
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; return tx;
  }

  let sheets = [];
  function build(shows) {
    sheets.forEach(s => { scene.remove(s.m); s.m.material.map.dispose(); s.m.material.dispose(); });
    sheets = shows.slice(0, 3).map((show, i) => {
      const geo = new THREE.PlaneGeometry(1.9, 2.6, 1, 1);
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: face(show, i), roughness: 0.92, side: THREE.FrontSide }));
      const rest = { u: i === 0 ? 0 : (i % 2 ? -1 : 1.02), y: i === 0 ? 0.2 : -0.28, z: 0.3 - i * 0.08, r: i === 0 ? -0.03 : (i % 2 ? 0.11 : -0.13) };
      if (i > 0) m.scale.setScalar(0.86);
      m.position.set(rest.u * spread, rest.y + 1.5, rest.z); m.rotation.z = rest.r; // drops in from above
      m.renderOrder = 10 - i;
      scene.add(m); return { m, rest, cur: { x: rest.u * spread, y: rest.y + (reduce ? 0 : 1.5), r: rest.r } };
    });
    kick();
  }

  let hover = 0, hoverT = 0, raf = 0, running = true, spread = 1.4;
  const ease = (a, b, k) => a + (b - a) * k;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h; const a = w / h;
    cam.position.z = a < 0.9 ? 11.2 * (0.9 / a) : 11.2;
    cam.updateProjectionMatrix();
    // widest a back sheet may sit and still show its whole face
    const sheetHalf = 0.95 * 0.86 * Math.cos(0.13) + 1.3 * 0.86 * Math.sin(0.13); // rotated back sheet
    const frontHalfRot = 0.95 * Math.cos(0.03) + 1.3 * Math.sin(0.03);            // tonight sheet, as drawn
    const textHalf = (440 / 512) * (1.9 * 0.86) / 2;                              // headline box on a back sheet
    const need = frontHalfRot + textHalf * Math.cos(0.13) + 0.06;                 // headline clears the front sheet
    const required = need + sheetHalf + 0.08;     // ...and its outer edge stays inside the frame
    const halfAt = (z) => Math.tan((cam.fov * Math.PI / 180) / 2) * z * a;
    if (halfAt(cam.position.z) < required) cam.position.z *= required / halfAt(cam.position.z);
    cam.updateProjectionMatrix();
    spread = need;                                // fixed distance: the pile always hugs the pole
    kick();
  }
  new ResizeObserver(() => { resize(); if (reduce) frame(true); }).observe(canvas); resize();
  function kick() { if (!raf && running && !reduce) raf = requestAnimationFrame(() => frame(false)); else if (reduce) frame(true); }
  function frame(once) {
    let moving = false; hoverT = ease(hoverT, hover, 0.08);
    sheets.forEach((s, i) => {
      const k = reduce ? 1 : (i === 0 ? 0.1 : 0.085);
      const ty = s.rest.y, tx = s.rest.u * spread, tr = s.rest.r + (i === 0 ? 0 : hoverT * (i % 2 ? 0.08 : -0.08));
      const tz = s.rest.z + (i === 0 ? hoverT * 0.25 : 0);
      s.cur.y = ease(s.cur.y, ty, k); s.cur.x = ease(s.cur.x, tx, k); s.cur.r = ease(s.cur.r, tr, k); s.cur.z = ease(s.cur.z === undefined ? tz : s.cur.z, tz, k);
      s.m.position.set(s.cur.x, s.cur.y, s.cur.z); s.m.rotation.z = s.cur.r;
      if (Math.abs(s.cur.y - ty) > 0.001 || Math.abs(s.cur.r - tr) > 0.0005 || Math.abs(s.cur.z - tz) > 0.001) moving = true;
    });
    if (Math.abs(hoverT - hover) > 0.001) moving = true;
    renderer.render(scene, cam); raf = 0;
    if (!once && running && !reduce && moving) raf = requestAnimationFrame(() => frame(false));
  }
  if (!reduce) {
    new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running) kick(); }).observe(canvas);
    canvas.addEventListener('pointerenter', () => { hover = 1; kick(); });
    canvas.addEventListener('pointerleave', () => { hover = 0; kick(); });
  }
  return { set: build };
}
