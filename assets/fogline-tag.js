// The work tag, hanging on its hook beside the booking flow. It is not a
// decoration of the form's output, it IS the output: every choice the customer
// makes writes to the tag in the same moment. Procedural three.js, text drawn to
// canvas, no assets. Respects prefers-reduced-motion.
import * as THREE from './vendor/three.module.min.js';

const TAU = Math.PI * 2;

function faces(data, colors, size = 1024) {
  const W = size, H = Math.round(size * 1.5);
  const col = document.createElement('canvas'); col.width = W; col.height = H;
  const hgt = document.createElement('canvas'); hgt.width = W; hgt.height = H;
  const gc = col.getContext('2d'), gh = hgt.getContext('2d');

  gc.fillStyle = colors.card; gc.fillRect(0, 0, W, H);
  gh.fillStyle = '#808080'; gh.fillRect(0, 0, W, H);
  const both = (fn) => { fn(gc, colors.ink, colors.blue, colors.faint); fn(gh, '#e8e8e8', '#f4f4f4', '#9a9a9a'); };

  // the punched eyelet
  both((g, ink) => {
    g.strokeStyle = ink; g.lineWidth = W * 0.012;
    g.beginPath(); g.arc(W / 2, H * 0.062, W * 0.032, 0, TAU); g.stroke();
  });

  const pad = W * 0.10;
  let y = H * 0.135;

  // header: the stamped mark and the job number
  both((g, ink, blue) => {
    g.textAlign = 'left';
    g.strokeStyle = ink; g.lineWidth = W * 0.005;
    g.strokeRect(pad, y, W * 0.30, H * 0.052);
    g.fillStyle = ink;
    g.font = `700 ${W * 0.036}px ui-monospace, monospace`;
    g.fillText('FOG LINE', pad + W * 0.022, y + H * 0.026);
    g.font = `500 ${W * 0.022}px ui-monospace, monospace`;
    g.fillStyle = colors === undefined ? ink : ink;
    g.fillText('CYCLES / SF', pad + W * 0.022, y + H * 0.044);
    g.textAlign = 'right';
    g.fillStyle = blue;
    g.font = `700 ${W * 0.052}px ui-monospace, monospace`;
    g.fillText(data.code || 'FLC-____', W - pad, y + H * 0.040);
    g.textAlign = 'left';
  });
  y += H * 0.082;
  both((g, ink) => { g.strokeStyle = ink; g.lineWidth = W * 0.006; g.beginPath(); g.moveTo(pad, y); g.lineTo(W - pad, y); g.stroke(); });
  y += H * 0.030;

  // the rows fill in as the customer decides
  const rows = [
    ['Service', data.service],
    ['Drop-off', data.when],
    ['Ready by', data.ready],
    ['Bike', data.bike],
    ['Symptom', data.problem],
    ['Customer', data.who],
    ['Extra work', data.auth]
  ];
  for (const [k, v] of rows) {
    const filled = !!v;
    both((g, ink, blue, faint) => {
      g.fillStyle = faint;
      g.font = `500 ${W * 0.026}px ui-monospace, monospace`;
      g.fillText(k.toUpperCase(), pad, y);
      // dotted leader across the row, the way a form is ruled
      g.save();
      g.strokeStyle = faint; g.lineWidth = W * 0.003; g.setLineDash([W * 0.006, W * 0.014]);
      g.beginPath(); g.moveTo(pad, y + H * 0.030); g.lineTo(W - pad, y + H * 0.030); g.stroke();
      g.restore();
      if (!filled) return;
      g.fillStyle = ink;
      g.font = `600 ${W * 0.040}px "Clash Display", Georgia, serif`;
      // wrap to two lines, then clip
      const words = String(v).split(' ');
      const lines = []; let ln = '';
      for (const w of words) {
        const t = ln ? ln + ' ' + w : w;
        if (g.measureText(t).width > W - pad * 2 && ln) { lines.push(ln); ln = w; } else ln = t;
      }
      lines.push(ln);
      let ly = y + H * 0.024;
      for (const l of lines.slice(0, 2)) { g.fillText(l, pad, ly); ly += H * 0.030; }
    });
    y += H * 0.086;
  }

  // the stamp only appears once the tag is finished
  if (data.stamped) {
    both((g, ink, blue) => {
      g.save();
      g.translate(W - pad - W * 0.20, H - H * 0.075);
      g.rotate(-0.06);
      g.strokeStyle = blue; g.lineWidth = W * 0.008;
      g.strokeRect(-W * 0.14, -H * 0.022, W * 0.30, H * 0.046);
      g.fillStyle = blue; g.textAlign = 'center';
      g.font = `700 ${W * 0.030}px ui-monospace, monospace`;
      g.fillText('CHECKED IN', W * 0.01, H * 0.006);
      g.restore();
      g.textAlign = 'left';
    });
  }

  const mk = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8;
    return t;
  };
  return { map: mk(col, true), height: mk(hgt, false) };
}

