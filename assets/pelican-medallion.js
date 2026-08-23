// The brass medallion: a struck disc carrying the seal, with the wing lattice
// knurled around its rim. Everything here is procedural - the brass is a
// material lit by a generated studio environment, not a photograph, and the
// relief is drawn to canvas from the same arc maths as assets/brand/lattice.svg.
import * as THREE from './vendor/three.module.min.js';

const TAU = Math.PI * 2;

/* A warm studio wrapped around the scene so the metal has something to reflect.
   Without this a metalness-1 surface renders black. */
function studioEnvironment(renderer, dark) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, c.height);
  sky.addColorStop(0.00, dark ? '#6d6659' : '#fffaf0');
  sky.addColorStop(0.42, dark ? '#4a443a' : '#efe6d4');
  sky.addColorStop(0.52, dark ? '#2a2620' : '#b3a992');
  sky.addColorStop(1.00, dark ? '#141210' : '#6b6458');
  g.fillStyle = sky; g.fillRect(0, 0, c.width, c.height);
  // two soft key lights and one warm bounce, the shapes the brass will catch
  const lamps = [[120, 62, 105, 'rgba(255,252,240,1)'], [300, 48, 78, 'rgba(255,246,220,0.95)'], [430, 96, 70, 'rgba(255,236,198,0.85)'], [250, 205, 130, 'rgba(226,170,92,0.6)']];
  for (const [x, y, r, col] of lamps) {
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  // The face of the medal looks straight back past the camera, so the light it
  // actually reflects has to live there: a soft box on the horizon behind us.
  const box = g.createRadialGradient(c.width * 0.5, c.height * 0.46, 0, c.width * 0.5, c.height * 0.46, c.width * 0.34);
  box.addColorStop(0.0, dark ? 'rgba(255,244,224,0.85)' : 'rgba(255,252,244,1)');
  box.addColorStop(0.55, dark ? 'rgba(190,170,140,0.45)' : 'rgba(238,228,208,0.85)');
  box.addColorStop(1.0, 'rgba(0,0,0,0)');
  g.fillStyle = box; g.fillRect(0, 0, c.width, c.height);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  // Prefilter when we can; fall back to the raw equirect, which still lights the
  // metal. PMREM is unavailable on some software renderers and fails silently.
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromEquirectangular(tex).texture;
    pmrem.dispose();
    if (env) return env;
  } catch (e) { /* fall through */ }
  return tex;
}

/* Brushed-metal roughness: fine concentric turning marks, the way a struck
   disc actually finishes. Drawn, not sampled. */
