// Modelo de simulação do DriveTwin.
// Funções puras (sem DOM): usadas pelo servidor (métricas do catálogo) e pelo navegador (simulador 3D).
//
// O carro é descrito por poucos dados: massa, potência e velocidade máxima.
// A resistência do ar é calculada a partir deles (a potência equilibra a resistência na velocidade máxima).

// Preço médio de revenda no Brasil (R$/litro): gasolina comum e etanol hidratado.
// Fonte: ANP, Síntese Semanal de Preços, edição 45/2026 (semana de 01/11 a 07/11/2026). Atualize quando precisar.
export const FUEL_PRICES = { gasolina: 6.47, etanol: 4.15 };
export const FUEL_PRICES_SOURCE = "ANP, semana de 01/11 a 07/11/2026 (média nacional)";

const G = 9.81;          // gravidade (m/s²)
const AIR = 1.2;         // densidade do ar (kg/m³)
const ROLLING = 0.012;   // resistência dos pneus no asfalto seco
const POWER_USE = 0.62;  // parte da potência do motor que chega às rodas (perdas de câmbio, trocas de marcha)
const GRIP = 0.45;       // força máxima de tração = 45% do peso do carro
const PERSON_KG = 75;    // peso médio de uma pessoa

// ---- Percursos ----
export const TRIP_KM = 3;
export const ROUTES = {
  cidade: { label: "Cidade", parts: [["city", 1]] },
  estrada: { label: "Estrada", parts: [["road", 1]] },
  misto: { label: "Misto", parts: [["city", 0.55], ["road", 0.45]] }, // 55% cidade + 45% estrada
};
const CRUISE_KMH = { city: 50, road: 110 };
const BLOCK_M = 400;   // distância entre paradas na cidade (semáforos)
const STOP_S = 4;      // tempo parado em cada parada
const COMFORT = 2.0;   // frenagem confortável (m/s²)
const DT = 0.05;       // passo da simulação (s)

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Consumo misto no padrão 55% cidade / 45% estrada.
export const mixedKmL = (city, road) => 1 / (0.55 / city + 0.45 / road);

// ---- Física ----
// Área de arrasto (Cd × área frontal) deduzida da potência, da massa e da velocidade máxima.
export function dragArea(car) {
  const v = car.top_speed_kmh / 3.6;
  const power = car.power_cv * 735.5 * POWER_USE;
  return (2 * (power / v - ROLLING * (car.mass_kg + PERSON_KG) * G)) / (AIR * v * v);
}

// Os dados do carro precisam formar um carro possível (potência suficiente para chegar à velocidade máxima).
export function isPlausible(car) {
  const area = dragArea(car);
  return area >= 0.25 && area <= 3;
}

function dynamics(car, persons) {
  return { mass: car.mass_kg + persons * PERSON_KG, power: car.power_cv * 735.5 * POWER_USE, area: dragArea(car) };
}

// Aceleração (m/s²) a uma velocidade v (m/s) com o acelerador em throttle (0 a 1).
function accelerationAt(v, d, throttle) {
  const drive = Math.min((throttle * d.power) / Math.max(v, 0.5), GRIP * d.mass * G);
  const resistance = 0.5 * AIR * d.area * v * v + ROLLING * d.mass * G;
  return (drive - resistance) / d.mass;
}

// Tempo de 0 a 100 km/h (s) com o pé no fundo e uma pessoa a bordo. null se o carro não chega a 100 km/h.
export function accel0to100(car) {
  const d = dynamics(car, 1);
  let v = 0;
  for (let t = 0; t < 60; t += 0.01) {
    v += accelerationAt(v, d, 1) * 0.01;
    if (v >= 100 / 3.6) return t + 0.01;
  }
  return null;
}

// ---- Teste de percurso ----
// Retorna os pontos do teste (um por segundo simulado) e os totais.
// O carro acelera até a velocidade do trecho; na cidade, para a cada quadra.
// O consumo vem do catálogo (km/l de cidade/estrada) e sobe com o peso extra a bordo.
export function simulateTrip(car, routeKey, { persons = 1, fuel = "gasolina" } = {}) {
  const d = dynamics(car, persons);
  const ethanol = fuel === "etanol" && car.fuel_type === "flex";
  const price = FUEL_PRICES[ethanol ? "etanol" : "gasolina"];
  const kmPerLitre = ethanol
    ? { city: car.km_l_ethanol_city, road: car.km_l_ethanol_road }
    : { city: car.km_l_city, road: car.km_l_road };
  const loadFactor = 1 + (0.3 * (persons - 1) * PERSON_KG) / car.mass_kg; // ~+1% de consumo a cada 45 kg

  let t = 0, x = 0, v = 0, litres = 0, nextSample = 1;
  const samples = [{ t: 0, x: 0, v: 0, litres: 0 }];
  const record = () => { if (t >= nextSample) { samples.push({ t, x, v, litres }); nextSample += 1; } };
  const advance = (a, type) => {
    const nv = Math.max(0, v + a * DT), dx = ((v + nv) / 2) * DT;
    litres += (dx / 1000 / kmPerLitre[type]) * loadFactor;
    x += dx; v = nv; t += DT; record();
  };

  const total = TRIP_KM * 1000, parts = ROUTES[routeKey].parts;
  let partStart = 0;
  parts.forEach(([type, share], partIndex) => {
    const length = total * share;
    const cruise = Math.min(CRUISE_KMH[type], car.top_speed_kmh * 0.95) / 3.6;
    const blocks = type === "city" ? Math.max(1, Math.round(length / BLOCK_M)) : 1;
    for (let b = 0; b < blocks; b++) {
      const blockEnd = partStart + (length * (b + 1)) / blocks;
      const stops = type === "city";
      const last = partIndex === parts.length - 1 && b === blocks - 1;
      while (x < blockEnd - 0.01 && t < 3 * 3600) {
        const remaining = blockEnd - x;
        if (stops && (v * v) / (2 * COMFORT) >= remaining) {
          advance(-clamp((v * v) / (2 * Math.max(remaining, 0.5)), 0.5, 6), type); // frena para parar no fim da quadra
          if (v < 0.05 && remaining < 5) { x = blockEnd; v = 0; }
        } else {
          advance(accelerationAt(v, d, clamp((cruise - v) * 0.8, 0, 1)), type);
        }
      }
      if (stops) {
        v = 0;
        if (!last) for (let s = 0; s < STOP_S / DT; s++) { t += DT; record(); } // parado no semáforo
      }
    }
    partStart += length;
  });
  samples.push({ t, x, v, litres });

  const km = x / 1000;
  return {
    samples,
    totals: {
      km, seconds: t, litres, ethanol,
      kmPerLitre: km / litres,
      cost: litres * price,
      costPerKm: (litres * price) / km,
      co2Grams: car.co2_g_km * km * loadFactor,
      avgKmh: km / (t / 3600),
    },
  };
}
