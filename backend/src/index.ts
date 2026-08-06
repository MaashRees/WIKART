import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { testRoutes } from './routes/test.js'

const app = new Hono()

app.notFound((c) => {
	return c.html(
		`<div>
		<h1>La page demandée n'existe pas</h1>
		<img src="https://media1.tenor.com/m/hxY0c0sHYx0AAAAC/monkey-thinking-monkey.gif" alt="test" width="300" height="300">
		</div>`
	)
})

app.route("/", testRoutes)

const server = serve({
	fetch: app.fetch,
	port: 3000
}, (info) => {
	console.log(`Server is running on http://localhost:${info.port}`)
})

// graceful shutdown
process.on('SIGINT', () => {
	server.close()
	process.exit(0)
})
process.on('SIGTERM', () => {
	server.close((err) => {
		if (err) {
			console.error(err)
			process.exit(1)
		}
		process.exit(0)
	})
})
