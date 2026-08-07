import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { showRoutes } from "hono/dev";
import { trimTrailingSlash } from "hono/trailing-slash";
import { neo4jDriver } from "./neo4j.js";
import { artistesRoutes } from "./routes/artistes.js";
import { mouvementsRoutes } from "./routes/mouvements.js";
import { museesRoutes } from "./routes/musees.js";
import { oeuvresRoutes } from "./routes/oeuvres.js";
import { testRoutes } from "./routes/test.js";

const app = new Hono().basePath("/api");
app.use(trimTrailingSlash({ alwaysRedirect: true }));

app.use("*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "http://localhost:5173");
  c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (c.req.method === "OPTIONS") {
    return c.body(null, 204);
  }
  return next();
});

app.notFound((c) => {
  return c.html(
    `<div>
		<h1>La page demandée n'existe pas</h1>
		<img src="https://media1.tenor.com/m/hxY0c0sHYx0AAAAC/monkey-thinking-monkey.gif" alt="test" width="300" height="300">
		</div>`,
  );
});

app.route("/", testRoutes);
app.route("/mouvements", mouvementsRoutes);
app.route("/artistes", artistesRoutes);
app.route("/oeuvres", oeuvresRoutes);
app.route("/musees", museesRoutes);

const server = serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);

// Liste des routes dispos dans la console
showRoutes(app, {
  colorize: true,
});

// graceful shutdown
process.on("SIGINT", async () => {
  server.close();
  await neo4jDriver.close();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await neo4jDriver.close();
  server.close((err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
});
