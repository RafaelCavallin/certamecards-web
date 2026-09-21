# CertameCards — Web

Frontend do CertameCards, um app de flashcards com repetição espaçada para quem estuda para concursos públicos.

É aqui que o **FSRS-6 roda**: o app monta a fila do dia, agenda e registra as avaliações localmente, guarda tudo no IndexedDB para funcionar sem rede, e envia o resultado pela fila de sincronização. O backend ([certamecards-api](https://github.com/RafaelCavallin/certamecards-api)) recebe os estados já calculados.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Angular 22.1 (standalone, zoneless, signals, Signal Forms) |
| Runtime | Node.js 24 LTS |
| Estilos | Tailwind CSS 4.3, sobre os tokens do design system |
| Armazenamento local | IndexedDB via Dexie 4.4 |
| Agendamento | `ts-fsrs` 5.4 (FSRS-6) |
| PWA | `@angular/service-worker` |
| Testes | Vitest, `fake-indexeddb`, `HttpTestingController` |
| E2E | Playwright 1.63 + `@axe-core/playwright` |

## Pré-requisitos

- Node.js 24 LTS
- Docker com Compose v2, para subir a API e rodar os testes E2E

O repositório [certamecards-api](https://github.com/RafaelCavallin/certamecards-api) precisa estar clonado **na mesma pasta que este**:

```
seu-workspace/
├── certamecards-api/
└── certamecards-web/
```

O `compose.yaml` da API usa `../certamecards-web` como contexto de build do serviço `web`.

## Instalação

```bash
npm ci                                  # respeita o package-lock.json
npx playwright install chromium webkit  # uma vez por máquina, e a cada atualização do Playwright
```

No Linux, se faltar biblioteca de sistema para os navegadores: `npx playwright install-deps`.

## Rodando

### Desenvolvimento com recarregamento

Com a API rodando na porta 8080 (veja o README dela):

```bash
npm start     # ng serve --proxy-config proxy.conf.json, porta 4200
```

O `proxy.conf.json` encaminha `/api` para a porta 8080.

> **Cookies:** o cookie `__Host-` exige HTTPS. Em `http://localhost:4200` a API emite o cookie sem `Secure` e sem o prefixo. Fluxos de login, PWA e E2E devem ser validados em `https://certamecards.localhost`, pelo ambiente completo.

### Ambiente completo

Na pasta `certamecards-api/`:

```bash
docker compose --profile full up -d --build
```

O app fica em `https://certamecards.localhost`, com web e API no mesmo domínio via Caddy.

## Validação

Rode nesta ordem antes de concluir qualquer alteração:

```bash
npm run lint            # ESLint, sem erros e sem avisos
npm run test:coverage   # Vitest com cobertura
npm run build           # build de produção
npm run e2e             # Playwright, exige o ambiente completo no ar
```

Auxiliares:

```bash
npm test                                          # Vitest em modo watch
npx ng test --include='src/app/core/scheduler/**'  # testes de uma pasta
npx playwright test e2e/study-session.e2e.ts       # um arquivo E2E
npx playwright show-report                         # relatório e traces da última execução
```

### Cobertura

Piso de **80%** global e **90%** em `core/scheduler`, `core/study`, `core/sync` e `core/auth`. Ficam de fora `main.ts`, `app.config.ts`, `environments/**`, `*.routes.ts`, fixtures, `app/testing/` e `e2e/`.

## Estrutura

```
src/app/
├── core/       lógica e dados, sem UI
├── features/   telas
└── shared/     componentes reutilizáveis
e2e/            specs Playwright
```

| Área de `core/` | Responsabilidade |
|---|---|
| `scheduler` | FSRS-6 via `ts-fsrs`, com vetores de referência versionados |
| `study`, `stats` | Montagem da fila de estudo e indicadores do painel |
| `db`, `data` | IndexedDB com Dexie, para estudar sem rede |
| `sync`, `connectivity` | Fila de envio e sincronização incremental |
| `api`, `auth`, `events`, `pwa`, `theme` | `HttpClient`, sessão, service worker e tema |

As features são `dashboard`, `study`, `deck`, `auth`, `settings` e `admin`.

### Regras de dependência

- `HttpClient` só em `core/api/`; Dexie só em `core/db/`
- Uma feature não importa outra feature
- `shared/ui` não importa `core`
- Testes `*.spec.ts` ficam ao lado do arquivo que testam

### FSRS-6

Os vetores de referência em `core/scheduler/fixtures/fsrs6-vectors.json` só mudam regerando com `scripts/gen-fsrs6-vectors.py`. Nunca os edite à mão.

## Repositórios

- Web (este): https://github.com/RafaelCavallin/certamecards-web
- API: https://github.com/RafaelCavallin/certamecards-api
