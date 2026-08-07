import {
  ChevronRight,
  Code2,
  GitCommit,
  HelpCircle,
  Play,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getArtistesCentraux,
  getChaineInfluence,
  getConcentrationGeo,
  getMuseesHubs,
  getRepartitionOeuvres,
} from "../api/queries";

const colors = [
  "#818cf8",
  "#c084fc",
  "#38bdf8",
  "#f472b6",
  "#34d399",
  "#fbbf24",
];

const QUESTIONS = [
  {
    id: 1,
    titre: "Artistes les plus centraux par mouvement",
    description:
      "Compte le nombre de relations d'influence de chaque artiste au sein d'un mouvement donné.",
    type: "bar",
    xKey: "artiste",
    yKey: "degre_influence",
    champs: [
      { name: "mouvement", label: "Mouvement", defaut: "impressionnisme" },
      { name: "limit", label: "Limite", type: "number", defaut: 10 },
    ],
    appel: ({ mouvement, limit }) =>
      getArtistesCentraux(mouvement, Number(limit)),
    cypher: ({
      mouvement,
      limit,
    }) => `MATCH (a:Artiste)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique)
WHERE mv.nom IS NOT NULL AND toLower(mv.nom) = toLower('${mouvement}')
OPTIONAL MATCH (a)-[r:INFLUENCE_PAR]-()
RETURN coalesce(a.label_wikidata, a.nom) AS artiste, count(r) AS degre_influence
ORDER BY degre_influence DESC, artiste
LIMIT ${limit};`,
  },
  {
    id: 2,
    titre: "Chaîne d'influence entre deux artistes",
    description:
      "Extrait le plus court chemin d'influence généalogique dans Wikidata entre deux artistes.",
    type: "path",
    champs: [
      { name: "depart", label: "Artiste de départ", defaut: "Eugène Boudin" },
      {
        name: "arrivee",
        label: "Artiste d'arrivée",
        defaut: "Claude Monet",
      },
    ],
    appel: ({ depart, arrivee }) => getChaineInfluence(depart, arrivee),
    cypher: ({ depart, arrivee }) => `MATCH (a:Artiste)
WHERE (a.nom IS NOT NULL OR a.label_wikidata IS NOT NULL)
  AND (
    toLower(coalesce(a.label_wikidata, a.nom)) = toLower('${depart}')
    OR toLower(coalesce(a.label_wikidata, a.nom)) CONTAINS toLower('${depart}')
  )
WITH collect(DISTINCT a) AS departArts
MATCH (b:Artiste)
WHERE (b.nom IS NOT NULL OR b.label_wikidata IS NOT NULL)
  AND (
    toLower(coalesce(b.label_wikidata, b.nom)) = toLower('${arrivee}')
    OR toLower(coalesce(b.label_wikidata, b.nom)) CONTAINS toLower('${arrivee}')
  )
WITH head(departArts) AS a, collect(DISTINCT b) AS arriveeArts
WITH a, head(arriveeArts) AS b
WHERE a IS NOT NULL AND b IS NOT NULL AND a <> b
MATCH p = shortestPath((a)-[:INFLUENCE_PAR*1..6]-(b))
RETURN [n IN nodes(p) | coalesce(n.label_wikidata, n.nom)] AS chaine, length(p) AS nb_sauts
LIMIT 1;`,
  },
  {
    id: 3,
    titre: "Concentration géographique d'un mouvement",
    description:
      "Nombre d'œuvres conservées d'un mouvement artistique ventilées par région administrative française.",
    type: "bar",
    xKey: "region",
    yKey: "nb_oeuvres",
    champs: [
      { name: "mouvement", label: "Mouvement", defaut: "impressionnisme" },
    ],
    appel: ({ mouvement }) => getConcentrationGeo(mouvement),
    cypher: ({
      mouvement,
    }) => `MATCH (a:Artiste)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique)
WHERE mv.nom IS NOT NULL AND toLower(mv.nom) = toLower('${mouvement}')
MATCH (a)-[:A_CREE]->(o:Oeuvre)-[:EXPOSEE_A]->(:Musee)-[:SITUE_A]->(:Ville)-[:DANS]->(:Departement)-[:DANS]->(r:Region)
RETURN r.nom AS region, count(DISTINCT o) AS nb_oeuvres
ORDER BY nb_oeuvres DESC;`,
  },
  {
    id: 4,
    titre: "Musées 'hubs' d'un mouvement",
    description:
      "Établissements muséaux possédant le plus grand nombre d'œuvres rattachées à un mouvement.",
    type: "bar",
    xKey: "musee",
    yKey: "nb_oeuvres",
    champs: [
      { name: "mouvement", label: "Mouvement", defaut: "impressionnisme" },
      { name: "limit", label: "Limite", type: "number", defaut: 5 },
    ],
    appel: ({ mouvement, limit }) => getMuseesHubs(mouvement, Number(limit)),
    cypher: ({
      mouvement,
      limit,
    }) => `MATCH (a:Artiste)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique)
WHERE mv.nom IS NOT NULL AND toLower(mv.nom) = toLower('${mouvement}')
MATCH (a)-[:A_CREE]->(o:Oeuvre)-[:EXPOSEE_A]->(m:Musee)
RETURN m.nom AS musee, count(DISTINCT o) AS nb_oeuvres
ORDER BY nb_oeuvres DESC
LIMIT ${limit};`,
  },
  {
    id: 5,
    titre: "Répartition des œuvres d'un artiste par musée",
    description:
      "Pour un artiste donné, ventilation de ses œuvres dans les musées et régions.",
    type: "bar",
    xKey: "musee",
    yKey: "nb_oeuvres",
    champs: [
      { name: "artisteNom", label: "Nom de l'artiste", defaut: "Claude Monet" },
    ],
    appel: ({ artisteNom }) => getRepartitionOeuvres(artisteNom),
    cypher: ({ artisteNom }) => `MATCH (a:Artiste)
WHERE (a.nom IS NOT NULL OR a.label_wikidata IS NOT NULL)
  AND (
    toLower(coalesce(a.label_wikidata, a.nom)) = toLower('${artisteNom}')
    OR toLower(coalesce(a.label_wikidata, a.nom)) CONTAINS toLower('${artisteNom}')
  )
MATCH (a)-[:A_CREE]->(o:Oeuvre)-[:EXPOSEE_A]->(m:Musee)
OPTIONAL MATCH (m)-[:SITUE_A]->(:Ville)-[:DANS]->(:Departement)-[:DANS]->(r:Region)
RETURN m.nom AS musee, coalesce(r.nom, 'Inconnue') AS region, count(DISTINCT o) AS nb_oeuvres
ORDER BY nb_oeuvres DESC;`,
  },
];