function brushedRoughness(size = 1024) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#6a6a6a'; g.fillRect(0, 0, size, size);
  const mid = size / 2;
  g.lineWidth = 1;
  for (let i = 0; i < 900; i++) {
    const r = (i / 900) * mid * 0.98 + Math.random() * 2;
    const v = 90 + Math.random() * 70;
    g.strokeStyle = `rgb(${v},${v},${v})`;
    g.beginPath();
    const a0 = Math.random() * TAU, a1 = a0 + 0.4 + Math.random() * 2.2;
    g.arc(mid, mid, r, a0, a1);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

/* The seal itself, composed twice: once in colour (cream linework on the house
   green, the way it prints) and once as a height map, so the same artwork is
   both what you see and what the light catches. */
function sealFaces(title, sub, crestImage, ground, line, size = 1024) {
  const col = document.createElement('canvas'); col.width = col.height = size;
  const hgt = document.createElement('canvas'); hgt.width = hgt.height = size;
  const gc = col.getContext('2d'), gh = hgt.getContext('2d');
  const mid = size / 2, R = mid;

  gc.fillStyle = ground; gc.fillRect(0, 0, size, size);
  gh.fillStyle = '#808080'; gh.fillRect(0, 0, size, size);   // mid grey = flat

  const both = (fn) => { fn(gc, line); fn(gh, '#f2f2f2'); };

  const ring = (r, w) => both((g, c) => {
    g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.arc(mid, mid, r, 0, TAU); g.stroke();
  });
  ring(R * 0.945, size * 0.010);
  ring(R * 0.892, size * 0.004);

  // the dotted well the crest sits in
  both((g, c) => {
    g.save(); g.strokeStyle = c; g.lineWidth = size * 0.0035;
    g.setLineDash([size * 0.0045, size * 0.017]);
    g.beginPath(); g.arc(mid, mid, R * 0.630, 0, TAU); g.stroke(); g.restore();
  });

  // the two lozenges at three and nine o'clock
  both((g, c) => {
    for (const a of [0, Math.PI]) {
      const x = mid + Math.cos(a) * R * 0.828, y = mid + Math.sin(a) * R * 0.828;
      g.save(); g.translate(x, y); g.rotate(Math.PI / 4);
      g.fillStyle = c; g.fillRect(-size * 0.0115, -size * 0.0115, size * 0.023, size * 0.023);
      g.restore();
    }
  });

  const onArc = (g, c, text, radius, from, to, font, spacing) => {
    g.save(); g.translate(mid, mid); g.fillStyle = c; g.font = font;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const chars = [...text];
    const total = chars.reduce((n, ch) => n + g.measureText(ch).width + spacing, 0);
    const dir = Math.sign(to - from);
    let a = from + ((Math.abs(to - from) * radius - total) / 2 / radius) * dir;
    for (const ch of chars) {
      const step = ((g.measureText(ch).width + spacing) / radius) * dir;
      a += step / 2;
      g.save(); g.rotate(a);
      g.translate(0, dir > 0 ? -radius : radius);
      if (dir < 0) g.rotate(Math.PI);
      g.fillText(ch, 0, 0); g.restore();
      a += step / 2;
    }
    g.restore();
  };
  both((g, c) => onArc(g, c, title, R * 0.775, -1.12, 1.12, `600 ${size * 0.075}px "Clash Display", Georgia, serif`, size * 0.007));
  // the lower line is set from the bottom outwards so it stays upright
  const onArcBottom = (g, c, text, radius, font, spacing) => {
    g.save(); g.translate(mid, mid); g.fillStyle = c; g.font = font;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const chars = [...text].reverse();   // laid out from the right, so it reads left to right
    const total = chars.reduce((n, ch) => n + g.measureText(ch).width + spacing, 0);
    let a = -(total / radius) / 2;
    for (const ch of chars) {
      const step = (g.measureText(ch).width + spacing) / radius;
      a += step / 2;
      g.save(); g.rotate(a); g.translate(0, radius);
      g.fillText(ch, 0, 0); g.restore();
      a += step / 2;
    }
    g.restore();
  };
  both((g, c) => onArcBottom(g, c, sub, R * 0.775, `500 ${size * 0.042}px ui-monospace, monospace`, size * 0.014));

  if (crestImage) {
    const box = size * 0.42, x = mid - box / 2, y = mid - box / 2 - size * 0.012;
    // crest-light.png is white linework on transparent, so it tints cleanly
    const stamp = document.createElement('canvas'); stamp.width = stamp.height = size;
    const gs = stamp.getContext('2d');
    gs.drawImage(crestImage, x, y, box, box);
    gs.globalCompositeOperation = 'source-in';
    gs.fillStyle = line; gs.fillRect(0, 0, size, size);
    gc.drawImage(stamp, 0, 0);
    gs.globalCompositeOperation = 'source-in';
    gs.fillStyle = '#f2f2f2'; gs.fillRect(0, 0, size, size);
    gh.drawImage(stamp, 0, 0);
  }

  const mk = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8; return t;
  };
  return { map: mk(col, true), height: mk(hgt, false) };
}

