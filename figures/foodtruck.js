/**
 * Food truck (like the real Narua truck: white cab, black box painted with arches): a truck parked with its serving side to the viewer. A long box
 * body, a cabin narrower at the top with a sloping windscreen, two wheels, a
 * serving window with a counter, and a hatch hinged over the window, always
 * held open as an awning on its two struts. Moving the pointer over the
 * figure sets the food steaming; when it stops, the steam fades. The slider is
 * how far the hatch opens, in degrees.
 */
const {
  Cam, facing, fillet, fit, hull, lerp, open, poly, prism, proj, rad, ringAt, rings, rrect, run, seg,
  disposer, mk, place, pointer, put, register, solid,
} = HL;

const L = 84, CL = 26, W = 46, Z0 = 11, ZB = 64, ZC = 54;
const WX0 = 16, WX1 = 66, WZ0 = 30, WZ1 = 52, HZ = 55, HD = 26, TK = 1.4;
const WR = 10, AX = [20, 92], CALMA = 1800;

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

  // on the cab's front, under the windscreen: an orange badge with the name
  const fx = (z) => lerp(L + CL - 0.6, L + CL - 7.6, (z - Z0) / (ZC - Z0)) + 0.2;
  const bz = 23, o = P(fx(bz), W / 2, bz), eu = P(fx(bz), W / 2 - 1, bz), ev = P(fx(bz - 1), W / 2, bz - 1);
  const m = [eu[0] - o[0], eu[1] - o[1], ev[0] - o[0], ev[1] - o[1], o[0], o[1]].map((n) => n.toFixed(3)).join(" ");
  const selo = mk("g", { transform: "matrix(" + m + ")", class: "selo-frente" }, cabG);
  mk("circle", { r: 9, class: "bolinha" }, selo);
  mk("text", { class: "nome", "text-anchor": "middle", y: 1.3 }, selo).textContent = "NARUA";

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
  // our two cooks, drawn flat and facing the viewer, local y pointing down from the feet:
  // one stands on the ground beside the truck, the other works inside, seen from the waist up in the window
  const plano = (x, y, z, s) => {
    const o = P(x, y, z), eu = P(x + s, y, z), ev = P(x, y, z - s);
    return [eu[0] - o[0], eu[1] - o[1], ev[0] - o[0], ev[1] - o[1], o[0], o[1]].map((n) => n.toFixed(3)).join(" ");
  };
  const cozinheira = (x, k, dentro) => {
    const at = dentro ? plano(x, W, WZ0 - 12, 1) : plano(x, W + 7, 0, 1.25);
    const c = mk("g", { transform: "matrix(" + at + ")", class: "cozinheira c" + k }, g);
    const d = (cls, path) => mk("path", { d: path, class: cls }, c);
    if (k === 0) d("cabelo", "M 2.5 -31.5 Q 8 -30 6.5 -22.5 Q 5.5 -26 2.8 -27.5 Z");
    if (k === 1) d("cabelo", "M -4.6 -31 Q -5.4 -27 -4.8 -24.6 L 4.8 -24.6 Q 5.4 -27 4.6 -31 Z");
    if (!dentro) d("perna", "M -3.6 -13 L -3.4 -1 M 3.6 -13 L 3.4 -1");
    if (!dentro) d("sapato", "M -5.6 0 Q -5.6 -1.6 -3.4 -1.6 Q -1.6 -1.6 -1.6 0 Z M 1.6 0 Q 1.6 -1.6 3.4 -1.6 Q 5.6 -1.6 5.6 0 Z");
    d("roupa", "M -6 -12 L -6.3 -20.5 Q -6.3 -24.4 -2.5 -24.4 L 2.5 -24.4 Q 6.3 -24.4 6.3 -20.5 L 6 -12 Z");
    if (k === 0) { d("braco", "M -6 -22 Q -8.5 -17 -7.5 -13"); d("braco", "M 6 -22.5 Q 10 -25 10.5 -30"); }
    else { d("braco", "M -6 -22 Q -7.5 -18 -3 -17"); d("braco", "M 6 -22 Q 7.5 -18 3 -17"); }
    mk("rect", { x: -1.2, y: -26, width: 2.4, height: 2, class: "pele" }, c);
    mk("circle", { cy: -28.4, r: 3.5, class: "pele" }, c);
    d("cabelo franja", "M -3.6 -28.6 Q -3.8 -31.6 0 -31.7 Q 3.8 -31.6 3.6 -28.6 Q 1.5 -29.8 0 -28.9 Q -1.5 -29.8 -3.6 -28.6 Z");
    if (k === 1) d("lenco", "M -3.5 -30.6 Q -3.6 -33.6 0 -33.6 Q 3.6 -33.6 3.5 -30.6 Q 0 -31.9 -3.5 -30.6 Z");
    if (k === 0) {
      mk("circle", { cx: -1.25, cy: -28.1, r: 0.45, class: "olho" }, c);
      mk("circle", { cx: 1.25, cy: -28.1, r: 0.45, class: "olho" }, c);
      mk("circle", { cx: 10.6, cy: -30.6, r: 1.3, class: "pele mao" }, c);
    } else {
      d("olho-linha", "M -2.1 -28 Q -1.3 -27.5 -0.6 -28 M 0.6 -28 Q 1.3 -27.5 2.1 -28");
      // a kitten's face on her shirt, as its logo
      d("gato", "M -2 -21.4 L -2.1 -24.3 L -0.8 -23 Q 0 -23.2 0.8 -23 L 2.1 -24.3 L 2 -21.4 Q 1.9 -19.8 0 -19.8 Q -1.9 -19.8 -2 -21.4 Z");
      mk("circle", { cx: -0.75, cy: -21.6, r: 0.32, class: "olho" }, c);
      mk("circle", { cx: 0.75, cy: -21.6, r: 0.32, class: "olho" }, c);
      d("tigela", "M -4.2 -17.6 L 4.2 -17.6 Q 4 -14 0 -14 Q -4 -14 -4.2 -17.6 Z");
    }
    d("sorriso", "M -1.2 -26.8 Q 0 -25.9 1.2 -26.8");
  };
  cozinheira(WX0 + 9, 1, true);

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

  let drawn = NaN;
  function draw() {
    const a = MAX;
    if (a === drawn) return;
    drawn = a;
    const q = hatch(P, shape, a);
    back.setAttribute("d", q.back); face.setAttribute("d", q.face);
    lip.setAttribute("d", q.lip); struts.setAttribute("d", q.struts);
    q.listras.forEach((d, k) => listras[k].setAttribute("d", d));
  }
  draw();

  face.classList.add("hi");

  // the cook outside stands by the cab, nearer the viewer than the hatch, so she is painted after it
  cozinheira(76, 0, false);

  // steam from the food, rising in front of the window (the page's CSS animates it, and fades it in while the pointer moves)
  const fg = layer("fumaca");
  [[WX0 + 12, 0], [WX0 + 25, 1], [WX0 + 38, 2]].forEach(([x, k]) => {
    const [sx, sy] = P(x, W + 5, WZ1 - 4);
    mk("path", { d: "M" + sx.toFixed(1) + " " + sy.toFixed(1) + " c -4 -5 4 -9 0 -14 s -4 -9 0 -14", class: "nf fumaca f" + k }, fg);
  });

  const B = register(stage, () => { draw(); return false; });
  bag.add(B.unregister);

  /** Each move of the pointer sets the food steaming; it fades once the pointer has been still for a while. */
  let calma = 0;
  function mexe() {
    fg.classList.add("on");
    clearTimeout(calma);
    calma = setTimeout(() => fg.classList.remove("on"), CALMA);
  }
  read.textContent = "rest";
  bag.add(() => clearTimeout(calma));

  bag.add(pointer(stage, { move: mexe, leave: () => {} }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { MAX = v; drawn = NaN; B.wake(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "foodtruck",
  means: "A food truck with its window open: move the pointer over it and the food starts steaming.",
  rules: [1, 3, 5, 8, 9],
  range: [70, 140, 140],
  tour: [[150, 250], [230, 200], [320, 110], null],
  mount,
});
