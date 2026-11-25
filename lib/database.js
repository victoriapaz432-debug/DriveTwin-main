// Banco nativo do Node.js (node:sqlite, Node >= 22.13). Sem dependências externas.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { isPlausible } from "../public/js/simulation.js";
import { SEED_CARS } from "./seed-cars.js";

// ---- Padrão dos dados de um carro ----
// Nome do campo = o que é + unidade. Só entra no banco o que a simulação e as métricas usam.
//   mass_kg, power_cv, top_speed_kmh  → física da simulação (massa, potência, velocidade máxima)
//   tank_l, km_l_*, co2_g_km          → consumo, autonomia, custo e emissões
// O consumo misto, a autonomia, o custo e o 0–100 km/h NÃO ficam no banco: são calculados.
const FUEL_TYPES = ["flex", "gasolina"];

const FIELDS = [
  { name: "brand", label: "Marca", type: "text", max: 40 },
  { name: "model", label: "Modelo", type: "text", max: 60 },
  { name: "year", label: "Ano", type: "int", min: 1990, max: new Date().getFullYear() + 2 },
  { name: "fuel_type", label: "Combustível", type: "enum", values: FUEL_TYPES },
  { name: "mass_kg", label: "Massa (kg)", type: "number", min: 500, max: 5000 },
  { name: "power_cv", label: "Potência (cv)", type: "number", min: 20, max: 1500 },
  { name: "top_speed_kmh", label: "Velocidade máxima (km/h)", type: "number", min: 80, max: 450 },
  { name: "tank_l", label: "Tanque (litros)", type: "number", min: 20, max: 150 },
  { name: "km_l_city", label: "Consumo na cidade com gasolina (km/l)", type: "number", min: 1, max: 40 },
  { name: "km_l_road", label: "Consumo na estrada com gasolina (km/l)", type: "number", min: 1, max: 40 },
  { name: "km_l_ethanol_city", label: "Consumo na cidade com etanol (km/l)", type: "number", min: 1, max: 40, flexOnly: true },
  { name: "km_l_ethanol_road", label: "Consumo na estrada com etanol (km/l)", type: "number", min: 1, max: 40, flexOnly: true },
  { name: "co2_g_km", label: "Emissões de CO₂ (g/km)", type: "number", min: 0, max: 500 },
];
export const CAR_FIELDS = FIELDS.map((field) => field.name);

export class ValidationError extends Error {
  status = 400;
}

// Confere e normaliza os dados de um carro (aceita números como texto, vindos de formulário).
export function validateCar(input) {
  const car = {};
  const flex = input.fuel_type === "flex";
  for (const field of FIELDS) {
    let value = input[field.name];
    const empty = value === undefined || value === null || String(value).trim() === "";
    if (field.flexOnly && !flex) { car[field.name] = null; continue; } // carro só a gasolina não tem etanol
    if (empty) throw new ValidationError(`Preencha o campo "${field.label}".`);
    if (field.type === "text") {
      value = String(value).trim();
      if (value.length > field.max) throw new ValidationError(`"${field.label}" deve ter no máximo ${field.max} caracteres.`);
    } else if (field.type === "enum") {
      if (!field.values.includes(value)) throw new ValidationError(`"${field.label}" deve ser: ${field.values.join(" ou ")}.`);
    } else {
      value = Number(value);
      if (!Number.isFinite(value) || (field.type === "int" && !Number.isInteger(value))) throw new ValidationError(`"${field.label}" precisa ser um número${field.type === "int" ? " inteiro" : ""}.`);
      if (value < field.min || value > field.max) throw new ValidationError(`"${field.label}" deve estar entre ${field.min} e ${field.max}.`);
    }
    car[field.name] = value;
  }
  if (!isPlausible(car)) throw new ValidationError("Massa, potência e velocidade máxima não combinam (a potência não é suficiente para chegar a essa velocidade, ou é alta demais para ela). Confira os valores.");
  return car;
}

const CREATE_CARS = `
  CREATE TABLE IF NOT EXISTS cars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL CHECK (year BETWEEN 1990 AND 2100),
    fuel_type TEXT NOT NULL CHECK (fuel_type IN ('flex', 'gasolina')),
    mass_kg REAL NOT NULL CHECK (mass_kg BETWEEN 500 AND 5000),
    power_cv REAL NOT NULL CHECK (power_cv BETWEEN 20 AND 1500),
    top_speed_kmh REAL NOT NULL CHECK (top_speed_kmh BETWEEN 80 AND 450),
    tank_l REAL NOT NULL CHECK (tank_l BETWEEN 20 AND 150),
    km_l_city REAL NOT NULL CHECK (km_l_city BETWEEN 1 AND 40),
    km_l_road REAL NOT NULL CHECK (km_l_road BETWEEN 1 AND 40),
    km_l_ethanol_city REAL CHECK (km_l_ethanol_city BETWEEN 1 AND 40),
    km_l_ethanol_road REAL CHECK (km_l_ethanol_road BETWEEN 1 AND 40),
    co2_g_km REAL NOT NULL CHECK (co2_g_km BETWEEN 0 AND 500),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (brand, model, year),
    CHECK ((fuel_type = 'flex' AND km_l_ethanol_city IS NOT NULL AND km_l_ethanol_road IS NOT NULL)
        OR (fuel_type = 'gasolina' AND km_l_ethanol_city IS NULL AND km_l_ethanol_road IS NULL))
  );
`;

