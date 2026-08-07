import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { testRoutes } from './routes/test.js'
import { artistesRoutes } from './routes/artistes.js'
import { mouvementsRoutes } from './routes/mouvements.js'
import { oeuvresRoutes } from './routes/oeuvres.js'
import { museesRoutes } from './routes/musees.js'
import { neo4jDriver } from './neo4j.js'
import { env } from './env.js'
import { showRoutes } from 'hono/dev'
import { trimTrailingSlash } from 'hono/trailing-slash'

const app = new Hono().basePath('/api');
app.use(trimTrailingSlash({ alwaysRedirect: true }))

const allowedOrigins = ['http://localhost:5173', env.FRONTEND_URL].filter(
  (origin): origin is string => Boolean(origin),
)
app.use('*', cors({ origin: allowedOrigins }))

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
app.route('/oeuvres', oeuvresRoutes)
app.route('/musees', museesRoutes)

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
