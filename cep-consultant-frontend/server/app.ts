import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { AppState } from "../src/lib/types.js";
import { ServerConfig } from "./config.js";
import { createCepRoutes } from "./routes/cep.js";
import { createDevLogsRoutes } from "./routes/dev-logs.js";
import { createHealthRoutes } from "./routes/health.js";

export interface RenderResult {
	html: string;
	head: string;
}

export type Renderer = (
	state: AppState,
) => RenderResult | Promise<RenderResult>;

export interface AppOptions {
	loadTemplate: (url: string) => Promise<string>;
	loadRenderer: () => Promise<Renderer>;
	staticRoot?: string;
}

export function createApiApp(config: ServerConfig): Hono {
	const app = new Hono();
	app.route("/api", createCepRoutes(config));
	app.route("/api", createHealthRoutes(config));
	if (config.devToolsEnabled) {
		app.route("/api", createDevLogsRoutes(config));
	}
	return app;
}

export function createApp(config: ServerConfig, options: AppOptions): Hono {
	const app = createApiApp(config);

	if (options.staticRoot) {
		app.use("/assets/*", serveStatic({ root: options.staticRoot }));
	}

	const appState: AppState = {
		devTools: config.devToolsEnabled,
		devLogsClientLimit: config.devLogsClientLimit,
	};

	app.all("/api/*", (c) =>
		c.json({ statusCode: 404, message: "Recurso não encontrado." }, 404),
	);

	app.get("*", async (c) => {
		const template = await options.loadTemplate(new URL(c.req.url).pathname);
		const render = await options.loadRenderer();
		const { html, head } = await render(appState);
		return c.html(
			template
				.replace("<!--app-head-->", head)
				.replace("<!--app-html-->", html),
		);
	});

	return app;
}
