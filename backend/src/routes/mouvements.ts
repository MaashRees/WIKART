import { Hono } from 'hono';
import { queriesMetierService } from '../queries-service.js';
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod';
import { validationError } from '../validation.js';

const mouvementsRoutes = new Hono();

const mouvementSchema = z.object({
	mouvement: z.string().min(1).toLowerCase(),
})

mouvementsRoutes.get('/:mouvement/artistes-centraux', zValidator(
	'param',
	mouvementSchema,
	validationError,
), zValidator(
	'query',
	z.object({
		limit: z.coerce.number().int().min(1).max(100).default(10),
	}),
	validationError,
), async (c) => {
	const mouvement = c.req.valid('param').mouvement;
	const limit = c.req.valid('query').limit;
  const artistes = await queriesMetierService.artistesCentrauxMouvement(
		mouvement,
		limit
  );
  return c.json(artistes);
});

mouvementsRoutes.get('/:mouvement/concentration-geographique', zValidator(
	'param',
	mouvementSchema,
	validationError,
), async (c) => {
	const mouvement = c.req.valid('param').mouvement;
  const repartition = await queriesMetierService.concentrationGeoMouvement(
		mouvement
  );
  return c.json(repartition);
});

mouvementsRoutes.get('/:mouvement/musees-hubs', zValidator(
  'param',
  mouvementSchema,
  validationError,
), zValidator(
  'query',
  z.object({
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
  validationError,
), async (c) => {
  const musees = await queriesMetierService.museesHubsMouvement(
    c.req.valid('param').mouvement,
    c.req.valid('query').limit,
  );
  return c.json(musees);
});

export { mouvementsRoutes };
