import { Hono } from "hono";
import { neo4jDriver } from "../neo4j.js";

const testRoutes = new Hono()

testRoutes.get("/", (c) => {
  return c.text("Hello Hono!");
});

testRoutes.get('/info', async (c) => {
	const info = await neo4jDriver.getServerInfo()
  return c.json(info)
})

export { testRoutes }
