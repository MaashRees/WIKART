import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { queriesMetierService } from '../queries-service.js';
import { validationError } from '../validation.js';

const oeuvresRoutes = new Hono();

const referenceSchema = z.object({
  reference: z.string().trim().min(1),
});

const oeuvreSchema = z.object({
  titre: z.string().trim().min(1),
  artiste: z.string().trim().min(1),
  mouvement: z.string().trim().min(1),
  musee: z.string().trim().min(1),
  annee: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.coerce.number().int().optional(),
  ),
});

const oeuvreModificationSchema = oeuvreSchema.omit({ titre: true });

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

oeuvresRoutes.get('/', zValidator('query', paginationSchema, validationError), async (c) => {
  const { page, limit } = c.req.valid('query');
  const [oeuvres, total] = await Promise.all([
    queriesMetierService.listerOeuvres(page, limit),
    queriesMetierService.compterOeuvres(),
  ]);

  return c.json({
    oeuvres,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

oeuvresRoutes.get('/:reference', zValidator('param', referenceSchema, validationError), async (c) => {
	const reference = c.req.valid('param').reference;
  const oeuvre = await queriesMetierService.trouverOeuvre(reference);
  if (!oeuvre) {
    return c.json({ error: `Œuvre introuvable avec la référence ${reference}.` }, 404);
  }
  return c.json(oeuvre);
});

oeuvresRoutes.post('/', zValidator('json', oeuvreSchema, validationError), async (c) => {
  const oeuvre = c.req.valid('json');
  const existe = await queriesMetierService.oeuvreExiste(oeuvre.titre);
  if (existe) {
    return c.json({ error: 'Une œuvre avec ce titre existe déjà.' }, 409);
  }

  const relationsValides = await queriesMetierService.peutRelierOeuvre(
    oeuvre.artiste,
    oeuvre.mouvement,
    oeuvre.musee,
  );
  if (!relationsValides) {
    return c.json({ error: 'Artiste, musée, mouvement ou lien artiste-mouvement introuvable.' }, 404);
  }

  const created = await queriesMetierService.creerOeuvre({
    ...oeuvre,
    annee: oeuvre.annee ?? null,
  });
  return c.json(created, 201);
});

oeuvresRoutes.post('/', zValidator('json', oeuvreSchema, validationError), async (c) => {
  const oeuvre = c.req.valid('json');

  // 1. Vérification d'existence du titre
  const existe = await queriesMetierService.oeuvreExiste(oeuvre.titre);
  if (existe) {
    return c.json({ error: 'Une œuvre avec ce titre existe déjà.' }, 409);
  }

  // 2. Tentative de création atomique (validation + insertion)
  const created = await queriesMetierService.creerOeuvre({
    ...oeuvre,
    annee: oeuvre.annee ?? null,
  });

  // Si created est null, c'est que l'artiste, le musée ou le lien artiste-mouvement n'a pas été trouvé
  if (!created) {
    return c.json({ 
      error: 'Impossible de créer l\'œuvre : artiste, musée, mouvement ou lien artiste-mouvement introuvable.' 
    }, 404);
  }

  return c.json(created, 201);
});

oeuvresRoutes.patch(
  '/:titre',
  zValidator('param', referenceSchema, validationError),
  zValidator('json', oeuvreModificationSchema, validationError),
  async (c) => {
    const reference = c.req.valid('param').reference;
    const oeuvre = c.req.valid('json');
    const existe = await queriesMetierService.trouverOeuvre(reference);
    if (!existe) {
      return c.json({ error: `Œuvre introuvable avec la référence ${reference}.` }, 404);
    }

    const relationsValides = await queriesMetierService.peutRelierOeuvre(
      oeuvre.artiste,
      oeuvre.mouvement,
      oeuvre.musee,
    );
    if (!relationsValides) {
      return c.json({ error: 'Artiste, musée, mouvement ou lien artiste-mouvement introuvable.' }, 404);
    }

    const updated = await queriesMetierService.modifierOeuvre(reference, {
      ...oeuvre,
      annee: oeuvre.annee ?? null,
    });
    return c.json(updated);
  },
);

oeuvresRoutes.delete('/:titre', zValidator('param', referenceSchema, validationError), async (c) => {
	const reference = c.req.valid('param').reference;
  const deleted = await queriesMetierService.supprimerOeuvre(reference);
  if (!deleted) {
    return c.json({ error: `Œuvre introuvable avec la référence ${reference}.` }, 404);
  }
  return c.json(deleted);
});

export { oeuvresRoutes };
