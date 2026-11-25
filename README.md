# DriveTwin

Plataforma web para testar a eficiência de carros: catálogo com métricas e simulador 3D.

## Como rodar

Requer Node.js 22.13 ou superior. Não precisa instalar dependências.

    npm start

Acesse http://localhost:3000

## Páginas

- `/` apresentação do projeto e das métricas
- `/catalogo` catálogo, métricas por carro, simulador 3D e comparação de eficiência
- `/relatorio` relatório do projeto em PDF (arquivo em `public/docs/DriveTwin-Relatorio.pdf`)
- `/admin` área do administrador (cadastrar, editar e excluir veículos)

## Administrador

Só o administrador pode adicionar veículos ao catálogo. O login padrão é `admin` / `drivetwin`.
Para trocar, defina `ADMIN_USER` e `ADMIN_PASSWORD` antes do primeiro start.

O catálogo já começa com 29 carros (lista em `lib/seed-cars.js`). Para completar um banco que já existia, rode

    npm run insert

Carros que já estão cadastrados são ignorados. Para incluir outro carro pelo terminal, adicione-o em `lib/seed-cars.js` e rode o mesmo comando.

## Como funciona

- **Banco (SQLite):** guarda só o necessário para a simulação: massa, potência, velocidade máxima, tanque, consumo (cidade e estrada, gasolina e etanol) e CO2.
- **Calculado automaticamente:** consumo misto, autonomia, custo por km, 0 a 100 km/h e nota de A a E.
- **Simulador:** percurso de 3 km (cidade, estrada ou misto), com combustível e número de pessoas a bordo. Mostra consumo, custo, emissões e tempo.

O cálculo fica em `public/js/simulation.js`. O preço dos combustíveis também é definido nesse arquivo (média nacional da ANP, semana de 01 a 07/11/2026: gasolina R$ 6,47 e etanol R$ 4,15).

A nota de eficiência (A a E) é definida em `public/js/grading.js`: pesos, faixas e a tabela de especificação exibida na apresentação e no catálogo.

## Estrutura

    server.js            inicia o servidor
    lib/                 API, banco de dados e métricas
    public/              páginas, estilos e simulador 3D
    scripts/insert-car.js
