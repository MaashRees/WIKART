import { Hono } from 'hono';
import { queriesMetierService } from '../queries-service.js';

const museesRoutes = new Hono();

// Liste les musées avec leur position et les mouvements représentés par leurs œuvres.
museesRoutes.get('/', async (c) => {
  const musees = await queriesMetierService.listerMusees();
  return c.json(musees);
});

export { museesRoutes };
