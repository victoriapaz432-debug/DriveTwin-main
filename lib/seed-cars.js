// Carros iniciais do catálogo. Valores aproximados, para fins didáticos (não são dados oficiais).
// Para dados oficiais, confira a Tabela de Consumo e Eficiência Energética (PBE Veicular) do Inmetro.
// Usado ao criar um banco vazio e pelo script `npm run insert` (que ignora carros já cadastrados).
// BYD e outros elétricos/híbridos ficam de fora: o banco só aceita carros flex ou a gasolina.

// Carro de exemplo do relatório (0–100 km/h calculado: ~9 s).
export const EXAMPLE_CAR = {"brand":"Toyota","model":"Corolla 2.0 Flex","year":2024,"fuel_type":"flex","mass_kg":1350,"power_cv":177,"top_speed_kmh":190,"tank_l":50,"km_l_city":11.2,"km_l_road":13.8,"km_l_ethanol_city":7.9,"km_l_ethanol_road":9.7,"co2_g_km":135};

export const SEED_CARS = [
  EXAMPLE_CAR,
  { brand: "Volkswagen", model: "Polo 1.0 TSI", year: 2024, fuel_type: "flex", mass_kg: 1140, power_cv: 116, top_speed_kmh: 192, tank_l: 52, km_l_city: 12.5, km_l_road: 15.1, km_l_ethanol_city: 8.8, km_l_ethanol_road: 10.5, co2_g_km: 115 },
  { brand: "Chevrolet", model: "Onix 1.0 Turbo", year: 2024, fuel_type: "flex", mass_kg: 1090, power_cv: 116, top_speed_kmh: 187, tank_l: 44, km_l_city: 13.5, km_l_road: 16, km_l_ethanol_city: 9.2, km_l_ethanol_road: 11.2, co2_g_km: 112 },
  { brand: "Hyundai", model: "HB20 1.0", year: 2024, fuel_type: "flex", mass_kg: 1000, power_cv: 80, top_speed_kmh: 161, tank_l: 50, km_l_city: 13.3, km_l_road: 15.4, km_l_ethanol_city: 9.6, km_l_ethanol_road: 10.9, co2_g_km: 108 },
  { brand: "Fiat", model: "Argo 1.0", year: 2024, fuel_type: "flex", mass_kg: 1050, power_cv: 75, top_speed_kmh: 162, tank_l: 48, km_l_city: 13.4, km_l_road: 14.6, km_l_ethanol_city: 9.4, km_l_ethanol_road: 10.4, co2_g_km: 110 },
  { brand: "Honda", model: "HR-V 1.5", year: 2024, fuel_type: "flex", mass_kg: 1320, power_cv: 126, top_speed_kmh: 175, tank_l: 50, km_l_city: 12.7, km_l_road: 13.9, km_l_ethanol_city: 8.8, km_l_ethanol_road: 9.8, co2_g_km: 125 },
  { brand: "Nissan", model: "Kicks 1.6", year: 2024, fuel_type: "flex", mass_kg: 1130, power_cv: 113, top_speed_kmh: 175, tank_l: 41, km_l_city: 11.4, km_l_road: 13.7, km_l_ethanol_city: 7.8, km_l_ethanol_road: 9.6, co2_g_km: 128 },
  { brand: "Renault", model: "Kwid 1.0", year: 2024, fuel_type: "flex", mass_kg: 820, power_cv: 71, top_speed_kmh: 156, tank_l: 38, km_l_city: 15.3, km_l_road: 15.7, km_l_ethanol_city: 10.8, km_l_ethanol_road: 11, co2_g_km: 95 },
  { brand: "Fiat", model: "Fastback T200", year: 2024, fuel_type: "flex", mass_kg: 1250, power_cv: 130, top_speed_kmh: 196, tank_l: 47, km_l_city: 11.9, km_l_road: 14.6, km_l_ethanol_city: 8.4, km_l_ethanol_road: 10.2, co2_g_km: 120 },
  { brand: "Jeep", model: "Renegade T270", year: 2024, fuel_type: "flex", mass_kg: 1460, power_cv: 185, top_speed_kmh: 210, tank_l: 55, km_l_city: 10.4, km_l_road: 12.1, km_l_ethanol_city: 7.4, km_l_ethanol_road: 8.6, co2_g_km: 155 },
  { brand: "BMW", model: "320i", year: 2024, fuel_type: "gasolina", mass_kg: 1560, power_cv: 184, top_speed_kmh: 235, tank_l: 59, km_l_city: 10.5, km_l_road: 14, km_l_ethanol_city: null, km_l_ethanol_road: null, co2_g_km: 155 },
  { brand: "Toyota", model: "Yaris 1.5", year: 2024, fuel_type: "flex", mass_kg: 1120, power_cv: 110, top_speed_kmh: 180, tank_l: 45, km_l_city: 12.8, km_l_road: 14.9, km_l_ethanol_city: 8.9, km_l_ethanol_road: 10.6, co2_g_km: 115 },
  { brand: "Volkswagen", model: "T-Cross 200 TSI", year: 2024, fuel_type: "flex", mass_kg: 1220, power_cv: 128, top_speed_kmh: 190, tank_l: 52, km_l_city: 11.7, km_l_road: 13.6, km_l_ethanol_city: 8.1, km_l_ethanol_road: 9.6, co2_g_km: 126 },
  { brand: "Volkswagen", model: "Nivus 200 TSI", year: 2024, fuel_type: "flex", mass_kg: 1200, power_cv: 128, top_speed_kmh: 190, tank_l: 52, km_l_city: 12, km_l_road: 14.2, km_l_ethanol_city: 8.4, km_l_ethanol_road: 10, co2_g_km: 120 },
  { brand: "Fiat", model: "Mobi 1.0", year: 2024, fuel_type: "flex", mass_kg: 940, power_cv: 75, top_speed_kmh: 158, tank_l: 47, km_l_city: 14, km_l_road: 15.2, km_l_ethanol_city: 9.8, km_l_ethanol_road: 10.7, co2_g_km: 104 },
  { brand: "Fiat", model: "Cronos 1.3", year: 2024, fuel_type: "flex", mass_kg: 1100, power_cv: 107, top_speed_kmh: 180, tank_l: 48, km_l_city: 12.2, km_l_road: 14, km_l_ethanol_city: 8.6, km_l_ethanol_road: 9.9, co2_g_km: 118 },
  { brand: "Fiat", model: "Pulse T200", year: 2024, fuel_type: "flex", mass_kg: 1230, power_cv: 130, top_speed_kmh: 190, tank_l: 47, km_l_city: 11.8, km_l_road: 13.6, km_l_ethanol_city: 8.3, km_l_ethanol_road: 9.7, co2_g_km: 125 },
  { brand: "Chevrolet", model: "Tracker 1.2 Turbo", year: 2024, fuel_type: "flex", mass_kg: 1280, power_cv: 133, top_speed_kmh: 190, tank_l: 44, km_l_city: 11.4, km_l_road: 13.2, km_l_ethanol_city: 8, km_l_ethanol_road: 9.3, co2_g_km: 128 },
  { brand: "Peugeot", model: "208 1.6 Griffe", year: 2024, fuel_type: "flex", mass_kg: 1130, power_cv: 118, top_speed_kmh: 188, tank_l: 47, km_l_city: 11.4, km_l_road: 13.6, km_l_ethanol_city: 7.9, km_l_ethanol_road: 9.4, co2_g_km: 130 },
  { brand: "Citroën", model: "C3 Turbo 200", year: 2024, fuel_type: "flex", mass_kg: 1100, power_cv: 130, top_speed_kmh: 185, tank_l: 47, km_l_city: 12.4, km_l_road: 14.5, km_l_ethanol_city: 8.6, km_l_ethanol_road: 10.2, co2_g_km: 112 },
  { brand: "Renault", model: "Duster 1.6", year: 2024, fuel_type: "flex", mass_kg: 1210, power_cv: 120, top_speed_kmh: 175, tank_l: 50, km_l_city: 11, km_l_road: 12.5, km_l_ethanol_city: 7.6, km_l_ethanol_road: 8.7, co2_g_km: 135 },
  { brand: "Hyundai", model: "Creta 1.0 Turbo", year: 2024, fuel_type: "flex", mass_kg: 1250, power_cv: 120, top_speed_kmh: 180, tank_l: 50, km_l_city: 11.9, km_l_road: 13.7, km_l_ethanol_city: 8.3, km_l_ethanol_road: 9.6, co2_g_km: 124 },
  { brand: "Honda", model: "City 1.5", year: 2024, fuel_type: "flex", mass_kg: 1170, power_cv: 126, top_speed_kmh: 190, tank_l: 40, km_l_city: 12.8, km_l_road: 14.5, km_l_ethanol_city: 8.9, km_l_ethanol_road: 10.1, co2_g_km: 118 },
  { brand: "Honda", model: "Civic 2.0", year: 2024, fuel_type: "flex", mass_kg: 1320, power_cv: 155, top_speed_kmh: 200, tank_l: 47, km_l_city: 11.5, km_l_road: 14.2, km_l_ethanol_city: 8, km_l_ethanol_road: 9.8, co2_g_km: 135 },
  { brand: "Nissan", model: "Versa 1.6", year: 2024, fuel_type: "flex", mass_kg: 1100, power_cv: 114, top_speed_kmh: 180, tank_l: 41, km_l_city: 12.5, km_l_road: 14.7, km_l_ethanol_city: 8.7, km_l_ethanol_road: 10.2, co2_g_km: 120 },
  { brand: "Toyota", model: "Corolla Cross 2.0", year: 2024, fuel_type: "flex", mass_kg: 1450, power_cv: 177, top_speed_kmh: 190, tank_l: 47, km_l_city: 11, km_l_road: 12.9, km_l_ethanol_city: 7.7, km_l_ethanol_road: 9, co2_g_km: 150 },
  { brand: "Jeep", model: "Compass T270", year: 2024, fuel_type: "flex", mass_kg: 1550, power_cv: 185, top_speed_kmh: 205, tank_l: 60, km_l_city: 10, km_l_road: 11.8, km_l_ethanol_city: 7, km_l_ethanol_road: 8.3, co2_g_km: 160 },
  { brand: "Ford", model: "Bronco Sport 2.0 EcoBoost", year: 2024, fuel_type: "gasolina", mass_kg: 1700, power_cv: 240, top_speed_kmh: 200, tank_l: 60, km_l_city: 8.6, km_l_road: 10.8, km_l_ethanol_city: null, km_l_ethanol_road: null, co2_g_km: 190 },
  { brand: "Mercedes-Benz", model: "A 200 1.3 Turbo", year: 2024, fuel_type: "gasolina", mass_kg: 1420, power_cv: 163, top_speed_kmh: 225, tank_l: 43, km_l_city: 10.8, km_l_road: 14.2, km_l_ethanol_city: null, km_l_ethanol_road: null, co2_g_km: 142 },
];
