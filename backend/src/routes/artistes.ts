import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { queriesMetierService } from '../queries-service.js';
import { validationError } from '../validation.js';

const artistesRoutes = new Hono();

artistesRoutes.get('/chaine-influence', zValidator(
  'query',
  z.object({
    depart: z.string().min(1),
    arrivee: z.string().min(1),
  }),
  validationError,
), async (c) => {
  const chaine = await queriesMetierService.chaineInfluence(
    c.req.valid('query').depart,
    c.req.valid('query').arrivee,
  );
  return c.json(chaine);
});

artistesRoutes.get('/:artisteNom/repartition-oeuvres', zValidator(
  'param',
  z.object({
    artisteNom: z.string().min(1),
  }),
  validationError,
), async (c) => {
  const repartition = await queriesMetierService.repartitionOeuvresArtiste(
    c.req.valid('param').artisteNom,
  );
  return c.json(repartition);
});

export { artistesRoutes };
