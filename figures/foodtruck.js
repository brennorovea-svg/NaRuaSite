/**
 * Food truck (like the real Narua truck: white cab, black box painted with arches): a truck parked with its serving side to the viewer. A long box
 * body, a cabin narrower at the top with a sloping windscreen, two wheels, a
 * serving window with a counter, and a hatch hinged over the window. The
 * pointer's nearness to the window lifts the hatch into an awning on its two
 * struts: near, it opens wide and takes the bright stroke; far, it settles
 * back almost shut, its lip the one bright line. The slider is how far the
 * hatch opens, in degrees.
 */
const {
  Cam, clamp, facing, fillet, fit, hull, lerp, open, poly, prism, proj, rad, ringAt, rings, rrect, run, seg,
  spring, stepS, unproj, disposer, mk, place, pointer, put, register, solid,
} = HL;

const L = 84, CL = 26, W = 46, Z0 = 11, ZB = 64, ZC = 54;
const WX0 = 16, WX1 = 66, WZ0 = 30, WZ1 = 52, HZ = 55, HD = 26, TK = 1.4;
const REST = 24, WR = 10, AX = [20, 92];
const SPOT = [(WX0 + WX1) / 2, W + 30], NEAR = 26, FAR = 90;

/** A wheel standing on the near side at x: tyre, rim and hub, as projected rings in the x-z plane. */
function wheel(P, cx) {
  const ring = (R, y) => Array.from({ length: 24 }, (_, i) => P(cx + R * Math.cos(i * Math.PI / 12), y, WR + R * Math.sin(i * Math.PI / 12)));
  return {
    tyre: poly(hull(ring(WR, W - 7).concat(ring(WR, W + 1)))),
    rim: poly(ring(WR - 3, W + 1)),
    hub: poly(ring(2.6, W + 1)),
  };
}

