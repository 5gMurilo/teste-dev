# Teste Desenvolvedor Monest - Consultor de CEP

API REST que consulta CEP alternando entre provedores externos (ViaCEP e
BrasilAPI) com fallback automático, cache em Redis e observabilidade completa.
Inclui um frontend SSR (React 19 + Vite 7 + Hono) com proxy same-origin.

---

## Tecnologias utilizadas no Backend

| Tecnologia     | Versão | Propósito                                                  |
| -------------- | ------ | ---------------------------------------------------------- |
| **NestJS**     | 12.x   | Framework HTTP, injeção de dependências, módulos           |
| **TypeScript** | 6.x    | Tipagem estática                                           |
| **Node.js**    | 22.x   | Runtime                                                    |
| **Redis**      | 7.x    | Cache de respostas e grace period (stale-while-revalidate) |
| **Pino**       | 10.x   | Logging estruturado com redação de dados sensíveis         |
| **Zod**        | 4.x    | Validação e parsing de variáveis de ambiente               |
| **IoRedis**    | 6.x    | Cliente Redis                                              |
| **Helmet**     | 8.x    | Headers de segurança HTTP                                  |
| **Swagger**    | 12.x   | Documentação OpenAPI automática                            |
| **Throttler**  | 6.x    | Rate limiting                                              |
| **Biome**      | 2.x    | Lint e formatação                                          |
| **Vitest**     | 4.x    | Testes unitários, integração e e2e                         |

### Arquitetura do Backend

- **Circuit breaker** com fallback entre ViaCEP e BrasilAPI
- **Cache em Redis** com TTL configurável e grace period
- **Observabilidade** — logs estruturados com `event`, `cep`, `provider`,
  `freshness`, `attempt`
- **Dev log viewer** — ring buffer em memória exposto via
  `GET /api/v1/dev-logs?since=<seq>` (opt-in, gate explícito)
- **Docker multi-stage** — build separado, instalação `--prod` na imagem final

---

## Pré-requisitos

- **Node.js** 22+ (recomendado: usar `nvm` ou `fnm`)
- **pnpm** 10+ (ativado via corepack: `corepack enable`)
- **Redis** 7+ (pode ser via Docker:
  `docker run -d -p 6379:6379 redis:7-alpine`)

Opcional:

- **Docker** + **Docker Compose** (para subir tudo de uma vez)

---

## Como rodar apenas o Backend

```bash
# 1. Entrar na pasta
cd cep-consultant-api

# 2. Instalar dependências
pnpm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env se necessário (ex: REDIS_URL, PORT)

# 4. Garantir que o Redis está no ar
docker run -d --name redis -p 6379:6379 redis:7-alpine

# 5. Rodar em modo desenvolvimento
pnpm start:dev

# Ou build + produção:
# pnpm build
# pnpm start:prod
```

A API estará disponível em `http://localhost:8000`.

Endpoints principais:

- `GET /api/v1/cep/:cep` — consulta de CEP com cache e fallback
- `GET /api/v1/health` — healthcheck
- `GET /api` — documentação Swagger

---

## Como rodar apenas o Frontend

O frontend é uma aplicação SSR (Server-Side Rendering) que atua como proxy
same-origin para a API. O navegador **nunca** fala diretamente com a API —
apenas com o servidor Hono.

```bash
# 1. Entrar na pasta
cd cep-consultant-frontend

# 2. Instalar dependências
pnpm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env se necessário. Importante:
# - API_BASE_URL=http://localhost:8000/api/v1 (endereço da API)
# - DEV_TOOLS_ENABLED=false (ou true para ver o drawer de logs)

# 4. Rodar em modo desenvolvimento
pnpm dev
```

O frontend estará disponível em `http://localhost:3000`.

### Build de produção (frontend)

```bash
pnpm build
pnpm start
```

---

## Como rodar tudo junto (Docker Compose)

```bash
# Na raiz do repositório
docker compose up --build
```

Isso sobe:

- **Redis** na porta `6379`
- **API** na porta `8000`
- **Frontend** na porta `5173`

```bash
# Verificar health dos serviços
curl http://localhost:8000/api/v1/health
curl http://localhost:5173
```

---

## Variáveis de ambiente do Backend

| Variável                       | Default                    | Descrição                                                  |
| ------------------------------ | -------------------------- | ---------------------------------------------------------- |
| `NODE_ENV`                     | `development`              | Ambiente (`development` ou `production`)                   |
| `PORT`                         | `8000`                     | Porta do servidor                                          |
| `REDIS_URL`                    | `redis://localhost:6379`   | Conexão Redis                                              |
| `REDIS_TTL_SECONDS`            | `604800`                   | TTL do cache (7 dias)                                      |
| `REDIS_GRACE_SECONDS`          | `86400`                    | Grace period stale-while-revalidate (1 dia)                |
| `BRASIL_API_PROVIDER_BASE_URL` | `https://brasilapi.com.br` | Base URL do provider BrasilAPI                             |
| `VIA_CEP_PROVIDER_BASE_URL`    | `https://viacep.com.br`    | Base URL do provider ViaCEP                                |
| `DEV_TOOLS_ENABLED`            | `false`                    | Opt-in do drawer de logs (requer `NODE_ENV != production`) |
| `DEV_LOGS_BUFFER_SIZE`         | `500`                      | Tamanho do ring buffer de logs em memória                  |

---

## Testes

### Backend

```bash
cd cep-consultant-api

# Unitários + integração
pnpm test

# E2E
pnpm test:e2e

# Com cobertura
pnpm test:cov
```

### Frontend

```bash
cd cep-consultant-frontend

# Unitários
pnpm test
```

---

## Estrutura do projeto

```
.
├── cep-consultant-api/          # Backend NestJS
│   ├── src/
│   │   ├── cep/                 # Módulo de consulta de CEP
│   │   ├── dev-logs/            # Ring buffer + endpoint de polling
│   │   ├── common/              # Config, pipes, filters, interceptors
│   │   ├── health/              # Healthcheck
│   │   └── main.ts              # Bootstrap
│   ├── Dockerfile               # Multi-stage build
│   └── docker-compose.yml       # Redis
│
└── cep-consultant-frontend/     # Frontend Vite + React 19 SSR
    ├── server/                  # Hono SSR + proxy same-origin
    ├── src/                     # Componentes React
    ├── Dockerfile               # Multi-stage build
    └── .env.example             # Variáveis de ambiente
```

---

## Decisões de arquitetura

- **Same-origin ou nada** — O navegador nunca conhece o endereço da API. O
  servidor SSR atua como proxy reverso.
- **Gate opt-in explícito** — O drawer de logs de desenvolvimento só existe
  quando `DEV_TOOLS_ENABLED === 'true' && NODE_ENV !== 'production'`. Ausência =
  desligado.
- **Polling em vez de SSE** — Para o volume de tráfego de uma ferramenta dev
  acionada por clique, polling (~1s) é mais simples e não sofre com stall
  silencioso de conexões.
- **Fail-closed** — Ausência de configuração significa recurso desligado, em
  todas as camadas.

---

## Autor

[Murilo Cardoso](https://www.linkedin.com/in/murilo-cardoso-dos-santos/)
