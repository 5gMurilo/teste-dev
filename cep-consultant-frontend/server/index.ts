import { readFile } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getRequestListener, serve } from "@hono/node-server";
import { createApp, Renderer } from "./app.js";
import { loadConfig, ServerConfig } from "./config.js";

async function startDev(config: ServerConfig): Promise<void> {
  const httpServer = createHttpServer();

  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true, hmr: { server: httpServer } },
    appType: "custom",
  });

  const app = createApp(config, {
    loadTemplate: async (url) => {
      const template = await readFile(path.resolve("index.html"), "utf-8");
      return vite.transformIndexHtml(url, template);
    },
    loadRenderer: async () => {
      const module = await vite.ssrLoadModule("/src/entry-server.tsx");
      return module.render as Renderer;
    },
  });

  const listener = getRequestListener(app.fetch);
  httpServer.on("request", (req, res) => {
    vite.middlewares(req, res, () => listener(req, res));
  });

  httpServer.listen(config.port, config.host, () => {
    console.log(`[frontend] dev em http://${config.host}:${config.port}`);
  });
}

async function startProd(config: ServerConfig): Promise<void> {
  const serverDir = import.meta.dirname;
  const clientDir = path.resolve(serverDir, "../client");
  const template = await readFile(path.join(clientDir, "index.html"), "utf-8");
  const entryUrl = pathToFileURL(path.join(serverDir, "entry-server.js")).href;
  const entry = await import(/* @vite-ignore */ entryUrl);

  const app = createApp(config, {
    loadTemplate: async () => template,
    loadRenderer: async () => entry.render as Renderer,
    staticRoot: path.relative(process.cwd(), clientDir) || ".",
  });

  serve({ fetch: app.fetch, port: config.port, hostname: config.host }, () => {
    console.log(`[frontend] prod em http://${config.host}:${config.port}`);
  });
}

async function main(): Promise<void> {
  const config = loadConfig();
  if (config.servePrebuilt) {
    await startProd(config);
  } else {
    await startDev(config);
  }
}

main().catch((error) => {
  console.error("[frontend] falha ao iniciar", error);
  process.exit(1);
});
