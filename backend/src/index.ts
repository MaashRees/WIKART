import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { testRoutes } from './routes/test.js'
import { artistesRoutes } from './routes/artistes.js'
import { mouvementsRoutes } from './routes/mouvements.js'
import { neo4jDriver } from './neo4j.js'
import { showRoutes } from 'hono/dev'

const app = new Hono().basePath('/api');

app.notFound((c) => {
	return c.html(
		`<div>
		<h1>La page demandée n'existe pas</h1>
		<img src="https://media1.tenor.com/m/hxY0c0sHYx0AAAAC/monkey-thinking-monkey.gif" alt="test" width="300" height="300">
		</div>`
	)
})

app.route("/", testRoutes)
app.route('/mouvements', mouvementsRoutes)
app.route('/artistes', artistesRoutes)

const server = serve({
	fetch: app.fetch,
	port: 3000
}, (info) => {
	console.log(`Server is running on http://localhost:${info.port}`)
})

// Liste des routes dispos dans la console
showRoutes(app, {
	colorize: true,
})

// graceful shutdown
process.on('SIGINT', async () => {
	server.close()
	await neo4jDriver.close()
	process.exit(0)
})
process.on('SIGTERM', async () => {
	await neo4jDriver.close()
	server.close((err) => {
		if (err) {
			console.error(err)
			process.exit(1)
		}
		process.exit(0)
	})
})
