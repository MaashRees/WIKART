export const mockArtiste = {
  artiste: { nom: "Claude Monet" },
  oeuvres: [
    {
      titre: "Impression, soleil levant",
      annee: 1872,
      musee: "Musée Marmottan",
    },
    { titre: "Nymphéas", annee: 1916, musee: "Musée de l'Orangerie" },
  ],
  influences: [{ nom: "Eugène Boudin" }, { nom: "Johan Barthold Jongkind" }],
};

export const mockMusees = [
  {
    nom: "Musée Marmottan",
    lat: 48.8583,
    lon: 2.2803,
    mouvements: ["Impressionnisme"],
  },
  {
    nom: "Musée de l'Orangerie",
    lat: 48.8638,
    lon: 2.3226,
    mouvements: ["Impressionnisme"],
  },
];

export const mockDashboard = {
  nbOeuvres: 12480,
  nbArtistes: 940,
  nbMusees: 62,
  parMouvement: [
    { mouvement: "Impressionnisme", nb: 3200 },
    { mouvement: "Renaissance", nb: 1800 },
    { mouvement: "Art nouveau", nb: 950 },
    { mouvement: "Cubisme", nb: 620 },
  ],
};

export const mockQuestions = {
  1: {
    titre: "Artistes les plus centraux par mouvement",
    description:
      "Score de centralité (PageRank) au sein de leur mouvement artistique.",
    type: "bar",
    xKey: "nom",
    yKey: "score",
    data: [
      { nom: "Monet", score: 0.82 },
      { nom: "Renoir", score: 0.75 },
      { nom: "Degas", score: 0.61 },
    ],
  },
  2: {
    titre: "Chaîne d'influence entre deux artistes",
    description: "Plus court chemin d'influence entre deux artistes donnés.",
    type: "path",
    data: ["Eugène Boudin", "Claude Monet", "Camille Pissarro"],
  },
  3: {
    titre: "Concentration géographique d'un mouvement",
    description: "Nombre d'œuvres d'un mouvement par région.",
    type: "bar",
    xKey: "region",
    yKey: "nb",
    data: [
      { region: "Île-de-France", nb: 1500 },
      { region: "Normandie", nb: 420 },
      { region: "PACA", nb: 380 },
    ],
  },
  4: {
    titre: "Musées 'hubs' d'un mouvement",
    description:
      "Musées avec le plus d'œuvres rattachées à un mouvement donné.",
    type: "bar",
    xKey: "musee",
    yKey: "nb",
    data: [
      { musee: "Musée de l'Orangerie", nb: 210 },
      { musee: "Musée Marmottan", nb: 180 },
    ],
  },
  5: {
    titre: "Répartition des œuvres d'un artiste par musée",
    description:
      "Pour un artiste donné, répartition de ses œuvres entre musées.",
    type: "bar",
    xKey: "musee",
    yKey: "nb",
    data: [
      { musee: "Musée de l'Orangerie", nb: 8 },
      { musee: "Musée Marmottan", nb: 5 },
      { musee: "Musée d'Orsay", nb: 3 },
    ],
  },
};
