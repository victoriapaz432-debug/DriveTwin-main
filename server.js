import { fileURLToPath } from "node:url";
import { createApp } from "./lib/app.js";
import { createDatabase } from "./lib/database.js";

const databasePath = process.env.DB_PATH ?? fileURLToPath(new URL("./data/drivetwin.db", import.meta.url));
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";
const db = createDatabase(databasePath);
const server = createApp({ db });

server.listen(port, host, () => {
  console.log(`DriveTwin disponível em http://localhost:${port}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
