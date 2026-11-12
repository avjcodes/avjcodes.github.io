/* RUNS. Everything in this file is something on the page running:
   1. the ink: a stable-fluids simulation carrying two dyes, printed as two-color halftone
   2. the headline: variable type that swells toward the cursor, and pulses on its own when left alone
   3. the reel: a pinned horizontal strip of live builds
   4. the ticker, the ledger preview, the registration-dot cursor, the clock and the uptime counter */

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const FINE = matchMedia("(hover: hover) and (pointer: fine)").matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- 1. the ink ---------- */
(() => {
  const hero = document.querySelector(".hero");
  const canvas = hero && hero.querySelector("canvas");
  if (!hero || !canvas) return;
  let gl = null;
  try { gl = canvas.getContext("webgl2", { alpha: false, depth: false, stencil: false, antialias: false }); } catch (e) { gl = null; }
  if (!gl || !gl.getExtension("EXT_color_buffer_float")) { canvas.remove(); return; }
  gl.getExtension("OES_texture_float_linear");

  const VERT = `#version 300 es
  precision highp float;
  out vec2 vUv;
  void main() { vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const vert = compile(gl.VERTEX_SHADER, VERT);
  const program = (fragSrc) => {
    const p = gl.createProgram();
    gl.attachShader(p, vert);
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, "#version 300 es\nprecision highp float;\nin vec2 vUv;\nout vec4 frag;\n" + fragSrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) {
      const info = gl.getActiveUniform(p, i);
      u[info.name] = gl.getUniformLocation(p, info.name);
    }
    return { p, u };
  };

  const advectP = program(`
    uniform sampler2D uVel; uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uDt; uniform float uKeep;
    void main() { frag = vec4(texture(uSrc, vUv - uDt * texture(uVel, vUv).xy * uTexel).xy * uKeep, 0.0, 1.0); }`);
  const splatP = program(`
    uniform sampler2D uSrc; uniform vec2 uPoint; uniform vec2 uValue; uniform float uAspect; uniform float uRad;
    void main() {
      vec2 d = vUv - uPoint; d.x *= uAspect;
      frag = vec4(texture(uSrc, vUv).xy + uValue * exp(-dot(d, d) / uRad), 0.0, 1.0);
    }`);
  const divP = program(`
    uniform sampler2D uVel; uniform vec2 uTexel;
    void main() {
      float l = texture(uVel, vUv - vec2(uTexel.x, 0.0)).x, r = texture(uVel, vUv + vec2(uTexel.x, 0.0)).x;
      float b = texture(uVel, vUv - vec2(0.0, uTexel.y)).y, t = texture(uVel, vUv + vec2(0.0, uTexel.y)).y;
      frag = vec4(0.5 * (r - l + t - b), 0.0, 0.0, 1.0);
    }`);
  const jacobiP = program(`
    uniform sampler2D uPrs; uniform sampler2D uDiv; uniform vec2 uTexel;
    void main() {
      float l = texture(uPrs, vUv - vec2(uTexel.x, 0.0)).x, r = texture(uPrs, vUv + vec2(uTexel.x, 0.0)).x;
      float b = texture(uPrs, vUv - vec2(0.0, uTexel.y)).x, t = texture(uPrs, vUv + vec2(0.0, uTexel.y)).x;
      frag = vec4((l + r + b + t - texture(uDiv, vUv).x) * 0.25, 0.0, 0.0, 1.0);
    }`);
  const gradP = program(`
    uniform sampler2D uPrs; uniform sampler2D uVel; uniform vec2 uTexel;
    void main() {
      float l = texture(uPrs, vUv - vec2(uTexel.x, 0.0)).x, r = texture(uPrs, vUv + vec2(uTexel.x, 0.0)).x;
      float b = texture(uPrs, vUv - vec2(0.0, uTexel.y)).x, t = texture(uPrs, vUv + vec2(0.0, uTexel.y)).x;
      frag = vec4(texture(uVel, vUv).xy - 0.5 * vec2(r - l, t - b), 0.0, 1.0);
    }`);
  // the press: each dye becomes a screen of dots at its own angle, laid on bone paper
  const printP = program(`
    uniform sampler2D uDye; uniform vec2 uRes; uniform float uCell; uniform float uThin;
    const vec3 PAPER = vec3(0.937, 0.922, 0.882);
    const vec3 SPOT = vec3(1.0, 0.29, 0.11);
    const vec3 BLUE = vec3(0.153, 0.278, 0.847);
    vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x + s * p.y, -s * p.x + c * p.y); }
    float screen(vec2 fc, float ang, float chan) {
      vec2 p = rot(fc, ang);
      vec2 ctr = (floor(p / uCell) + 0.5) * uCell;
      vec2 uv = clamp(rot(ctr, -ang) / uRes, 0.0, 1.0);
      vec2 dye = texture(uDye, uv).xy;
      float d = mix(dye.x, min(dye.y, 0.62), chan);
      d *= 1.0 - smoothstep(0.86, 0.975, uv.y);   // the masthead prints clean
      d = clamp(d * uThin, 0.0, 1.0);
      float r = sqrt(d) * uCell * 0.5;
      return (1.0 - smoothstep(r - 0.8, r + 0.8, length(p - ctr))) * smoothstep(0.0, 0.035, d);
    }
    void main() {
      vec2 fc = gl_FragCoord.xy;
      vec3 col = PAPER;
      col = mix(col, col * SPOT / PAPER, screen(fc, 0.35, 0.0));
      col = mix(col, col * BLUE / PAPER, screen(fc + 3.7, 1.22, 1.0));
      frag = vec4(col, 1.0);
    }`);

  const fbo = (w, h) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, w, h, 0, gl.RG, gl.HALF_FLOAT, null);
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { t, f, w, h };
  };
  const pair = (w, h) => ({ a: fbo(w, h), b: fbo(w, h), swap() { const k = this.a; this.a = this.b; this.b = k; } });

  let W = 2, H = 2, simW = 2, simH = 2, dpr = 1, vel, dye, prs, div;
  const layout = () => {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = Math.max(2, Math.floor(hero.clientWidth * dpr));
    H = Math.max(2, Math.floor(hero.clientHeight * dpr));
    canvas.width = W; canvas.height = H;
    simW = Math.max(2, W >> 3); simH = Math.max(2, H >> 3);
    vel = pair(simW, simH); dye = pair(simW, simH); prs = pair(simW, simH); div = fbo(simW, simH);
  };

  const draw = (prog, target) => {
    gl.useProgram(prog.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.f : null);
    gl.viewport(0, 0, target ? target.w : W, target ? target.h : H);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const bind = (unit, tex) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); return unit; };
  const splat = (field, x, y, vx, vy, rad) => {
    gl.useProgram(splatP.p);
    gl.uniform1i(splatP.u.uSrc, bind(0, field.a.t));
    gl.uniform2f(splatP.u.uPoint, x, y);
    gl.uniform2f(splatP.u.uValue, vx, vy);
    gl.uniform1f(splatP.u.uAspect, W / H);
    gl.uniform1f(splatP.u.uRad, rad);
    draw(splatP, field.b); field.swap();
  };

  // three slow emitters keep the print moving when nobody is touching it
  const EMIT = [
    { cx: 0.66, cy: 0.44, rx: 0.30, ry: 0.30, sx: 0.23, sy: 0.31, ph: 0.0, spot: 1.5, blue: 0.0, rad: 0.0042 },
    { cx: 0.80, cy: 0.60, rx: 0.16, ry: 0.26, sx: -0.19, sy: 0.27, ph: 1.7, spot: 0.0, blue: 1.25, rad: 0.0030 },
    { cx: 0.30, cy: 0.34, rx: 0.26, ry: 0.20, sx: 0.17, sy: -0.22, ph: 3.9, spot: 1.2, blue: 0.0, rad: 0.0036 },
  ];
  const pointer = { x: 0.5, y: 0.5, dx: 0, dy: 0, moved: false };
  let t = 7.3;

  const step = (dt) => {
    t += dt;
    for (const e of EMIT) {
      const ax = t * e.sx + e.ph, ay = t * e.sy + e.ph * 0.6;
      const x = e.cx + e.rx * Math.cos(ax), y = e.cy + e.ry * Math.sin(ay);
      let tx = -e.rx * e.sx * Math.sin(ax), ty = e.ry * e.sy * Math.cos(ay);
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl; ty /= tl;
      splat(vel, x, y, tx * 520 * dt, ty * 520 * dt, e.rad);
      splat(dye, x, y, e.spot * dt, e.blue * dt, e.rad * 0.55);
    }
    if (pointer.moved) {
      pointer.moved = false;
      if (pointer.x >= 0 && pointer.x <= 1 && pointer.y >= 0 && pointer.y <= 1) {
        const sp = Math.min(1, Math.hypot(pointer.dx, pointer.dy) * 0.9);
        splat(vel, pointer.x, pointer.y, pointer.dx * 46, pointer.dy * 46, 0.003);
        splat(dye, pointer.x, pointer.y, sp * 0.5, sp * 0.1, 0.0016);
      }
    }

    gl.useProgram(advectP.p);
    gl.uniform1i(advectP.u.uVel, bind(0, vel.a.t));
    gl.uniform1i(advectP.u.uSrc, bind(1, vel.a.t));
    gl.uniform2f(advectP.u.uTexel, 1 / simW, 1 / simH);
    gl.uniform1f(advectP.u.uDt, dt);
    gl.uniform1f(advectP.u.uKeep, 0.993);
    draw(advectP, vel.b); vel.swap();

    gl.useProgram(divP.p);
    gl.uniform1i(divP.u.uVel, bind(0, vel.a.t));
    gl.uniform2f(divP.u.uTexel, 1 / simW, 1 / simH);
    draw(divP, div);
    gl.useProgram(jacobiP.p);
    gl.uniform2f(jacobiP.u.uTexel, 1 / simW, 1 / simH);
    for (let i = 0; i < 14; i++) {
      gl.uniform1i(jacobiP.u.uPrs, bind(0, prs.a.t));
      gl.uniform1i(jacobiP.u.uDiv, bind(1, div.t));
      draw(jacobiP, prs.b); prs.swap();
    }
    gl.useProgram(gradP.p);
    gl.uniform1i(gradP.u.uPrs, bind(0, prs.a.t));
    gl.uniform1i(gradP.u.uVel, bind(1, vel.a.t));
    gl.uniform2f(gradP.u.uTexel, 1 / simW, 1 / simH);
    draw(gradP, vel.b); vel.swap();

    gl.useProgram(advectP.p);
    gl.uniform1i(advectP.u.uVel, bind(0, vel.a.t));
    gl.uniform1i(advectP.u.uSrc, bind(1, dye.a.t));
    gl.uniform2f(advectP.u.uTexel, 1 / simW, 1 / simH);
    gl.uniform1f(advectP.u.uDt, dt);
    gl.uniform1f(advectP.u.uKeep, Math.exp(-0.34 * dt));
    draw(advectP, dye.b); dye.swap();
  };

  const print = () => {
    const narrow = innerWidth < 900;
    gl.useProgram(printP.p);
    gl.uniform1i(printP.u.uDye, bind(0, dye.a.t));
    gl.uniform2f(printP.u.uRes, W, H);
    gl.uniform1f(printP.u.uCell, (narrow ? 9 : 13) * dpr);
    gl.uniform1f(printP.u.uThin, narrow ? 0.7 : 1.0);
    draw(printP, null);
  };

  const prime = (n) => { for (let i = 0; i < n; i++) step(1 / 60); };
  layout();
  prime(REDUCED ? 420 : 200);
  print();
  let resizeT = 0;
  addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { layout(); prime(REDUCED ? 420 : 120); print(); }, 120);
  });
  if (REDUCED) return; // a still print: the same press, stopped

  addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    const x = (e.clientX - r.left) / Math.max(1, r.width);
    const y = 1 - (e.clientY - r.top) / Math.max(1, r.height);
    pointer.dx = (x - pointer.x) * 60;
    pointer.dy = (y - pointer.y) * 60;
    pointer.x = x; pointer.y = y;
    pointer.moved = true;
  }, { passive: true });

  let last = performance.now(), raf = 0, visible = true, seen = true;
  const frame = (now) => {
    raf = 0;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    step(dt);
    print();
    if (visible && seen) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf && visible && seen) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => { seen = en.isIntersecting; kick(); }).observe(hero);
  }
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; kick(); });
  kick();
})();

/* ---------- 2. the headline ---------- */
(() => {
  const h = document.querySelector(".kin");
  if (!h) return;
  const chars = [];
  h.querySelectorAll(".line").forEach((line) => {
    const runs = line.classList.contains("line--runs");
    const text = line.textContent.trim();
    line.textContent = "";
    for (const c of text) {
      const s = document.createElement("span");
      s.className = "ch";
      s.textContent = c === " " ? " " : c;
      s.style.setProperty("--i", chars.length);
      line.append(s);
      chars.push({ el: s, bw: runs ? 860 : 760, bd: runs ? 128 : 86, w: 0, d: 0, x: 0, y: 0 });
    }
  });
  const show = () => h.classList.add("is-in");
  const face = document.fonts && document.fonts.load ? document.fonts.load('800 1em "Anybody"') : Promise.resolve();
  face.then(show, show);
  setTimeout(show, 1100);
  if (REDUCED) return;

  const narrowQ = matchMedia("(max-width: 900px)");
  const base = () => { for (const c of chars) { if (c.bd > 100) c.bd = narrowQ.matches ? 112 : 128; c.w = c.w || c.bw; c.d = c.d || c.bd; } };
  base();
  const measure = () => {
    for (const c of chars) {
      const r = c.el.getBoundingClientRect();
      c.x = r.left + r.width / 2 + scrollX;
      c.y = r.top + r.height / 2 + scrollY;
    }
  };
  setTimeout(measure, 2000);
  addEventListener("resize", () => { base(); setTimeout(measure, 200); });

  let mx = -1e5, my = -1e5, lastMove = -1e5, seen = true, raf = 0;
  if (FINE) addEventListener("pointermove", (e) => { mx = e.pageX; my = e.pageY; lastMove = performance.now(); }, { passive: true });
  const frame = (now) => {
    raf = 0;
    const R = clamp(innerWidth * 0.2, 170, 360);
    const idle = now - lastMove > 2600;
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      let f = 0;
      if (!idle) { const dist = Math.hypot(mx - c.x, my - c.y); f = Math.max(0, 1 - dist / R); f *= f; }
      else { const wv = 0.5 + 0.5 * Math.sin(now * 0.0019 - i * 0.46); f = Math.pow(wv, 7) * 0.8; }
      const tw = c.bw + (900 - c.bw) * f;
      const td = c.bd + (Math.min(150, c.bd + 44) - c.bd) * f;
      const nw = c.w + (tw - c.w) * 0.16, nd = c.d + (td - c.d) * 0.16;
      if (Math.abs(nw - c.w) > 0.15 || Math.abs(nd - c.d) > 0.04) {
        c.w = nw; c.d = nd;
        c.el.style.fontVariationSettings = `"wght" ${nw.toFixed(0)}, "wdth" ${nd.toFixed(1)}`;
      }
    }
    if (seen && !document.hidden) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf && seen && !document.hidden) raf = requestAnimationFrame(frame); };
  if ("IntersectionObserver" in window) new IntersectionObserver(([en]) => { seen = en.isIntersecting; kick(); }).observe(h);
  document.addEventListener("visibilitychange", kick);
  setTimeout(kick, 1500);
})();

/* ---------- 3. the reel ---------- */
(() => {
  const reel = document.querySelector(".reel");
  const track = reel && reel.querySelector(".reel__track");
  const bar = reel && reel.querySelector(".reel__bar i");
  if (!reel || !track) return;
  const wideQ = matchMedia("(min-width: 901px)");
  let dist = 0, x = 0, target = 0, v = 0, lastY = scrollY, lastT = performance.now(), raf = 0;

  const measure = () => {
    if (!wideQ.matches) { reel.style.height = ""; track.style.transform = ""; dist = 0; return; }
    dist = Math.max(0, track.scrollWidth - innerWidth);
    reel.style.height = innerHeight + dist + "px";
  };
  const frame = (now) => {
    raf = 0;
    const dt = Math.max(0.001, (now - lastT) / 1000);
    lastT = now;
    const y = scrollY;
    const speed = Math.abs(y - lastY) / dt;
    lastY = y;
    v += (clamp(speed / 2600, 0, 1) - v) * 0.12;
    reel.style.setProperty("--v", (REDUCED ? 0 : v).toFixed(3));
    let settled = v < 0.004;
    if (dist > 0) {
      const p = clamp(-reel.getBoundingClientRect().top / dist, 0, 1);
      target = -p * dist;
      x = REDUCED ? target : x + (target - x) * 0.14;
      if (Math.abs(target - x) < 0.3) x = target; else settled = false;
      track.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
      if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
    }
    if (!settled) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(frame); } };
  measure();
  addEventListener("resize", () => { measure(); kick(); });
  addEventListener("load", () => { measure(); kick(); });
  addEventListener("scroll", kick, { passive: true });
  wideQ.addEventListener("change", () => { measure(); kick(); });
  kick();

  // each frame loads its real page as it nears the screen, on screens wide enough to hold it
  const ports = [...reel.querySelectorAll(".port[data-src]")];
  const liveQ = matchMedia("(hover: hover) and (pointer: fine) and (min-width: 901px)");
  const load = (port) => {
    if (port.dataset.done) return;
    port.dataset.done = "1";
    const f = document.createElement("iframe");
    f.src = port.dataset.src;
    f.title = port.dataset.title || "A live build";
    f.setAttribute("scrolling", "no");
    f.setAttribute("tabindex", "-1");
    f.setAttribute("aria-hidden", "true");
    f.addEventListener("load", () => port.classList.add("is-live"));
    port.prepend(f);
  };
  const arm = () => {
    if (!liveQ.matches || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((ens) => {
      for (const en of ens) if (en.isIntersecting) { load(en.target); io.unobserve(en.target); }
    }, { rootMargin: "200px 900px" });
    ports.forEach((p) => io.observe(p));
  };
  arm();
  liveQ.addEventListener("change", arm);

  // the screen itself is a way in: click the frame to open the build
  ports.forEach((port) => {
    const slide = port.closest(".slide");
    const go = slide && slide.querySelector(".go");
    if (!go) return;
    const a = document.createElement("a");
    a.className = "port__hit";
    a.href = go.getAttribute("href");
    a.tabIndex = -1;
    a.setAttribute("aria-label", "Open " + slide.querySelector("h3").textContent);
    port.append(a);
  });
})();

/* ---------- 4. the ticker ---------- */
(() => {
  const row = document.querySelector(".marq__row");
  if (!row || REDUCED) return;
  let off = 0, half = 0, lastY = scrollY, lastT = performance.now(), boost = 0, dir = 1, seen = false, raf = 0;
  const measure = () => { half = row.scrollWidth / 2; };
  measure();
  addEventListener("resize", measure);
  addEventListener("load", measure);
  const frame = (now) => {
    raf = 0;
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    const dy = scrollY - lastY;
    lastY = scrollY;
    if (dy) dir = dy > 0 ? 1 : -1;
    boost += (clamp(Math.abs(dy) / Math.max(dt, 0.001) / 1800, 0, 1) - boost) * 0.1;
    off += (70 + boost * 1100) * dir * dt;
    if (half > 0) off = ((off % half) + half) % half;
    row.style.transform = `translate3d(${(-off).toFixed(1)}px, 0, 0)`;
    if (seen && !document.hidden) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf && seen && !document.hidden) { lastT = performance.now(); lastY = scrollY; raf = requestAnimationFrame(frame); } };
  if ("IntersectionObserver" in window) new IntersectionObserver(([en]) => { seen = en.isIntersecting; kick(); }, { rootMargin: "100px" }).observe(row.parentElement);
  else { seen = true; kick(); }
  document.addEventListener("visibilitychange", kick);
})();

/* ---------- 5. the ledger preview and the registration dot ---------- */
(() => {
  // phones get the screen as a small still beside each entry, since nothing hovers there
  document.querySelectorAll(".list a[data-img]").forEach((a) => {
    const t = document.createElement("img");
    t.className = "thumb"; t.alt = ""; t.loading = "lazy"; t.src = a.dataset.img;
    a.prepend(t);
  });
  if (!FINE) return;
  const dot = document.querySelector(".cursor");
  const peek = document.querySelector(".peek");
  const img = peek && peek.querySelector("img");
  const pkName = peek && peek.querySelector(".peek__bar b");
  const pkTag = peek && peek.querySelector(".peek__bar span");
  const pkPort = peek && peek.querySelector(".peek__port");
  let mx = 0, my = 0, cx = 0, cy = 0, px = 0, py = 0, tgx = 0, tgy = 0, scale = 1, ts = 1, tilt = 0, raf = 0, live = false;

  const frame = () => {
    raf = 0;
    cx += (mx - cx) * 0.3; cy += (my - cy) * 0.3;
    scale += (ts - scale) * 0.2;
    if (dot) dot.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
    if (peek) {
      const k = REDUCED ? 1 : 0.14;
      // sit beside the cursor, never on top of it: flip left near the right edge, drop below near the top
      tgx = mx + 468 > innerWidth ? mx - 448 : mx + 44;
      tgy = my < 330 ? my + 30 : my - 150;
      const nx = px + (tgx - px) * k, ny = py + (tgy - py) * k;
      tilt += ((REDUCED ? 0 : clamp((nx - px) * 0.45, -7, 7)) - tilt) * 0.2;
      px = nx; py = ny;
      const fx = clamp(px, 12, innerWidth - 424), fy = clamp(py, 12, innerHeight - 312);
      peek.style.transform = `translate3d(${fx.toFixed(1)}px, ${fy.toFixed(1)}px, 0) rotate(${tilt.toFixed(2)}deg)`;
    }
    const moving = Math.abs(mx - cx) > 0.2 || Math.abs(my - cy) > 0.2 || Math.abs(ts - scale) > 0.01 || Math.abs(tgx - px) > 0.4 || Math.abs(tgy - py) > 0.4 || Math.abs(tilt) > 0.05;
    if (moving) raf = requestAnimationFrame(frame);
  };
  addEventListener("pointermove", (e) => {
    mx = e.clientX; my = e.clientY;
    if (!live) { live = true; cx = mx; cy = my; px = mx + 44; py = my - 150; if (dot) dot.classList.add("on"); }
    const hot = e.target.closest && e.target.closest("a, button");
    ts = hot ? 3.4 : 1;
    if (!raf) raf = requestAnimationFrame(frame);
  }, { passive: true });
  document.addEventListener("pointerleave", () => { if (dot) dot.classList.remove("on"); live = false; });

  if (!peek) return;
  const links = [...document.querySelectorAll("a[data-img]")];
  // warm the screens once the page settles, so the first hover is instant
  const warm = () => links.forEach((a) => { const i = new Image(); i.src = a.dataset.img; });
  if ("requestIdleCallback" in window) requestIdleCallback(warm, { timeout: 4000 }); else setTimeout(warm, 2500);
  const pan = () => {
    const dist = img.offsetHeight - pkPort.clientHeight;
    img.classList.remove("pan");
    if (REDUCED || dist < 24) return;
    img.style.setProperty("--pan", -dist + "px");
    img.style.setProperty("--pan-t", clamp(dist / 70, 2.5, 9).toFixed(2) + "s");
    void img.offsetWidth; // restart the pan from the top of the page
    img.classList.add("pan");
  };
  img.addEventListener("load", pan);
  links.forEach((a) => {
    a.addEventListener("pointerenter", () => {
      const nm = a.querySelector(".nm");
      pkName.textContent = a.dataset.name || (nm ? nm.textContent : a.textContent);
      pkTag.textContent = a.dataset.tag || "";
      if (img.getAttribute("src") !== a.dataset.img) { img.classList.remove("pan"); img.src = a.dataset.img; }
      else pan();
      peek.classList.add("on");
    });
    a.addEventListener("pointerleave", () => peek.classList.remove("on"));
  });
})();

/* ---------- 6. the clock, the uptime, the email ---------- */
(() => {
  const clock = document.querySelector("[data-clock]");
  const up = document.querySelector("[data-uptime]");
  const t0 = performance.now();
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" });
  const tick = () => {
    if (clock) clock.textContent = fmt.format(new Date());
    if (up) {
      const s = Math.floor((performance.now() - t0) / 1000);
      up.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    }
  };
  tick();
  setInterval(tick, 1000);

  const mail = document.querySelector("[data-fit]");
  const fit = () => {
    if (!mail) return;
    mail.style.fontSize = "100px";
    const w = mail.scrollWidth, box = mail.clientWidth;
    if (w > 0) mail.style.fontSize = Math.max(18, Math.floor((100 * box) / w * 0.995)) + "px";
  };
  fit();
  addEventListener("resize", fit);
  addEventListener("load", fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

  const btn = document.querySelector("[data-copy-email]");
  if (btn) btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText("theangelvallejr@gmail.com");
      btn.textContent = "Copied";
      setTimeout(() => { btn.textContent = "Copy email"; }, 1800);
    } catch (e) { location.href = "mailto:theangelvallejr@gmail.com"; }
  });
})();
