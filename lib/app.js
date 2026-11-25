import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { extname, join, normalize } from "node:path";
import { randomBytes } from "node:crypto";
import { listCars, insertCar, updateCar, deleteCar, verifyAdmin } from "./database.js";
import { computeMetrics } from "./metrics.js";

const PUBLIC_DIR = fileURLToPath(new URL("../public/", import.meta.url));
const PAGES = { "/": "index.html", "/catalogo": "catalogo.html", "/admin": "admin.html", "/relatorio": "relatorio.html" };
const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".pdf": "application/pdf", ".svg": "image/svg+xml", ".ico": "image/x-icon",
};
const SESSION_MS = 1000 * 60 * 60 * 2;

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function createApp({ db }) {
  const sessions = new Map(); // token -> { username, expires }
  const attempts = new Map(); // ip -> { count, resetAt }  (limite simples contra força bruta)

  const json = (res, status, body, headers = {}) => {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
    res.end(JSON.stringify(body));
  };
  const readBody = (req) => new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; if (raw.length > 10_000) { reject(new HttpError(413, "Corpo muito grande")); req.destroy(); } });
    req.on("end", () => { try { resolve((raw && JSON.parse(raw)) || {}); } catch { reject(new HttpError(400, "JSON inválido")); } });
    req.on("error", reject);
  });
  const sessionOf = (req) => {
    const token = /(?:^|;\s*)dt_session=([a-f0-9]+)/.exec(req.headers.cookie ?? "")?.[1];
    const session = token && sessions.get(token);
    if (!session || session.expires < Date.now()) { sessions.delete(token); return null; }
    return { token, ...session };
  };

  const withMetrics = (car) => ({ ...car, metrics: computeMetrics(car) });
  const carById = (id) => listCars(db).find((car) => car.id === id);
  const requireAdmin = (req) => {
    const session = sessionOf(req);
    if (!session) throw new HttpError(401, "Faça login como administrador.");
    return session;
  };

  async function handleApi(req, res, path) {
    if (path === "/api/cars" && req.method === "GET") {
      return json(res, 200, { cars: listCars(db).map(withMetrics) });
    }

    // Cadastro, edição e exclusão de carros: somente administrador logado.
    if (path === "/api/admin/cars" && req.method === "POST") {
      requireAdmin(req);
      const id = insertCar(db, await readBody(req));
      return json(res, 201, { car: withMetrics(carById(id)) });
    }
    const carRoute = /^\/api\/admin\/cars\/(\d+)$/.exec(path);
    if (carRoute && req.method === "PUT") {
      requireAdmin(req);
      const id = Number(carRoute[1]);
      if (!updateCar(db, id, await readBody(req))) throw new HttpError(404, "Carro não encontrado.");
      return json(res, 200, { car: withMetrics(carById(id)) });
    }
    if (carRoute && req.method === "DELETE") {
      requireAdmin(req);
      if (!deleteCar(db, Number(carRoute[1]))) throw new HttpError(404, "Carro não encontrado.");
      return json(res, 200, { ok: true });
    }

    if (path === "/api/admin/me" && req.method === "GET") {
      const session = sessionOf(req);
      return json(res, 200, { authenticated: Boolean(session), username: session?.username ?? null });
    }
    if (path === "/api/admin/login" && req.method === "POST") {
      const ip = req.socket.remoteAddress ?? "?";
      const entry = attempts.get(ip);
      if (entry && entry.resetAt > Date.now() && entry.count >= 5) return json(res, 429, { error: "Muitas tentativas. Aguarde um minuto." });
      const { username, password } = await readBody(req);
      if (!verifyAdmin(db, username ?? "", password ?? "")) {
        const current = entry && entry.resetAt > Date.now() ? entry : { count: 0, resetAt: Date.now() + 60_000 };
        attempts.set(ip, { ...current, count: current.count + 1 });
        return json(res, 401, { error: "Usuário ou senha incorretos." });
      }
      attempts.delete(ip);
      const token = randomBytes(32).toString("hex");
      sessions.set(token, { username, expires: Date.now() + SESSION_MS });
      return json(res, 200, { ok: true }, { "Set-Cookie": `dt_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}` });
    }
    if (path === "/api/admin/logout" && req.method === "POST") {
      const session = sessionOf(req);
      if (session) sessions.delete(session.token);
      return json(res, 200, { ok: true }, { "Set-Cookie": "dt_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" });
    }
    return json(res, 404, { error: "Rota não encontrada" });
  }

  async function handleStatic(res, path) {
    const relative = PAGES[path] ?? normalize(decodeURIComponent(path)).replace(/^([/\\])+/, "");
    const file = join(PUBLIC_DIR, relative);
    if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end("Acesso negado"); }
    try {
      const data = await readFile(file);
      res.writeHead(200, { "Content-Type": MIME[extname(file)] ?? "application/octet-stream" });
      res.end(data);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Página não encontrada");
    }
  }

  return createServer(async (req, res) => {
    const path = new URL(req.url, "http://localhost").pathname;
    try {
      if (path.startsWith("/api/")) await handleApi(req, res, path);
      else await handleStatic(res, path);
    } catch (error) {
      const status = error.status ?? 500;
      if (status >= 500) console.error(error);
      if (!res.headersSent) json(res, status, { error: status >= 500 ? "Erro interno do servidor." : error.message });
    }
  });
}
