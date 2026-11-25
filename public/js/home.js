import { gradeSpecHtml } from "/js/grading.js";
import { FUEL_PRICES, FUEL_PRICES_SOURCE } from "/js/simulation.js";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const $ = (selector) => document.querySelector(selector);

$("#year").textContent = new Date().getFullYear();
$("#grade-spec").innerHTML = gradeSpecHtml();
$("#fuel-note").textContent = `O custo por km usa o preço do litro dividido pelo consumo misto. Preços usados: gasolina ${money.format(FUEL_PRICES.gasolina)} e etanol ${money.format(FUEL_PRICES.etanol)} por litro (${FUEL_PRICES_SOURCE}).`;

// As marcas vêm do catálogo; se a API falhar, usa uma lista padrão.
let brands = ["Toyota", "Volkswagen", "Fiat", "Chevrolet", "Honda", "Hyundai", "Renault", "Jeep", "Nissan", "BMW"];
try {
  const response = await fetch("/api/cars");
  if (response.ok) {
    const fromCatalog = [...new Set((await response.json()).cars.map((car) => car.brand))];
    if (fromCatalog.length) brands = fromCatalog;
  }
} catch { /* mantém a lista padrão */ }
$("#brands-list").innerHTML = [...brands, ...brands].map((brand) => `<span>${brand}</span>`).join("");
