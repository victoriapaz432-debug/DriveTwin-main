import { fileURLToPath } from "node:url";
import { createDatabase, insertCar, ValidationError } from "../lib/database.js";
import { SEED_CARS } from "../lib/seed-cars.js";

// A lista de carros fica em lib/seed-cars.js. Para cadastrar outro carro, adicione-o lá
// (ou use o painel /admin). Carros que já estão no catálogo são ignorados.
const CARS = SEED_CARS;

const path =
  process.env.DB_PATH ??
  fileURLToPath(new URL("../data/drivetwin.db", import.meta.url));

const db = createDatabase(path);

let inserted = 0;
let failed = 0;
let skipped = 0;

try {
  for (const car of CARS) {
    try {
      const id = insertCar(db, car);

      console.log(
        `[OK] #${id} - ${car.brand} ${car.model} ${car.year}`
      );

      inserted++;
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        console.error(`[ERRO] ${car.brand} ${car.model}:`, error);
        failed++;
        continue;
      }

      if (error.message.includes("já está no catálogo")) {
        console.log(`[JÁ EXISTE] ${car.brand} ${car.model} ${car.year}`);
        skipped++;
        continue;
      }

      console.error(
        `[VALIDAÇÃO] ${car.brand} ${car.model}: ${error.message}`
      );

      failed++;
    }
  }

  console.log("\n===== RESULTADO =====");
  console.log(`Inseridos: ${inserted}`);
  console.log(`Já existiam: ${skipped}`);
  console.log(`Falharam: ${failed}`);
  console.log(`Total: ${CARS.length}`);
} finally {
  db.close();
}