// Especificação da nota de eficiência energética (A a E).
// Fica em um único lugar: o servidor usa para calcular a nota e as páginas usam para montar a tabela de especificação.
//
// Cada critério vira de 0 a 1 ponto de forma proporcional entre o "pior" valor (0) e o "melhor" valor (1):
//   pontos = 100 × Σ peso × clamp((valor − pior) / (melhor − pior))

export const GRADE_CRITERIA = [
  { key: "consumption", label: "Consumo misto", unit: "km/l", weight: 0.5, worst: 6, best: 18, higherIsBetter: true },
  { key: "co2", label: "Emissões de CO₂", unit: "g/km", weight: 0.35, worst: 220, best: 90, higherIsBetter: false },
  { key: "acceleration", label: "Aceleração de 0 a 100 km/h", unit: "s", weight: 0.15, worst: 14, best: 6, higherIsBetter: false },
];

// Do melhor para o pior. "min" é a pontuação mínima (de 0 a 100) para receber a nota.
export const GRADE_BANDS = [
  { grade: "A", min: 80, label: "Muito eficiente" },
  { grade: "B", min: 65, label: "Eficiente" },
  { grade: "C", min: 50, label: "Intermediário" },
  { grade: "D", min: 35, label: "Pouco eficiente" },
  { grade: "E", min: 0, label: "Ineficiente" },
];

const clamp = (value) => Math.min(1, Math.max(0, value));
const byKey = Object.fromEntries(GRADE_CRITERIA.map((criterion) => [criterion.key, criterion]));
const part = (criterion, value) => criterion.weight * clamp((value - criterion.worst) / (criterion.best - criterion.worst));

export function gradeFor(score) {
  return GRADE_BANDS.find((band) => score >= band.min).grade;
}

// Se o carro não chega a 100 km/h (acceleration = null), a aceleração conta como a pior possível.
export function efficiencyGrade({ kmlMixed, co2, acceleration }) {
  const score = 100 * (
    part(byKey.consumption, kmlMixed) +
    part(byKey.co2, co2) +
    part(byKey.acceleration, acceleration ?? byKey.acceleration.worst)
  );
  return { score: Math.round(score), grade: gradeFor(score) };
}

// ---- Tabela de especificação (HTML) ----
const nf = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export function gradeSpecHtml() {
  const criteria = GRADE_CRITERIA.map((c) => {
    const zero = `${c.higherIsBetter ? "≤" : "≥"} ${nf.format(c.worst)} ${c.unit}`;
    const full = `${c.higherIsBetter ? "≥" : "≤"} ${nf.format(c.best)} ${c.unit}`;
    return `<tr><td>${c.label}</td><td>${Math.round(c.weight * 100)}%</td><td>${zero}</td><td>${full}</td></tr>`;
  }).join("");
  const bands = GRADE_BANDS.map((band, i) => {
    const upper = i === 0 ? "100" : String(GRADE_BANDS[i - 1].min - 1);
    const range = i === 0 ? `${band.min} a 100` : band.min === 0 ? `0 a ${upper}` : `${band.min} a ${upper}`;
    return `<tr><td><span class="spec-grade">${band.grade}</span></td><td>${range} pontos</td><td>${band.label}</td></tr>`;
  }).join("");
  return `
    <div class="grade-spec">
      <div class="table-wrap">
        <table class="spec-table">
          <caption>Critérios e pesos</caption>
          <thead><tr><th>Critério</th><th>Peso</th><th>0 ponto (pior)</th><th>Pontuação máxima (melhor)</th></tr></thead>
          <tbody>${criteria}</tbody>
        </table>
      </div>
      <div class="table-wrap">
        <table class="spec-table">
          <caption>Faixas da nota</caption>
          <thead><tr><th>Nota</th><th>Pontuação total</th><th>Classificação</th></tr></thead>
          <tbody>${bands}</tbody>
        </table>
      </div>
    </div>
    <p class="spec-note">Entre o pior e o melhor valor, a pontuação de cada critério cresce de forma proporcional. A nota final soma os três critérios (máximo de 100 pontos). Se o carro não chega a 100 km/h, a aceleração recebe 0 ponto.</p>`;
}
