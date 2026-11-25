const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);
const nf = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const loginView = $("#login-view"), panelView = $("#panel-view"), loginError = $("#login-error");
const form = $("#car-form"), formError = $("#form-error"), formOk = $("#form-ok");

let cars = [];
let editingId = null;

const api = async (url, method = "GET", body) => {
  const response = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && url.startsWith("/api/admin/cars")) { show({ authenticated: false }); throw new Error("Sua sessão expirou. Entre novamente."); }
  if (!response.ok) throw new Error(data.error ?? "Algo deu errado.");
  return data;
};

function show(session) {
  loginView.hidden = session.authenticated;
  panelView.hidden = !session.authenticated;
  if (session.authenticated) { $("#who").textContent = session.username; loadCars(); }
}

// ---- Lista de veículos ----
async function loadCars() {
  cars = (await api("/api/cars")).cars;
  $("#cars-body").innerHTML = cars.map((car) => `<tr>
    <td><b>${esc(car.brand)}</b> ${esc(car.model)}</td><td>${car.year}</td><td>${nf.format(car.mass_kg)} kg</td><td>${nf.format(car.power_cv)} cv</td>
    <td>${nf.format(car.top_speed_kmh)} km/h</td><td>${car.fuel_type === "flex" ? "Flex" : "Gasolina"}</td>
    <td><span class="row-actions"><button class="link-button" data-edit="${car.id}" type="button">Editar</button><button class="link-button danger" data-delete="${car.id}" type="button">Excluir</button></span></td></tr>`).join("")
    || `<tr><td colspan="7" class="muted">Nenhum veículo cadastrado.</td></tr>`;
}

$("#cars-body").addEventListener("click", async (event) => {
  const edit = event.target.closest("[data-edit]"), del = event.target.closest("[data-delete]");
  if (edit) startEdit(cars.find((car) => car.id === Number(edit.dataset.edit)));
  if (del) {
    const car = cars.find((item) => item.id === Number(del.dataset.delete));
    if (!confirm(`Excluir ${car.brand} ${car.model} ${car.year} do catálogo?`)) return;
    try {
      await api(`/api/admin/cars/${car.id}`, "DELETE");
      if (editingId === car.id) stopEdit();
      await loadCars();
      notice(`${car.brand} ${car.model} foi excluído.`);
    } catch (error) { notice(error.message, true); }
  }
});

// ---- Formulário (cadastro e edição) ----
function notice(message, isError = false) {
  formError.hidden = !isError; formOk.hidden = isError;
  (isError ? formError : formOk).textContent = message;
}

// Carro só a gasolina não tem consumo de etanol.
function syncFuel() {
  const flex = form.fuel_type.value === "flex";
  form.querySelectorAll("[data-flex]").forEach((label) => { label.hidden = !flex; label.querySelector("input").required = flex; if (!flex) label.querySelector("input").value = ""; });
}
form.fuel_type.addEventListener("change", syncFuel);

function startEdit(car) {
  editingId = car.id;
  for (const element of form.elements) if (element.name) element.value = car[element.name] ?? "";
  syncFuel();
  $("#form-title").textContent = `Editar ${car.brand} ${car.model}`;
  $("#form-submit").textContent = "Salvar alterações";
  $("#form-cancel").hidden = false;
  formError.hidden = formOk.hidden = true;
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function stopEdit() {
  editingId = null;
  form.reset(); syncFuel();
  $("#form-title").textContent = "Cadastrar veículo";
  $("#form-submit").textContent = "Cadastrar veículo";
  $("#form-cancel").hidden = true;
}
$("#form-cancel").addEventListener("click", () => { stopEdit(); formError.hidden = formOk.hidden = true; });

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(form));
  const wasEditing = editingId !== null;
  try {
    const { car } = wasEditing ? await api(`/api/admin/cars/${editingId}`, "PUT", body) : await api("/api/admin/cars", "POST", body);
    stopEdit();
    await loadCars();
    notice(`${car.brand} ${car.model} foi ${wasEditing ? "atualizado" : "cadastrado no catálogo"}.`);
  } catch (error) { notice(error.message, true); }
});

// ---- Login ----
show(await (await fetch("/api/admin/me")).json());
syncFuel();

$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.hidden = true;
  const body = Object.fromEntries(new FormData(event.target));
  const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (response.ok) {
    event.target.reset();
    show(await (await fetch("/api/admin/me")).json());
  } else {
    loginError.textContent = (await response.json()).error ?? "Não foi possível entrar.";
    loginError.hidden = false;
  }
});

$("#logout").addEventListener("click", async () => {
  await fetch("/api/admin/logout", { method: "POST" });
  stopEdit();
  show({ authenticated: false });
});
