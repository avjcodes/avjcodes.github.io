// Policy stack: five document slabs. The cited one slides out and tilts toward the viewer.
// Procedural three.js, labels drawn to canvas textures, no assets. Respects prefers-reduced-motion.
import * as THREE from './vendor/three.module.min.js';

export function mountPolicyStack(canvas, docs, opts) {
  opts = opts || {};
  const css = getComputedStyle(document.documentElement);
  const read = (v, fb) => (css.getPropertyValue(v).trim() || fb);
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const accent = new THREE.Color(read('--accent', '#1d6b4f'));
  const paper = new THREE.Color(dark ? '#232a26' : '#ffffff');
  const edge = new THREE.Color(dark ? '#343d38' : '#e3e6e1');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  cam.position.set(3.2, 3.6, 4.6); cam.lookAt(0.7, 0.25, 0.1);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x7d8a82, dark ? 1.5 : 1.6));
  const key = new THREE.DirectionalLight(0xffffff, dark ? 1.6 : 1.9); key.position.set(-4, 7, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0xeef6f1, 0.5); fill.position.set(5, 3, -4); scene.add(fill);

  function labelTexture(text) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 672;
    const g = c.getContext('2d');
    g.fillStyle = dark ? '#232a26' : '#ffffff'; g.fillRect(0, 0, c.width, c.height);
    // ruled lines, like a form
    g.strokeStyle = dark ? 'rgba(233,239,235,0.08)' : 'rgba(22,29,25,0.08)'; g.lineWidth = 2;
    for (let y = 200; y < 640; y += 44) { g.beginPath(); g.moveTo(48, y); g.lineTo(464, y); g.stroke(); }
    // title sits at the near-right corner of the sheet (canvas bottom-right = world +x,+z), the corner that clears the stack
    g.fillStyle = dark ? '#e9efeb' : '#161d19';
    g.font = '600 58px "Clash Display", system-ui, sans-serif';
    g.textAlign = 'right';
    const words = text.split(' '); const lines = []; let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (g.measureText(t).width > 420 && line) { lines.push(line); line = w; } else line = t;
    }
    lines.push(line);
    let y = 640 - 48 - (lines.length - 1) * 66;
    for (const l of lines) { g.fillText(l, 464, y); y += 66; }
    g.fillStyle = '#' + accent.getHexString(); g.fillRect(464 - 64, 640 - 48 - (lines.length) * 66 - 6, 64, 10);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
    return tx;
  }

  const W = 1.5, H = 0.05, D = 1.95, GAP = 0.075;
  const slabs = docs.map((name, i) => {
    const geo = new THREE.BoxGeometry(W, H, D);
    const side = new THREE.MeshStandardMaterial({ color: edge, roughness: 0.9 });
    const top = new THREE.MeshStandardMaterial({ map: labelTexture(name), roughness: 0.85 });
    const bottom = new THREE.MeshStandardMaterial({ color: paper, roughness: 0.9 });
    const mesh = new THREE.Mesh(geo, [side, side, top, bottom, side, side]);
    // orange index tab on the right edge, staggered down the stack like a binder
    const tab = new THREE.Mesh(new THREE.BoxGeometry(0.14, H * 0.9, 0.3), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.7 }));
    tab.position.set(W / 2 + 0.06, 0, D / 2 - 0.25 - i * 0.33);
    mesh.add(tab);
    const g = new THREE.Group(); g.add(mesh); scene.add(g);
    const rest = { x: 0, y: (docs.length - 1 - i) * GAP, z: 0, rx: 0, ry: (i - (docs.length - 1) / 2) * 0.025 };
    return { g, rest, cur: { ...rest }, i };
  });

  let active = -1, hover = 0, hoverT = 0, raf = 0, running = true;
  const ease = (a, b, k) => a + (b - a) * k;

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false);
    const a = w / h, v = 1.5; cam.left = -v * a; cam.right = v * a; cam.top = v; cam.bottom = -v; cam.updateProjectionMatrix();
  }
  new ResizeObserver(() => { resize(); if (reduce) frame(true); }).observe(canvas); resize();

  function kick() { if (!raf && running && !reduce) raf = requestAnimationFrame(() => frame(false)); }
  function frame(once) {
    let moving = false;
    hoverT = ease(hoverT, hover, 0.08);
    slabs.forEach((s, i) => {
      const isActive = i === active;
      const fan = (i - (docs.length - 1) / 2) * 0.11 * hoverT;
      // the cited document slides out of the stack to the right, clears the top slab, and tilts toward the viewer
      const topY = (docs.length - 1) * GAP;
      const tx = isActive ? 1.7 : 0;
      const ty = isActive ? topY + 0.4 : s.rest.y;
      const tz = isActive ? 0.3 : 0;
      const trx = isActive ? -0.2 : 0;
      const k = reduce ? 1 : 0.085;
      s.cur.x = ease(s.cur.x, tx, k); s.cur.y = ease(s.cur.y, ty, k); s.cur.z = ease(s.cur.z, tz, k); s.cur.rx = ease(s.cur.rx, trx, k); s.cur.ry = ease(s.cur.ry, s.rest.ry + fan, k);
      s.g.position.set(s.cur.x, s.cur.y, s.cur.z); s.g.rotation.set(s.cur.rx, s.cur.ry, 0);
      if (Math.abs(s.cur.x - tx) > 0.001 || Math.abs(s.cur.y - ty) > 0.001 || Math.abs(s.cur.z - tz) > 0.001 || Math.abs(s.cur.rx - trx) > 0.001 || Math.abs(s.cur.ry - (s.rest.ry + fan)) > 0.001) moving = true;
    });
    if (Math.abs(hoverT - hover) > 0.001) moving = true;
    renderer.render(scene, cam);
    raf = 0;
    if (!once && running && !reduce && moving) raf = requestAnimationFrame(() => frame(false));
  }

  if (!reduce) {
    new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running) kick(); }).observe(canvas);
    canvas.addEventListener('pointerenter', () => { hover = 1; kick(); });
    canvas.addEventListener('pointerleave', () => { hover = 0; kick(); });
    frame(false);
  } else frame(true);

  return {
    setActive(i) { active = i; if (reduce) frame(true); else kick(); if (opts.onActive) opts.onActive(i); },
    clear() { active = -1; if (reduce) frame(true); else kick(); }
  };
}
