# Consultor de CEP — Frontend

Aplicação Vite 7 + React 19 com SSR via Hono. Consulta a API NestJS
(`cep-consultant-api`) por meio de um proxy same-origin — o navegador nunca fala
diretamente com a API.

---

## Stack

- **Vite 7** — build e dev server em middleware mode
- **React 19** — renderização SSR + hidratação cliente
- **Hono** — servidor HTTP/proxy (`@hono/node-server`)
- **TypeScript** — strict mode
- **Biome** — lint e formatação (espelha as convenções da API)

---

## Variáveis de ambiente

Nenhuma variável `VITE_` é definida — deliberadamente, para nada relacionado à
API vazar no bundle do cliente.

| Variável                | Default                        | Escopo          | Propósito                                                                                                                        |
| ----------------------- | ------------------------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`              | `development`                  | server          | Metade do gate de dev tools. Quando `development`, o gate está ativado (junto com `DEV_TOOLS_ENABLED`).                          |
| `PORT`                  | `3000`                         | server          | Porta do servidor SSR.                                                                                                           |
| `HOST`                  | `0.0.0.0`                      | server          | Bind do servidor (necessário em Docker).                                                                                         |
| `API_BASE_URL`          | `http://localhost:8000/api/v1` | server apenas   | URL base da API. **Nunca exposta ao browser** — usada apenas no servidor Hono para proxy.                                        |
| `API_TIMEOUT_MS`        | `5000`                         | server          | Timeout das requisições de proxy para a API (em milissegundos).                                                                  |
| `DEV_TOOLS_ENABLED`     | `false`                        | server          | Opt-in explícito para ferramentas de desenvolvimento. Para estar ligado, precisa ser `'true'` **E** `NODE_ENV !== 'production'`. |
| `DEV_LOGS_CLIENT_LIMIT` | `500`                          | server → estado | Máximo de linhas de log retidas no drawer de desenvolvimento.                                                                    |

### Gate de dev tools

O drawer de logs de desenvolvimento só aparece quando:

```
DEV_TOOLS_ENABLED === 'true' && NODE_ENV !== 'production'
```

Ausência da variável = desligado (fail-closed).

---

## Scripts

```bash
# Instalar dependências
pnpm install

# Desenvolvimento com HMR e SSR
pnpm dev

# Lint e formatação
pnpm lint
pnpm lint:fix

# Type check
pnpm typecheck

# Build para produção (client + SSR)
pnpm build

# Servir build de produção
pnpm start
```

---

## Proxy same-origin

O navegador nunca sabe o endereço da API. Todas as chamadas são relativas:

- `GET /api/cep/:cep` → proxy para `API_BASE_URL/cep/:cep`
- `GET /api/health` → proxy para `API_BASE_URL/health`
- `GET /api/dev/logs` → proxy para `API_BASE_URL/dev-logs` (somente quando o
  gate está ligado)

---

## Estrutura

```
server/
  index.ts          # Factory Hono + listener Node (branch dev/prod)
  config.ts         # Validação de env vars no boot
  api-client.ts     # fetch server-side com timeout
  routes/
    cep.ts          # GET /api/cep/:cep
    health.ts       # GET /api/health
    dev-logs.ts     # GET /api/dev/logs (condicional)
src/
  entry-client.tsx  # Hidratação
  entry-server.tsx  # Renderização SSR
  App.tsx           # Raiz da aplicação
  components/       # Componentes React
  lib/              # Utilitários (cep, api, erros, types)
  styles/global.css # Estilos globais
```

---

## Docker

O serviço `frontend` é orquestrado pelo `docker-compose.yml` localizado na root
folder (`docker-compose.yml`):

```yaml
frontend:
  build: ../cep-consultant-frontend
  depends_on:
    api:
      condition: service_healthy
  environment:
    - NODE_ENV=development
    - PORT=3000
    - HOST=0.0.0.0
    - API_BASE_URL=http://api:8000/api/v1
    - DEV_TOOLS_ENABLED=true
  ports:
    - "5173:3000"
```

---

## Sobre

Construído com NestJS + Typescript + Redis por
[Murilo Cardoso](https://www.linkedin.com/in/murilo-cardoso-dos-santos/).
