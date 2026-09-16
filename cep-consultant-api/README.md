# CEP Consultant API

API REST para consulta de endereços brasileiros a partir do CEP, com alta resiliência, cache distribuído e múltiplos provedores de fallback.

## O que foi implementado

### Patterns & Arquitetura

- **Chain of Responsibility**: `CepProviderChain` itera múltiplos provedores em ordem definida por uma strategy, com fallback automático em erros recuperáveis (timeout, conexão, 5xx).
- **Strategy Pattern**: `CepRoundRobinSelection` rotaciona a ordem dos provedores a cada requisição, balanceando a carga entre ViaCEP e BrasilAPI.
- **Circuit Breaker**: cada provedor possui seu próprio circuit breaker independente (estados `CLOSED`, `OPEN`, `HALF_OPEN`) com threshold configurável e recuperação automática.
- **Single-Flight / Locking**: `CachedCepProvider` usa `RedisLockService` para garantir que apenas uma chamada externa ocorra para o mesmo CEP concorrente; os demais aguardam o resultado em memória.
- **Cache com Grace Period**: `CepCacheStore` retorna dados "stale" imediatamente enquanto revalida em background, evitando cold starts.
- **Semaphore**: limite de concorrência configurável (`CONCURRENCY_LIMIT`) com enfileiramento FIFO.

### Stack & Ferramentas

- **NestJS 12** com TypeScript strict, ESM, URI versioning (`/api/v1`), `ValidationPipe` global, Swagger/OpenAPI, rate limiting (`@nestjs/throttler`), CORS, Helmet.
- **Redis** via `ioredis` com retry strategy, offline queue desabilitado e Lua scripts para lock atomic.
- **Logging estruturado** com `nestjs-pino` / `pino-pretty` em desenvolvimento e JSON em produção; eventos de telemetria (`cache_hit`, `cache_miss`, `provider_success`, `provider_timeout`, `provider_fallback`, `circuit_open`, etc.).
- **Dev Logs**: endpoint opt-in `/api/v1/dev-logs` para visualização de logs em tempo real (somente quando `DEV_TOOLS_ENABLED=true` e não-produção).
- **Health Check** em `/api/v1/health` expõe estado dos circuit breakers, estatísticas de cache e fallback.
- **Lint & Format** com Biome.
- **Testes** com Vitest: unitários (mocks), integração (Testcontainers com Redis real) e e2e (supertest).

## Pré-requisitos

- **Node.js** 22+
- **pnpm** (recomendado)
- **Redis** rodando localmente, ou **Docker** + Docker Compose para subir o stack completo

## Configuração

Copie o arquivo de exemplo e ajuste conforme necessário:

```bash
cp .env.example .env
```

Principais variáveis:

| Variável | Descrição | Padrão |
|---|---|---|
| `NODE_ENV` | Ambiente (`development`, `production`, `test`) | `development` |
| `PORT` | Porta da API | `8000` |
| `REDIS_URL` | URL do Redis | `redis://localhost:6379` |
| `BRASIL_API_PROVIDER_BASE_URL` | Base URL do BrasilAPI | `https://brasilapi.com.br/api/cep/v1/` |
| `VIA_CEP_PROVIDER_BASE_URL` | Base URL do ViaCEP | `https://viacep.com.br/ws/` |
| `CONCURRENCY_LIMIT` | Limite de concorrência por requisição | `10` |
| `RATE_LIMIT_MAX_REQUESTS` | Máximo de requisições por janela | `100` |
| `DEV_TOOLS_ENABLED` | Habilita `/api/v1/dev-logs` | `false` |

## Como rodar

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Subir Redis (Docker Compose)

```bash
docker-compose up -d redis
```

Ou use o stack completo (API + Redis):

```bash
docker-compose up -d
```

### 3. Rodar em desenvolvimento

```bash
pnpm start:dev
```

A API estará disponível em `http://localhost:8000`.

- Swagger UI: `http://localhost:8000/api`
- Health check: `GET http://localhost:8000/api/v1/health`
- Consulta CEP: `GET http://localhost:8000/api/v1/cep/{cep}`

### 4. Testes

```bash
# Unitários
pnpm test

# Integração (requer Docker para Testcontainers)
pnpm test:integration

# E2E
pnpm test:e2e

# Cobertura
pnpm test:cov
```

## Endpoints principais

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/v1/cep/:cep` | Consulta endereço por CEP (com cache, fallback e circuit breaker) |
| `GET` | `/api/v1/health` | Health check com métricas de circuit breaker, cache e fallback |
| `GET` | `/api/v1/dev-logs` | Logs em tempo real (somente com `DEV_TOOLS_ENABLED=true`) |

---

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="60" alt="Nest Logo" /></a>
</p>
