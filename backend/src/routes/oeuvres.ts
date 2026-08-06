import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { queriesMetierService } from '../queries-service.js';
import { validationError } from '../validation.js';

const oeuvresRoutes = new Hono();

const titreSchema = z.object({
  titre: z.string().trim().min(1),
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

oeuvresRoutes.get('/', async (c) => {
  const oeuvres = await queriesMetierService.listerOeuvres();
  return c.json(oeuvres);
});

oeuvresRoutes.get('/:titre', zValidator('param', titreSchema, validationError), async (c) => {
  const oeuvre = await queriesMetierService.trouverOeuvre(c.req.valid('param').titre);
  if (!oeuvre) {
    return c.json({ error: 'Œuvre introuvable.' }, 404);
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

oeuvresRoutes.patch(
  '/:titre',
  zValidator('param', titreSchema, validationError),
  zValidator('json', oeuvreModificationSchema, validationError),
  async (c) => {
    const titre = c.req.valid('param').titre;
    const oeuvre = c.req.valid('json');
    const existe = await queriesMetierService.trouverOeuvre(titre);
    if (!existe) {
      return c.json({ error: 'Œuvre introuvable.' }, 404);
    }

    const relationsValides = await queriesMetierService.peutRelierOeuvre(
      oeuvre.artiste,
      oeuvre.mouvement,
      oeuvre.musee,
    );
    if (!relationsValides) {
      return c.json({ error: 'Artiste, musée, mouvement ou lien artiste-mouvement introuvable.' }, 404);
    }

    const updated = await queriesMetierService.modifierOeuvre(titre, {
      ...oeuvre,
      annee: oeuvre.annee ?? null,
    });
    return c.json(updated);
  },
);

oeuvresRoutes.delete('/:titre', zValidator('param', titreSchema, validationError), async (c) => {
  const deleted = await queriesMetierService.supprimerOeuvre(c.req.valid('param').titre);
  if (!deleted) {
    return c.json({ error: 'Œuvre introuvable.' }, 404);
  }
  return c.json(deleted);
});

export { oeuvresRoutes };
