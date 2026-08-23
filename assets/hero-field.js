// Procedural hero piece: a field of thin bars on the site grid. Heights follow a
// layered wave that ripples once on load, then settles to a slow breath.
// No assets, no dependencies beyond three.js. Respects prefers-reduced-motion.
import * as THREE from './vendor/three.module.min.js';

export function mountHeroField(canvas){
  const css = getComputedStyle(document.documentElement);
  const accent = new THREE.Color(css.getPropertyValue('--accent-500').trim() || '#d84a33');
  const ink    = new THREE.Color(css.getPropertyValue('--ink').trim() || '#17161f');
  const dark   = matchMedia('(prefers-color-scheme: dark)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true, powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();

  const N = 21, gap = 1.0, W = N*gap, R = (N-1)/2*gap + 0.25;
  const cells=[]; for(let i=0;i<N;i++)for(let j=0;j<N;j++){ const x=(i-(N-1)/2)*gap, z=(j-(N-1)/2)*gap; if(Math.hypot(x,z)<=R) cells.push([x,z,i,j]); }
  const cam = new THREE.OrthographicCamera(-1,1,1,-1,0.1,200);
  cam.position.set(W*0.9, W*0.95, W*0.9); cam.lookAt(0,-1.5,0);

  const geo = new THREE.BoxGeometry(0.5, 1, 0.5);
  geo.translate(0,0.5,0); // grow from the floor
  const mat = new THREE.MeshStandardMaterial({color:accent, roughness:0.6, metalness:0.0, flatShading:true, vertexColors:false});
  const mesh = new THREE.InstancedMesh(geo, mat, cells.length);
  const colors = new Float32Array(cells.length*3);
  const inkC = dark ? new THREE.Color('#ececf1') : ink;
  let k=0;
  for(const [x,z,i,j] of cells){
    // a few ink bars: the one deliberate irregularity
    const isInk = ((i+j)%13===0) && ((i*7+j*3)%5===0);
    const c = isInk ? inkC : accent;
    colors.set([c.r,c.g,c.b], k*3); k++;
  }
  mesh.instanceColor = new THREE.InstancedBufferAttribute(colors,3);
  scene.add(mesh);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a6a80, dark?1.2:1.9));
  const key = new THREE.DirectionalLight(0xffffff, dark?2.2:2.6); key.position.set(-8,14,6); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffe6dc, 0.7); fill.position.set(8,6,-6); scene.add(fill);
  const group = new THREE.Group(); scene.remove(mesh); group.add(mesh); scene.add(group);

  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  const base = accent.clone().multiplyScalar(0.72), tip = accent.clone().lerp(new THREE.Color('#ffb49a'), 0.35), tmp = new THREE.Color();
  const inkSet = new Set(); cells.forEach(([x,z,i,j],kk)=>{ if(((i+j)%13===0)&&((i*7+j*3)%5===0)) inkSet.add(kk); });
  function layout(t){
    k=0;
    for(const [x,z] of cells){
      const r=Math.hypot(x,z);
      const edge = Math.max(0, 1 - (R - r)/2.5); // bars taper toward the rim so the disc reads as a dome, not a cylinder
      // one outward ripple that decays, over a slow resting swell
      const ripple = Math.sin(r*1.1 - t*2.4) * Math.exp(-t*0.45) * 1.6;
      const swell  = Math.sin(x*0.55 + t*0.22) * Math.cos(z*0.45 - t*0.18) * 1.1 + Math.sin((x+z)*0.28 + t*0.12)*0.7;
      // under the pointer: a soft mound, weighted by hover
      const dx=x-cur.wx, dz=z-cur.wz, mound = cur.w * 2.6 * Math.exp(-(dx*dx+dz*dz)/6.0);
      const h = Math.max(0.12, (1.0 + swell*(1-cur.w*0.5) + ripple + mound) * (1 - 0.55*edge*edge));
      p.set(x,-2.5,z); s.set(1,h,1); m.compose(p,q,s); mesh.setMatrixAt(k,m);
      if(!inkSet.has(k)){ tmp.copy(base).lerp(tip, Math.min(1,(h-0.12)/3.2)); mesh.setColorAt(k,tmp); }
      k++;
    }
    mesh.instanceMatrix.needsUpdate=true; mesh.instanceColor.needsUpdate=true;
    cur.w = ease(cur.w, ptr.active?1:0, 0.06);
    cur.x = ease(cur.x, ptr.x, 0.08); cur.y = ease(cur.y, ptr.y, 0.08);
    cur.wx = ease(cur.wx, ptr.wx, 0.12); cur.wz = ease(cur.wz, ptr.wz, 0.12);
    const idleYaw = Math.sin(t*0.08)*0.09;
    group.rotation.y = idleYaw*(1-cur.w) + cur.x*0.28*cur.w;      // follow the pointer, up to ~16 degrees
    group.rotation.x = cur.y*-0.12*cur.w;                          // slight pitch toward the pointer
  }
  function resize(){
    const w=canvas.clientWidth, h=canvas.clientHeight; if(!w||!h) return;
    renderer.setSize(w,h,false);
    const a=w/h, v=(R+1.2)*1.02*(a<1?1/a:1); cam.left=-v*a; cam.right=v*a; cam.top=v; cam.bottom=-v; cam.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  // Hover: the field tilts toward the pointer and rises under it; on leave it eases back to idle.
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), floor = new THREE.Plane(new THREE.Vector3(0,1,0), 2.5), hit = new THREE.Vector3();
  const ptr = {active:false, x:0, y:0, wx:0, wz:0};           // target values
  const cur = {w:0, x:0, y:0, wx:0, wz:0};                     // eased values (w = hover weight 0..1)
  canvas.addEventListener('pointermove', e=>{
    const r=canvas.getBoundingClientRect();
    ptr.x=((e.clientX-r.left)/r.width)*2-1; ptr.y=-(((e.clientY-r.top)/r.height)*2-1);
    ndc.set(ptr.x,ptr.y); ray.setFromCamera(ndc,cam);
    if(ray.ray.intersectPlane(floor,hit)){ ptr.wx=hit.x; ptr.wz=hit.z; }
    ptr.active=true;
  });
  canvas.addEventListener('pointerleave', ()=>{ ptr.active=false; });
  const ease=(a,b,k)=>a+(b-a)*k;
  let t0=performance.now(), raf=0, running=true;
  function frame(){
    const t=(performance.now()-t0)/1000; layout(t); renderer.render(scene,cam);
    if(running) raf=requestAnimationFrame(frame);
  }
  if(reduce){ layout(6); renderer.render(scene,cam); return; }
  // pause when off screen
  new IntersectionObserver(([e])=>{ running=e.isIntersecting; if(running){cancelAnimationFrame(raf); frame();} }).observe(canvas);
  canvas.addEventListener('click',()=>{t0=performance.now();}); // replay the ripple
  frame();
}