/* The reverse: tonight's show, struck in the same hand as the seal. */
function showFaces(head, title, line, ground, lineCol, size = 1024) {
  const col = document.createElement('canvas'); col.width = col.height = size;
  const hgt = document.createElement('canvas'); hgt.width = hgt.height = size;
  const gc = col.getContext('2d'), gh = hgt.getContext('2d');
  const mid = size / 2, R = mid;
  gc.fillStyle = ground; gc.fillRect(0, 0, size, size);
  gh.fillStyle = '#808080'; gh.fillRect(0, 0, size, size);
  const both = (fn) => { fn(gc, lineCol); fn(gh, '#f2f2f2'); };
  both((g, c) => { g.strokeStyle = c; g.lineWidth = size * 0.010; g.beginPath(); g.arc(mid, mid, R * 0.945, 0, TAU); g.stroke(); });
  both((g, c) => { g.strokeStyle = c; g.lineWidth = size * 0.004; g.beginPath(); g.arc(mid, mid, R * 0.892, 0, TAU); g.stroke(); });
  both((g, c) => {
    g.fillStyle = c; g.textAlign = 'center';
    g.font = `500 ${size * 0.040}px ui-monospace, monospace`;
    g.fillText(head, mid, size * 0.235);
    g.fillRect(mid - size * 0.06, size * 0.268, size * 0.12, size * 0.006);
    // the act, wrapped to the disc
    // step the act down a size or two rather than clipping a long name
    let fs = 0.088, lines = [];
    for (const step of [0.088, 0.072, 0.058]) {
      fs = step;
      g.font = `700 ${size * fs}px "Clash Display", Georgia, serif`;
      lines = []; let ln = '';
      for (const w of (title || '').toUpperCase().split(' ')) {
        const t = ln ? ln + ' ' + w : w;
        if (g.measureText(t).width > size * 0.62 && ln) { lines.push(ln); ln = w; } else ln = t;
      }
      lines.push(ln);
      if (lines.length <= 3) break;
    }
    const use = lines.slice(0, 3);
    const lh = size * (fs + 0.012);
    let y = mid - (use.length - 1) * lh / 2 + size * 0.015;
    for (const l of use) { g.fillText(l, mid, y); y += lh; }
    // the lower line wraps to at most two rows and never reaches the rim
    g.font = `500 ${size * 0.032}px ui-monospace, monospace`;
    const lw = [], ws = String(line || '').split(' ');
    let cur2 = '';
    for (const w of ws) {
      const t = cur2 ? cur2 + ' ' + w : w;
      if (g.measureText(t).width > size * 0.50 && cur2) { lw.push(cur2); cur2 = w; } else cur2 = t;
    }
    lw.push(cur2);
    const rows = lw.slice(0, 2);
    let ly = size * (rows.length > 1 ? 0.745 : 0.770);
    for (const l of rows) { g.fillText(l, mid, ly); ly += size * 0.045; }
  });
  const mk = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; return t; };
  return { map: mk(col, true), height: mk(hgt, false) };
}

/* The rim knurl: the wing lattice, unrolled around the circumference. Same
   nested-arc construction as the SVG tile, so pattern and metal agree. */