function extractPath(data) {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (data.length > 0 && data[0]?.chaine) return data[0].chaine;
    if (data.every((d) => typeof d === "string")) return data;
  }
  if (data?.chaine) return data.chaine;
  return [];
}

export default function BusinessQuestions() {
  const [idActive, setIdActive] = useState(1);
  const [showCode, setShowCode] = useState(true);
  const question = QUESTIONS.find((q) => q.id === idActive);
  const [valeurs, setValeurs] = useState(
    Object.fromEntries(question.champs.map((c) => [c.name, c.defaut])),
  );
  const [resultat, setResultat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);

  const executer = async (v = valeurs, q = question) => {
    setLoading(true);
    setErreur(null);
    try {
      const res = await q.appel(v);
      setResultat(res);
    } catch (err) {
      setErreur(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const changerQuestion = (id) => {
    const q = QUESTIONS.find((item) => item.id === id);
    setIdActive(id);
    const newVals = Object.fromEntries(q.champs.map((c) => [c.name, c.defaut]));
    setValeurs(newVals);
    setResultat(null);
    setErreur(null);
    executer(newVals, q);
  };

  useEffect(() => {
    executer(valeurs, question);
  }, []);

  const soumettre = (e) => {
    e.preventDefault();
    executer(valeurs, question);
  };

  const xKey = question.xKey || "nom";
  const yKey = question.yKey || "nb";
  const isMuseumDistribution = question.id === 5;
  const barData = Array.isArray(resultat)
    ? [...resultat]
        .map((entry) => ({
          ...entry,
          [yKey]: Number(entry?.[yKey]) || 0,
        }))
        .filter((entry) => entry[xKey] && entry[yKey] > 0)
        .sort((left, right) => right[yKey] - left[yKey])
    : [];
  const chartData = isMuseumDistribution ? barData.slice(0, 12) : barData;
  const pathData = question.type === "path" ? extractPath(resultat) : [];

  return (
    <div className="page-container animate-fade-in flex flex-col gap-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <div className="badge badge-purple mb-2 inline-flex items-center gap-1.5 text-xs">
              <HelpCircle size={13} /> Graph Analytics & Business Intelligence —
              Cypher Live
            </div>
            <h1 className="font-display text-2xl font-bold text-white">
              5 Questions Métier{" "}
              <span className="gradient-text">& Requêtes Cypher</span>
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Démonstration des capacités de traversée de graphe et d'agrégation
              analytique Neo4j.
            </p>
          </div>
          <button
            className={`btn ${
              showCode ? "btn-primary" : "btn-secondary"
            } text-xs px-3.5 py-2 flex items-center gap-2`}
            onClick={() => setShowCode(!showCode)}
          >
            <Code2 size={15} />{" "}
            {showCode ? "Masquer le code Cypher" : "Afficher le code Cypher"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {QUESTIONS.map((q) => {
          const isSelected = q.id === idActive;
          return (
            <div
              key={q.id}
              onClick={() => changerQuestion(q.id)}
              className={`glass-card glass-card-hover p-4 cursor-pointer transition-all border ${
                isSelected
                  ? "border-indigo-500 bg-indigo-500/15 shadow-[0_0_15px_rgba(129,140,248,0.25)]"
                  : "border-white/10 bg-slate-900/50"
              }`}
            >
              <span
                className={`badge ${
                  isSelected ? "badge-purple" : "badge-cyan"
                } text-[10px] px-2 py-0.5`}
              >
                Question Q{q.id}
              </span>
              <div
                className={`text-xs font-bold mt-2 leading-snug ${
                  isSelected ? "text-white" : "text-slate-400"
                }`}
              >
                {q.titre}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Details & Execution Card */}
      <div className="glass-card p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="badge badge-purple text-xs px-2.5 py-1">
              Question {idActive} / 5
            </span>
            <h2 className="text-xl font-bold text-white">{question.titre}</h2>
          </div>
          <p className="text-slate-400 text-sm">{question.description}</p>
        </div>

        {/* Dynamic Form */}
        <form
          onSubmit={soumettre}
          className="flex items-end gap-3 flex-wrap mb-6"
        >
          {question.champs.map((champ) => (
            <label
              key={champ.name}
              className="flex flex-col gap-1.5 text-xs text-slate-400 font-medium"
            >
              {champ.label}
              <input
                className="input-field w-60 text-sm px-3.5 py-2"
                type={champ.type || "text"}
                value={valeurs[champ.name] ?? ""}
                onChange={(e) =>
                  setValeurs((v) => ({ ...v, [champ.name]: e.target.value }))
                }
              />
            </label>
          ))}
          <button
            type="submit"
            className="btn btn-primary text-xs px-4 py-2.5 flex items-center gap-2"
          >
            <Play size={14} /> Exécuter la requête Cypher
          </button>
        </form>

        {/* Cypher Code Display */}
        {showCode && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-cyan-400">
              <Code2 size={15} /> Requête Neo4j Cypher exécutée :
            </div>
            <pre className="code-inspector text-xs p-4 rounded-xl bg-slate-950/90 border border-cyan-500/20 text-cyan-300 font-mono overflow-x-auto whitespace-pre-wrap">
              {question.cypher(valeurs)}
            </pre>
          </div>
        )}

        {loading && (
          <p className="text-slate-400 text-sm">
            Exécution de la requête sur le graphe Neo4j...
          </p>
        )}
        {erreur && <p className="text-red-400 text-sm">{erreur}</p>}

        {/* Bar Chart Results */}
        {!loading &&
          resultat &&
          question.type === "bar" &&
          Array.isArray(resultat) && (
            <div>
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-indigo-400" />
                Résultat des agrégations Cypher ({resultat.length} lignes)
              </h3>
              {resultat.length === 0 ? (
                <p className="text-slate-400 text-sm">
                  Aucun résultat trouvé pour ces critères dans la base.
                </p>
              ) : (
                <div
                  className={
                    isMuseumDistribution ? "h-[28rem] w-full" : "h-72 w-full"
                  }
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      layout={isMuseumDistribution ? "vertical" : "horizontal"}
                      margin={
                        isMuseumDistribution
                          ? { top: 10, right: 24, left: 24, bottom: 10 }
                          : { top: 20, right: 20, left: 0, bottom: 25 }
                      }
                    >
                      {isMuseumDistribution ? (
                        <>
                          <XAxis
                            type="number"
                            stroke="#ffffff"
                            fontSize={11}
                            tickLine={false}
                            tick={{ fill: "#ffffff" }}
                          />
                          <YAxis
                            type="category"
                            dataKey={xKey}
                            stroke="#ffffff"
                            fontSize={10}
                            tickLine={false}
                            tick={{ fill: "#ffffff" }}
                            width={200}
                          />
                        </>
                      ) : (
                        <>
                          <XAxis
                            dataKey={xKey}
                            stroke="#ffffff"
                            fontSize={11}
                            tickLine={false}
                            tick={{ fill: "#ffffff" }}
                            interval={0}
                            angle={-15}
                            textAnchor="end"
                          />
                          <YAxis
                            stroke="#ffffff"
                            fontSize={11}
                            tickLine={false}
                            tick={{ fill: "#ffffff" }}
                          />
                        </>
                      )}
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#121522",
                          borderColor: "rgba(255,255,255,0.1)",
                          borderRadius: 8,
                          color: "#fff",
                        }}
                        labelStyle={{ color: "#ffffff" }}
                        itemStyle={{ color: "#ffffff" }}
                        formatter={(value, name) => [value, name]}
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      />
                      <Bar dataKey={yKey} radius={[6, 6, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`q-cell-${index}`}
                            fill={colors[index % colors.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

        {/* Path Results */}
        {!loading && resultat && question.type === "path" && (
          <div>
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <GitCommit size={18} className="text-cyan-400" />
              Chemin d'influence extrait (shortestPath)
            </h3>
            {pathData.length === 0 ? (
              <p className="text-slate-400 text-sm">
                Aucun chemin d'influence trouvé entre ces deux artistes.
              </p>
            ) : (
              <div className="flex items-center gap-4 p-5 rounded-xl bg-slate-950/80 border border-white/10 overflow-x-auto">
                {pathData.map((nom, i) => (
                  <div
                    key={`${nom}-${i}`}
                    className="flex items-center gap-4 shrink-0"
                  >
                    <div
                      className={`px-5 py-3 rounded-xl text-center border ${
                        i === 0
                          ? "bg-indigo-500/20 border-indigo-400"
                          : i === pathData.length - 1
                          ? "bg-pink-500/20 border-pink-400"
                          : "bg-white/5 border-white/10"
                      }`}
                    >
                      <span className="badge badge-purple text-[10px] block mb-1 mr-2">
                        {i === 0
                          ? "Source"
                          : i === pathData.length - 1
                          ? "Cible"
                          : `Étape ${i}`}
                      </span>
                      <span className="font-bold text-white text-sm">
                        {nom}
                      </span>
                    </div>
                    {i < pathData.length - 1 && (
                      <div className="flex flex-col items-center text-cyan-400">
                        <span className="text-[10px] text-slate-500 font-semibold mb-0.5">
                          [:INFLUENCE_PAR]
                        </span>
                        <ChevronRight size={24} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