export function mountWorkTag(canvas) {
  const css = getComputedStyle(document.documentElement);
  const read = (v, fb) => (css.getPropertyValue(v).trim() || fb);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const colors = {
    card: read('--card', '#FBFBF9'),
    ink: read('--ink', '#141A1F'),
    blue: read('--blue', '#1B4C7A'),
    faint: read('--ink-3', '#5A6570')
  };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
  cam.position.set(0, -0.10, 9.1);

  scene.add(new THREE.AmbientLight(0xffffff, 1.45));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(-2.6, 4, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0xeaf1f7, 0.6); fill.position.set(4, -1.5, 3); scene.add(fill);

  const W = 2.1, H = 3.15;
  let f = faces({}, colors);
  const mat = new THREE.MeshStandardMaterial({ map: f.map, bumpMap: f.height, bumpScale: 0.6, roughness: 0.94, metalness: 0.0, side: THREE.DoubleSide });
  const card = new THREE.Mesh(new THREE.PlaneGeometry(W, H, 12, 16), mat);

  // a little curl, the way card stock never hangs flat
  const pos = card.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    pos.setZ(i, 0.055 * Math.sin((x / W + 0.5) * Math.PI) * (0.5 - y / H));
  }
  card.geometry.computeVertexNormals();

  const pivot = new THREE.Group();          // hangs from the eyelet, not the middle
  card.position.y = -H / 2;
  pivot.add(card);
  pivot.position.y = H / 2 - 0.15;
  scene.add(pivot);

  // the hook and string
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.028, 10, 28, Math.PI * 1.4),
    new THREE.MeshStandardMaterial({ color: '#8B949C', roughness: 0.5, metalness: 0.7 }));
  hook.position.set(0, H / 2 + 0.06, 0); hook.rotation.z = Math.PI * 0.2; scene.add(hook);

  let swing = 0.05, vel = 0, raf = 0, running = true, last = performance.now();
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h;
    const a = w / h;
    cam.position.z = a < 0.75 ? 9.1 * (0.75 / a) : 9.1;
    cam.updateProjectionMatrix(); kick();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  function kick() { if (!raf && running && !reduce) { last = performance.now(); raf = requestAnimationFrame(frame); } else if (reduce) frame(true); }
  function frame(once) {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    // a damped pendulum: it settles and the loop stops
    vel += -swing * 9.0 * dt;          // stiffer, so it returns to plumb quickly
    vel *= Math.pow(0.10, dt);         // heavily damped: card stock, not a pendulum
    swing += vel * dt;
    pivot.rotation.z = swing;
    renderer.render(scene, cam);
    raf = 0;
    const moving = Math.abs(swing) > 0.0015 || Math.abs(vel) > 0.0015;
    if (once !== true && running && !reduce && moving) raf = requestAnimationFrame(frame);
  }
  if (!reduce) {
    new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running) kick(); }).observe(canvas);
    kick();
  } else frame(true);

  return {
    /* called on every change in the booking flow */
    set(data) {
      const oldMap = mat.map, oldBump = mat.bumpMap;
      f = faces(data || {}, colors);
      mat.map = f.map; mat.bumpMap = f.height; mat.needsUpdate = true;
      if (oldMap) oldMap.dispose();
      if (oldBump) oldBump.dispose();      // the height map leaked on every update
      if (!reduce) { vel += 0.22; kick(); }        // a nudge, so the tag reacts
      else frame(true);
    }
  };
}