function rimRelief(w = 2048, h = 128, repeats = 34) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, w, h);
  const step = w / repeats, r = step / 2;
  g.strokeStyle = '#e8e8e8'; g.lineWidth = Math.max(1.5, h * 0.028); g.lineCap = 'round';
  for (const [cy, off] of [[h * 0.02, 0], [h * 0.52, r], [h * 1.02, 0]]) {
    for (let i = -1; i <= repeats; i++) {
      const cx = i * step + off;
      for (const f of [1.0, 0.74, 0.5, 0.28]) {
        g.beginPath(); g.arc(cx, cy, r * f, 0, Math.PI); g.stroke();
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

export function mountMedallion(canvas, opts = {}) {
  // opts.crestUrl loads the engraved bird into the well once it decodes
  const css = getComputedStyle(document.documentElement);
  const read = (v, fb) => (css.getPropertyValue(v).trim() || fb);
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // NOTE: --brass is the ink value for print and CSS. A metal's albedo sits far
  // brighter than the colour the same alloy reads as on paper, so the disc uses
  // its own value and only borrows the hue.
  const brass = new THREE.Color(opts.metal || '#D8B45C');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = dark ? 1.25 : 1.15;

  const scene = new THREE.Scene();
  const env = studioEnvironment(renderer, dark);
  scene.environment = env;
  const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  cam.position.set(0, 0, 10.4);
  const key = new THREE.DirectionalLight(0xfff6e8, 2.6); key.position.set(-3.2, 4.2, 5.5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffdca8, 1.9); rim.position.set(4.8, -2.2, 2.5); scene.add(rim);
  scene.add(new THREE.AmbientLight(0xfff3e2, dark ? 0.55 : 0.75));

  const ground = opts.ground || read('--ink', '#14261F');
  const line = opts.line || read('--bone', '#EFEBE1');
  const rough = brushedRoughness();
  let faces = sealFaces(opts.title || 'THE BRASS PELICAN', opts.sub || 'COCKTAILS & LIVE MUSIC', opts.crest || null, ground, line);
  const rimTex = rimRelief();

  // envMap is set explicitly as well as on the scene: if PMREM is unavailable the
  // lower metalness still leaves a lit, readable surface instead of a black disc.
  // the rim stays metal; the faces are lacquered enamel carrying the seal
  const metal = (bump, scale) => new THREE.MeshStandardMaterial({
    color: brass, metalness: 0.25, roughness: 0.38,
    roughnessMap: rough, bumpMap: bump, bumpScale: scale,
    envMap: env || null, envMapIntensity: 1.1
  });
  const enamel = (f, scale) => new THREE.MeshStandardMaterial({
    map: f.map, bumpMap: f.height, bumpScale: scale,
    metalness: 0.18, roughness: 0.42,
    envMap: env || null, envMapIntensity: 0.9
  });

  // The body is a plain cylinder for the rim; the struck faces are flat circles
  // laid on top of it. CircleGeometry's UVs are planar and predictable, unlike a
  // cylinder cap's, so the relief lands the right way up without any flipping.
  const R = 1.62, T = 0.2;
  const disc = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, T, 128, 1, true), metal(rimTex, 1.1));
  body.rotation.x = Math.PI / 2;
  disc.add(body);
  const faceGeo = new THREE.CircleGeometry(R, 128);
  const front = new THREE.Mesh(faceGeo, enamel(faces, 1.5));
  front.position.z = T / 2;
  const back = new THREE.Mesh(faceGeo, enamel(faces, 0.4));
  back.position.z = -T / 2; back.rotation.y = Math.PI;
  disc.add(front); disc.add(back);
  const pivot = new THREE.Group(); pivot.add(disc); scene.add(pivot);

  const ptr = { x: 0, y: 0, on: 0 };
  const cur = { x: 0, y: 0, on: 0, turn: 0 };
  let flipped = false;
  const ease = (a, b, k) => a + (b - a) * k;

  let raf = 0, running = true, last = performance.now();

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h;
    cam.position.z = 10.4 * Math.max(1, 1 / Math.min(1, w / h) * 0.86);
    cam.updateProjectionMatrix(); kick();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  if (!reduce) {
    canvas.addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ptr.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      ptr.on = 1; kick();
    });
    canvas.addEventListener('pointerleave', () => { ptr.on = 0; kick(); });
  }

  function kick() { if (!raf && running && !reduce) raf = requestAnimationFrame(frame); else if (reduce) frame(true); }
  function frame(once) {
    cur.on = ease(cur.on, ptr.on, 0.07);
    cur.x = ease(cur.x, ptr.x, 0.07);
    cur.y = ease(cur.y, ptr.y, 0.07);
    // settle to rest, or to the flipped face, then stop drawing entirely
    const restY = flipped ? Math.PI : 0;
    cur.turn = ease(cur.turn, restY, 0.09);
    pivot.rotation.y = cur.turn + cur.x * 0.55 * cur.on - 0.13 * (1 - cur.on);
    pivot.rotation.x = cur.y * -0.32 * cur.on + 0.05 * (1 - cur.on);
    renderer.render(scene, cam);
    raf = 0;
    const busy = Math.abs(cur.turn - restY) > 0.0015 || Math.abs(cur.on - ptr.on) > 0.004 ||
                 (ptr.on > 0 && (Math.abs(cur.x - ptr.x) > 0.004 || Math.abs(cur.y - ptr.y) > 0.004));
    if (once !== true && running && !reduce && busy) raf = requestAnimationFrame(frame);
  }
  if (!reduce) {
    new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running) { last = performance.now(); kick(); } }).observe(canvas);
    kick();
  } else frame(true);

  if (opts.crestUrl) {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => api.setCrest(img);
    img.src = opts.crestUrl;
  }

  let lastShow = null;
  const api = {
    /* the reverse face carries whatever is on tonight */
    setReverse(show) {
      lastShow = show || null;
      const f = showFaces(show && show.title ? 'Tonight' : 'The Brass Pelican',
                          (show && show.title) || 'Open till two',
                          (show && show.line) || 'Cocktails and live music',
                          ground, line);
      back.material.map = f.map; back.material.bumpMap = f.height; back.material.needsUpdate = true;
      kick();
    },
    /* returns true when the reverse is now facing the viewer */
    flip() { flipped = !flipped; kick(); return flipped; },
    /* call once the traced crest has loaded */
    setCrest(img) {
      faces = sealFaces(opts.title || 'THE BRASS PELICAN', opts.sub || 'COCKTAILS & LIVE MUSIC', img, ground, line);
      // only the obverse carries the seal; the reverse belongs to tonight's show
      front.material.map = faces.map; front.material.bumpMap = faces.height; front.material.needsUpdate = true;
      if (lastShow) api.setReverse(lastShow);
      else { back.material.map = faces.map; back.material.bumpMap = faces.height; back.material.needsUpdate = true; }
      kick();
    }
  };
  return api;
}