export function createDatabase(path) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  migrateLegacyCars(db);
  db.exec(CREATE_CARS);
  db.exec("CREATE TABLE IF NOT EXISTS admin_users (username TEXT PRIMARY KEY, salt TEXT NOT NULL, hash TEXT NOT NULL);");
  if (db.prepare("SELECT COUNT(*) AS n FROM cars").get().n === 0) for (const car of SEED_CARS) insertCar(db, car);
  ensureAdmin(db);
  return db;
}

// Bancos criados pela versão anterior (power_kw, drag_coefficient, consumption_*, ...) são convertidos.
// A tabela antiga é mantida como "cars_legacy" (backup). A velocidade máxima, que não existia, é estimada
// a partir da potência, do Cd e da área frontal que o carro tinha.
function migrateLegacyCars(db) {
  const columns = db.prepare("PRAGMA table_info(cars)").all().map((column) => column.name);
  if (!columns.length || columns.includes("top_speed_kmh")) return;
  db.exec("DROP TABLE IF EXISTS cars_legacy; ALTER TABLE cars RENAME TO cars_legacy;");
  db.exec(CREATE_CARS);
  const insert = db.prepare(`INSERT INTO cars (${CAR_FIELDS.join(", ")}) VALUES (${CAR_FIELDS.map((f) => ":" + f).join(", ")})`);
  let skipped = 0;
  for (const old of db.prepare("SELECT * FROM cars_legacy ORDER BY id").all()) {
    try {
      const flex = old.fuel_type === "flex" && old.ethanol_mixed;
      const car = validateCar({
        brand: old.brand, model: old.model, year: old.year, fuel_type: flex ? "flex" : "gasolina",
        mass_kg: old.mass_kg, power_cv: Math.round(old.power_kw * 1.36), top_speed_kmh: estimateTopSpeed(old), tank_l: old.tank_liters,
        km_l_city: old.consumption_city, km_l_road: old.consumption_road,
        km_l_ethanol_city: flex ? old.ethanol_mixed * (old.consumption_city / old.consumption_mixed) : null,
        km_l_ethanol_road: flex ? old.ethanol_mixed * (old.consumption_road / old.consumption_mixed) : null,
        co2_g_km: old.co2_grams,
      });
      insert.run(car);
    } catch (error) {
      skipped++;
      console.warn(`[migração] "${old.brand} ${old.model}" não foi convertido: ${error.message}`);
    }
  }
  console.log(`[migração] Banco atualizado para o novo padrão${skipped ? ` (${skipped} carro(s) ignorado(s))` : ""}. Backup na tabela cars_legacy.`);
}

function estimateTopSpeed(old) {
  const power = old.power_kw * 1000 * 0.62, area = old.drag_coefficient * old.frontal_area;
  let low = 10, high = 150; // m/s
  for (let i = 0; i < 40; i++) {
    const v = (low + high) / 2;
    (0.5 * 1.2 * area * v ** 3 + 0.012 * (old.mass_kg + 75) * 9.81 * v < power ? (low = v) : (high = v));
  }
  return Math.min(300, Math.max(100, Math.round(((low * 3.6) / 5)) * 5));
}

// ---- Catálogo ----
const friendly = (error) => {
  if (String(error.message).includes("UNIQUE")) return new ValidationError("Esse carro já está no catálogo (mesma marca, modelo e ano).");
  return error;
};

export function insertCar(db, input) {
  const car = validateCar(input);
  const sql = `INSERT INTO cars (${CAR_FIELDS.join(", ")}) VALUES (${CAR_FIELDS.map((f) => ":" + f).join(", ")})`;
  try { return Number(db.prepare(sql).run(car).lastInsertRowid); } catch (error) { throw friendly(error); }
}

export function updateCar(db, id, input) {
  const car = validateCar(input);
  const sql = `UPDATE cars SET ${CAR_FIELDS.map((f) => `${f} = :${f}`).join(", ")} WHERE id = :id`;
  try { return db.prepare(sql).run({ ...car, id }).changes > 0; } catch (error) { throw friendly(error); }
}

export function deleteCar(db, id) {
  return db.prepare("DELETE FROM cars WHERE id = ?").run(id).changes > 0;
}

export function listCars(db) {
  return db.prepare("SELECT * FROM cars ORDER BY brand, model, year").all();
}

// ---- Admin ----
const hashPassword = (password, salt) => scryptSync(password, salt, 64).toString("hex");

function ensureAdmin(db) {
  if (db.prepare("SELECT COUNT(*) AS n FROM admin_users").get().n > 0) return;
  const username = process.env.ADMIN_USER ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "drivetwin";
  const salt = randomBytes(16).toString("hex");
  db.prepare("INSERT INTO admin_users (username, salt, hash) VALUES (?, ?, ?)").run(username, salt, hashPassword(password, salt));
  if (!process.env.ADMIN_PASSWORD) {
    console.warn(`[admin] Usuário padrão criado: "${username}" / "drivetwin". Defina ADMIN_USER e ADMIN_PASSWORD antes de publicar.`);
  }
}

export function verifyAdmin(db, username, password) {
  const row = db.prepare("SELECT salt, hash FROM admin_users WHERE username = ?").get(String(username));
  if (!row) return false;
  const expected = Buffer.from(row.hash, "hex");
  const received = Buffer.from(hashPassword(String(password), row.salt), "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}