/** The hatch at angle a (0 hangs over the window, 90 stands straight out): its back, its face, its front edge, and the struts. */
function hatch(P, shape, a) {
  const s = Math.sin(rad(a)), c = Math.cos(rad(a));
  const w = (u, v) => P(u, W + 0.6 + v * s, HZ - v * c);
  const wb = (u, v) => P(u, W + 0.6 + v * s - TK * c, HZ - v * c - TK * s);
  return {
    back: poly(shape.map((p) => wb(p[0], p[1]))),
    face: poly(shape.map((p) => w(p[0], p[1]))),
    lip: seg(w(WX0, HD - 3), w(WX1 + 2, HD - 3)),
    listras: [0, 1, 2, 3, 4].map((k) => {
      const u0 = WX0 - 2 + k * 2 * (WX1 - WX0 + 4) / 10, u1 = u0 + (WX1 - WX0 + 4) / 10;
      return poly([w(u0, 0.4), w(u1, 0.4), w(u1, HD - 0.4), w(u0, HD - 0.4)]);
    }),
    struts: seg(w(WX0 + 2, HD - 1), P(WX0 + 2, W, WZ1 - 12)) + seg(w(WX1, HD - 1), P(WX1, W, WZ1 - 12)),
  };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let MAX = value;

  const C = Cam(45, 0.5, 1.78);
  fit(C, [[-8, -8, -3], [L + CL + 8, W + 8, -3], [L + CL, -6, 0], [0, W + HD + 6, 0], [0, 0, ZB + 4], [WX1, W + HD, HZ]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  // the ground plate, the body, then the cabin, back to front
  const layer = (name) => mk("g", { class: "t-" + name }, g);
  const [gr, gi] = rings(-8, -8, L + CL + 8, W + 8, 8, 2);
  put(solid(layer("chao")), prism(P, front, gr, gi, -3, 0));
  const [br, bi] = rings(0, 0, L, W, 5, 1.8);
  put(solid(layer("corpo")), prism(P, front, br, bi, Z0, ZB));
  // roof vent: a small solid on the body's top
  const [vr, vi] = rings(18, 12, 34, 30, 3, 1);
  put(solid(layer("teto")), prism(P, front, vr, vi, ZB, ZB + 4));

  // cabin: its foot runs the full length, its top stops short, so the front slopes
  const foot = rrect(L - 2, 1, L + CL, W - 1, 5, 4), top = rrect(L - 2, 3, L + CL - 7, W - 3, 4, 4);
  const inner = rrect(L - 0.2, 4.8, L + CL - 8.8, W - 4.8, 2.2, 4);
  const cabG = layer("cabine"), cab = solid(cabG);
  put(cab, { sil: poly(hull(ringAt(P, foot, Z0).concat(ringAt(P, top, ZC)))), crease: open(ringAt(P, run(inner, front), ZC)) });
  // windscreen on the slope, and the side window of the door
  const slope = (t, y) => P(lerp(L + CL - 0.6, L + CL - 7.6, t), y, lerp(Z0, ZC, t));
  mk("path", { d: poly([slope(0.55, 6), slope(0.55, W - 6), slope(0.93, W - 6), slope(0.93, 6)]), class: "vidro" }, cabG);
  mk("path", { d: poly(fillet([[L + 2, 36], [L + 15, 36], [L + 15, 50], [L + 2, 50]], [1.5, 1.5, 1.5, 1.5]).map(([x, z]) => P(x, W, z))), class: "vidro" }, cabG);

  // the door's emblem: a red disc with an orange one inside
  const disco = (cx, cz, R, y) => Array.from({ length: 28 }, (_, i) => P(cx + R * Math.cos(i * Math.PI / 14), y, cz + R * Math.sin(i * Math.PI / 14)));
  mk("path", { d: poly(disco(L + 8.5, 29, 5, W + 0.1)), class: "emblema e0" }, cabG);
  mk("path", { d: poly(disco(L + 9, 28.6, 3, W + 0.1)), class: "emblema e1" }, cabG);

  // the painting on the box's side: arches along the bottom and a disc in the top corner
  const arco = (cx, R) => poly([...Array.from({ length: 19 }, (_, i) => P(cx + R * Math.cos(i * Math.PI / 18), W + 0.1, Z0 + R * Math.sin(i * Math.PI / 18)))]);
  [[19, "a0"], [47, "a1"], [66, "a2"]].forEach(([cx, cor]) => {
    [18, 14, 10, 6].forEach((R, k) => mk("path", { d: arco(cx, R), class: "arco " + (k % 2 ? "a3" : cor) }, g));
  });
  // more arches in the top corner at the back, a quarter of each
  const quarto = (R) => poly([P(0.4, W + 0.1, ZB - 0.4), ...Array.from({ length: 13 }, (_, i) => P(0.4 + R * Math.cos(-i * Math.PI / 24), W + 0.1, ZB - 0.4 + R * Math.sin(-i * Math.PI / 24)))]);
  [[24, "a0"], [20, "a3"], [16, "a1"], [12, "a3"], [8, "a2"], [4, "a3"]].forEach(([R, cor]) => mk("path", { d: quarto(R), class: "arco " + cor }, g));

  // the serving window, its inside, and the counter under it
  const onSide = (pts) => pts.map(([x, z]) => P(x, W, z));
  mk("path", { d: poly(onSide(fillet([[WX0, WZ0], [WX1, WZ0], [WX1, WZ1], [WX0, WZ1]], [2, 2, 2, 2]))), class: "moldura" }, g);
  mk("path", { d: poly(onSide(fillet([[WX0 + 3, WZ0 + 3], [WX1 - 3, WZ0 + 3], [WX1 - 3, WZ1 - 3], [WX0 + 3, WZ1 - 3]], [1, 1, 1, 1]))), class: "dentro" }, g);
  const [kr, ki] = rings(WX0 - 3, W, WX1 + 3, W + 7, 1.5, 0.7);
  put(solid(layer("balcao")), prism(P, front, kr, ki, WZ0 - 2.4, WZ0));
  // three dots on the counter: what is being served
  [WX0 + 12, WX0 + 25, WX0 + 38].forEach((x, i) => {
    const d = mk("circle", { r: 2.2, class: "dot prato p" + i }, g);
    place(d, P(x, W + 3.5, WZ0 + 1.5));
  });

  for (const x of AX) {
    const q = wheel(P, x);
    const rg = layer("roda");
    mk("path", { d: q.tyre, class: "sil pneu" }, rg);
    mk("path", { d: q.rim, class: "aro" }, rg);
    mk("path", { d: q.hub, class: "cubo" }, rg);
  }

  // the hatch, painted last: it stands out nearest the viewer
  const shape = fillet([[WX0 - 2, 0], [WX1 + 2, 0], [WX1 + 2, HD], [WX0 - 2, HD]], [1, 1, 3, 3]);
  const hg = layer("toldo");
  const struts = mk("path", { class: "nf lo" }, hg), back = mk("path", { class: "lo" }, hg);
  const face = mk("path", { class: "sil" }, hg);
  const listras = [0, 1, 2, 3, 4].map(() => mk("path", { class: "listra" }, hg));
  const lip = mk("path", { class: "nf lo" }, hg);

  const open1 = spring(0);
  let drawn = NaN;
  function draw() {
    const a = lerp(REST, MAX, clamp(open1.x, 0, 1.05));
    if (a === drawn) return;
    drawn = a;
    const q = hatch(P, shape, a);
    back.setAttribute("d", q.back); face.setAttribute("d", q.face);
    lip.setAttribute("d", q.lip); struts.setAttribute("d", q.struts);
    q.listras.forEach((d, k) => listras[k].setAttribute("d", d));
  }
  draw();

  const B = register(stage, (dt) => { const m = stepS(open1, dt); draw(); return m; });
  bag.add(B.unregister);

  /** How open the hatch wants to be, from the pointer's spot on the ground: 1 near the window, falling to 0. */
  function aim(p) {
    let t = 0;
    if (p) {
      const [x, y] = unproj(C, p[0], p[1], 0), d = Math.hypot(x - SPOT[0], y - SPOT[1]);
      t = d < NEAR ? 1 : d > FAR ? 0 : 1 - (d - NEAR) / (FAR - NEAR);
    }
    open1.t = t;
    const on = t > 0.5;
    face.classList.toggle("hi", on); lip.classList.toggle("hi", !on);
    read.textContent = t === 0 ? "rest" : `janela ${String(Math.round(t * 100)).padStart(2, "0")}%`;
    B.wake();
  }
  aim(null);

  bag.add(pointer(stage, { move: (p) => aim(p), leave: () => aim(null) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { MAX = v; drawn = NaN; B.wake(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "foodtruck",
  means: "A food truck: bring the pointer to its window and the hatch lifts into an awning, ready to serve.",
  rules: [1, 3, 5, 8, 9],
  range: [70, 92, 112],
  tour: [[150, 250], [230, 200], [320, 110], null],
  mount,
});
