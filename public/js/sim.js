// Simulador 3D (interface). O cálculo fica em simulation.js. Requer THREE global (vendor/three.min.js).
import { simulateTrip, TRIP_KM } from "/js/simulation.js";

const WR = 0.32;        // raio da roda (só visual)
const TIMELAPSE = 10;   // o teste passa 10× mais rápido que o tempo real
const $ = (id) => document.getElementById(id);
const nf = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const tile = (label, value, detail = "") => `<div class="tile"><small>${label}</small><b>${value}</b>${detail ? `<span>${detail}</span>` : ""}</div>`;

// ---- Cena 3D ----
const view = $("view");
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
view.appendChild(renderer.domElement);
const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(50, 2, 0.1, 300);
cam.position.set(-6.5, 2.6, 6.5); cam.lookAt(0, 0.6, 0);
scene.add(new THREE.HemisphereLight(0xffffff, 0x556070, 0.9));
const sun = new THREE.DirectionalLight(0xffffff, 0.8); sun.position.set(-5, 10, 6); scene.add(sun);
const world = new THREE.Group(); scene.add(world);
const road = new THREE.Mesh(new THREE.PlaneGeometry(300, 7), new THREE.MeshLambertMaterial({ color: 0x3a3f47 }));
road.rotation.x = -Math.PI / 2; world.add(road);
const grass = new THREE.Mesh(new THREE.PlaneGeometry(300, 60), new THREE.MeshLambertMaterial({ color: 0x4d7a45 }));
grass.rotation.x = -Math.PI / 2; grass.position.y = -0.02; world.add(grass);
const stripes = []; const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf2f2f2 });
for (let i = 0; i < 30; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.02, 0.18), stripeMat); s.position.y = 0.01; world.add(s); stripes.push(s); }
const car = new THREE.Group(); world.add(car);
const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.7, 1.8), new THREE.MeshLambertMaterial({ color: 0xe8590c })); body.position.y = 0.65; car.add(body);
const cab = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.6, 1.6), new THREE.MeshLambertMaterial({ color: 0x222b36 })); cab.position.set(-0.2, 1.25, 0); car.add(cab);
const wheels = [];
[[1.35, 0.9], [1.35, -0.9], [-1.35, 0.9], [-1.35, -0.9]].forEach(([x, z]) => {
  const w = new THREE.Mesh(new THREE.CylinderGeometry(WR, WR, 0.25, 20), new THREE.MeshLambertMaterial({ color: 0x111111 }));
  w.rotation.x = Math.PI / 2;
  const g = new THREE.Group(); g.position.set(x, WR, z); g.add(w);
  w.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.27), new THREE.MeshBasicMaterial({ color: 0xcccccc })));
  car.add(g); wheels.push(w);
});
function resize() { const w = view.clientWidth, h = view.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();

// ---- Estado do teste ----
let current = null;                    // carro selecionado (linha do catálogo)
let run = null;                        // resultado de simulateTrip
let playing = false, tp = 0, idx = 0;  // tp = tempo do teste já exibido (s)
let live = { v: 0, a: 0 }, pitch = 0, off = 0, lastT = performance.now();

function options() { return { persons: Number($("persons").value), fuel: $("fuel").value }; }

function reset() {
  run = null; playing = false; tp = 0; idx = 0; live = { v: 0, a: 0 };
  $("go").textContent = "Iniciar teste";
  $("result").hidden = true;
  showLive({ t: 0, x: 0, v: 0, litres: 0 });
  $("prog").style.width = "0%";
}

function start() {
  if (!current) return;
  run = simulateTrip(current, $("route").value, options());
  playing = true; tp = 0; idx = 0;
  $("result").hidden = true;
  $("go").textContent = "Testando…";
}

function showLive(p) {
  const price = run ? run.totals.cost / run.totals.litres : 0;
  $("k-time").textContent = clock(p.t);
  $("k-km").textContent = `${nf2.format(p.x / 1000)} km`;
  $("k-litres").textContent = `${nf2.format(p.litres)} L`;
  $("k-cost").textContent = money.format(p.litres * price);
  $("hv").textContent = Math.round(p.v * 3.6);
}

function showResult() {
  const t = run.totals, opts = options();
  $("result-tiles").innerHTML = [
    tile("Consumo no teste", `${nf.format(t.kmPerLitre)} km/l`, `${t.ethanol ? "etanol" : "gasolina"} · ${opts.persons} ${opts.persons === 1 ? "pessoa" : "pessoas"}`),
    tile("Combustível gasto", `${nf2.format(t.litres)} L`, `em ${nf.format(t.km)} km`),
    tile("Custo", money.format(t.cost), `${money.format(t.costPerKm)} por km`),
    tile("Emissões", `${Math.round(t.co2Grams)} g CO₂`, `${Math.round(t.co2Grams / t.km)} g/km`),
    tile("Tempo", clock(t.seconds), `velocidade média ${Math.round(t.avgKmh)} km/h`),
  ].join("");
  $("result").hidden = false;
  $("go").textContent = "Refazer teste";
}

// Interpola os pontos do teste no instante tp.
function pointAt(time) {
  const s = run.samples;
  while (idx < s.length - 2 && s[idx + 1].t <= time) idx++;
  const a = s[idx], b = s[idx + 1] ?? a, k = b.t > a.t ? Math.min(1, Math.max(0, (time - a.t) / (b.t - a.t))) : 0;
  return { t: time, x: a.x + (b.x - a.x) * k, v: a.v + (b.v - a.v) * k, litres: a.litres + (b.litres - a.litres) * k, a: (b.v - a.v) / Math.max(b.t - a.t, 0.001) };
}

// Chamado pelo catálogo quando o usuário escolhe um carro.
export function loadCar(data) {
  current = data;
  $("sim-car").textContent = `${data.brand} ${data.model} · ${nf.format(data.mass_kg)} kg · ${nf.format(data.power_cv)} cv · máx. ${nf.format(data.top_speed_kmh)} km/h`;
  const flex = data.fuel_type === "flex";
  $("fuel").disabled = !flex;
  if (!flex) $("fuel").value = "gasolina";
  $("sim-note").textContent = `Teste de ${TRIP_KM} km exibido em tempo acelerado (${TIMELAPSE}×). A simulação usa a massa, a potência e a velocidade máxima do carro para calcular a aceleração e o tempo do percurso. O consumo vem do catálogo e aumenta com o peso a bordo.`;
  reset();
}

$("go").onclick = start;
$("rs").onclick = reset;
for (const id of ["route", "fuel", "persons"]) $(id).addEventListener("change", reset);

// ---- Gráfico de velocidade ----
const ch = $("chart"), cx = ch.getContext("2d");
function chart() {
  const dpr = devicePixelRatio || 1, w = ch.clientWidth, h = ch.clientHeight;
  ch.width = w * dpr; ch.height = h * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const css = getComputedStyle(document.documentElement);
  cx.clearRect(0, 0, w, h); cx.strokeStyle = css.getPropertyValue("--bd"); cx.fillStyle = css.getPropertyValue("--mut"); cx.font = "11px system-ui";
  const ymax = run ? Math.max(60, ...run.samples.map((s) => s.v * 3.6)) * 1.1 : 120;
  for (let i = 0; i <= 4; i++) { const y = h - 18 - ((h - 26) * i) / 4; cx.beginPath(); cx.moveTo(30, y); cx.lineTo(w, y); cx.stroke(); cx.fillText(Math.round((ymax * i) / 4), 0, y + 4); }
  if (!run) return;
  const total = run.totals.seconds, X = (t) => 30 + ((w - 34) * t) / total, Y = (v) => h - 18 - ((h - 26) * v) / ymax;
  const draw = (until, color) => {
    cx.strokeStyle = color; cx.lineWidth = 2; cx.beginPath();
    run.samples.filter((s) => s.t <= until).forEach((s, i) => (i ? cx.lineTo(X(s.t), Y(s.v * 3.6)) : cx.moveTo(X(s.t), Y(s.v * 3.6))));
    cx.stroke();
  };
  draw(total, css.getPropertyValue("--bd")); // percurso completo, em cinza
  draw(tp, css.getPropertyValue("--ac"));    // já percorrido, em azul
  cx.lineWidth = 1;
}

// ---- Laço de animação ----
let frame = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  if (playing) {
    tp = Math.min(run.totals.seconds, tp + dt * TIMELAPSE);
    const p = pointAt(tp);
    live = { v: p.v, a: p.a };
    showLive(p);
    $("prog").style.width = `${(100 * tp) / run.totals.seconds}%`;
    if (tp >= run.totals.seconds) { playing = false; live = { v: 0, a: 0 }; showLive(pointAt(tp)); $("hv").textContent = 0; showResult(); }
  }
  off += live.v * dt;
  stripes.forEach((s, i) => { let x = i * 6 - (off % 6); x = ((((x + 90) % 180) + 180) % 180) - 90; s.position.x = x; });
  pitch += (Math.max(-0.08, Math.min(0.08, live.a * 0.012)) - pitch) * 0.1; car.rotation.z = pitch;
  wheels.forEach((w) => { w.parent.children[0].rotation.y += (live.v / WR) * dt; });
  renderer.render(scene, cam);
  if (frame++ % 3 === 0) chart();
  requestAnimationFrame(loop);
}
reset();
requestAnimationFrame(loop);
