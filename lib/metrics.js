// Métricas de eficiência exibidas na plataforma. Tudo é calculado a partir dos dados do carro.
import { FUEL_PRICES, mixedKmL, accel0to100 } from "../public/js/simulation.js";
import { efficiencyGrade } from "../public/js/grading.js";

export { efficiencyGrade };

export function computeMetrics(car) {
  const kmlMixed = mixedKmL(car.km_l_city, car.km_l_road);
  const flex = car.fuel_type === "flex";
  const ethanolMixed = flex ? mixedKmL(car.km_l_ethanol_city, car.km_l_ethanol_road) : null;
  const acceleration = accel0to100(car);
  return {
    kmlCity: car.km_l_city,
    kmlRoad: car.km_l_road,
    kmlMixed,
    ethanol: flex ? { city: car.km_l_ethanol_city, road: car.km_l_ethanol_road, mixed: ethanolMixed } : null,
    autonomyKm: Math.round(kmlMixed * car.tank_l),
    autonomyEthanolKm: flex ? Math.round(ethanolMixed * car.tank_l) : null,
    co2GramsKm: car.co2_g_km,
    costPerKmGasoline: FUEL_PRICES.gasolina / kmlMixed,
    costPerKmEthanol: flex ? FUEL_PRICES.etanol / ethanolMixed : null,
    acceleration0to100: acceleration,
    topSpeedKmh: car.top_speed_kmh,
    ...efficiencyGrade({ kmlMixed, co2: car.co2_g_km, acceleration }),
  };
}
