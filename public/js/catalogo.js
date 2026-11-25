import { gradeSpecHtml } from "/js/grading.js";
import { FUEL_PRICES, FUEL_PRICES_SOURCE } from "/js/simulation.js";

const nf = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);

let cars = [];
let selected;
let sim = null;

function renderList() {
  $("#car-list").innerHTML = cars.map((car) => `
    <li><button class="car-item ${car.id === selected.id ? "selected" : ""}" data-car-id="${car.id}" aria-pressed="${car.id === selected.id}">
      <span class="car-item-top"><span><span class="car-brand">${esc(car.brand)}</span><span class="car-model">${esc(car.model)}</span></span><span class="car-kml">${nf.format(car.metrics.kmlMixed)} km/l</span></span>
    </button></li>`).join("");
}

function tile(label, value, detail = "") {
  return `<div class="tile"><small>${label}</small><b>${value}</b>${detail ? `<span>${detail}</span>` : ""}</div>`;
}

function renderDetail() {
  const car = selected, m = car.metrics, e = m.ethanol;
  $("#car-title").textContent = `${car.brand} ${car.model}`;
  $("#car-sub").textContent = `${car.year} · ${car.fuel_type === "flex" ? "Flex" : "Gasolina"} · ${nf.format(car.mass_kg)} kg · ${nf.format(car.power_cv)} cv · máx. ${nf.format(car.top_speed_kmh)} km/h`;
  $("#car-grade").textContent = m.grade;
  $("#car-metrics").innerHTML = [
    tile("Consumo (km/l)", `${nf.format(m.kmlMixed)} misto`, `gasolina: cidade ${nf.format(m.kmlCity)} · estrada ${nf.format(m.kmlRoad)}${e ? `<br>etanol: cidade ${nf.format(e.city)} · estrada ${nf.format(e.road)}` : ""}`),
    tile("Autonomia", `${m.autonomyKm} km`, `com gasolina${m.autonomyEthanolKm ? ` · ${m.autonomyEthanolKm} km com etanol` : ""} · tanque de ${nf.format(car.tank_l)} L`),
    tile("Emissões", `${nf.format(m.co2GramsKm)} g CO₂/km`),
    tile("Custo por km", money.format(m.costPerKmGasoline), m.costPerKmEthanol ? `etanol ${money.format(m.costPerKmEthanol)}` : "gasolina"),
    tile("Desempenho", m.acceleration0to100 ? `${nf.format(m.acceleration0to100)} s` : "—", `0–100 km/h · máx. ${nf.format(m.topSpeedKmh)} km/h`),
    tile("Eficiência energética", `Nota ${m.grade}`, `${m.score} de 100 pontos`),
  ].join("");
}

function renderTable() {
  $("#eff-body").innerHTML = [...cars].sort((a, b) => b.metrics.score - a.metrics.score).map((car) => {
    const m = car.metrics;
    return `<tr class="${car.id === selected.id ? "selected" : ""}">
      <td><b>${esc(car.brand)}</b> ${esc(car.model)}</td><td>${nf.format(m.kmlMixed)} km/l</td><td>${m.autonomyKm} km</td>
      <td>${nf.format(m.co2GramsKm)} g/km</td><td>${money.format(m.costPerKmGasoline)}</td><td>${m.acceleration0to100 ? nf.format(m.acceleration0to100) + " s" : "—"}</td>
      <td>${m.score}</td>
      <td><span class="score"><i style="width:${m.score}%"></i></span><span class="grade grade-small">${m.grade}</span></td></tr>`;
  }).join("");
}

function select(car) {
  selected = car;
  renderList(); renderDetail(); renderTable();
  sim?.loadCar(car);
}

$("#car-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-car-id]");
  if (button) select(cars.find((car) => car.id === Number(button.dataset.carId)));
});

try {
  const response = await fetch("/api/cars");
  if (!response.ok) throw new Error("Falha ao carregar o catálogo");
  cars = (await response.json()).cars;
  if (!cars.length) throw new Error("Nenhum carro cadastrado. Cadastre pelo painel /admin.");
  selected = cars[0];
  renderList(); renderDetail(); renderTable();
} catch (error) {
  $("#car-list").innerHTML = `<li class="error-message">${esc(error.message)}</li>`;
}

// O simulador 3D precisa de WebGL; se falhar, o catálogo continua funcionando.
try {
  sim = await import("/js/sim.js");
  if (selected) sim.loadCar(selected);
} catch (error) {
  console.error(error);
  $("#view").innerHTML = `<p class="error-message">Não foi possível iniciar o simulador 3D. Verifique se o navegador tem WebGL habilitado.</p>`;
}

$("#grade-spec").innerHTML = gradeSpecHtml();
$("#fuel-note").textContent = `Custo por km com gasolina a ${money.format(FUEL_PRICES.gasolina)} e etanol a ${money.format(FUEL_PRICES.etanol)} por litro (${FUEL_PRICES_SOURCE}).`;
