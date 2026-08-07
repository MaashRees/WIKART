import {
  ArrowRight,
  Award,
  Building2,
  Frame,
  HelpCircle,
  MapPin,
  Palette,
  Share2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getDashboardStats } from "../api/queries";

const barColors = [
  "#818cf8",
  "#c084fc",
  "#f472b6",
  "#38bdf8",
  "#34d399",
  "#fbbf24",
  "#a7f3d0",
  "#fde047",
  "#f43f5e",
  "#38bdf8",
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((err) => setErreur(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="page-container text-slate-400">
        Chargement des métriques GDS Neo4j...
      </div>
    );
  if (erreur)
    return (
      <div className="page-container text-red-400">
        Erreur de connexion à l'API Neo4j : {erreur}
      </div>
    );

  const {
    nbOeuvres = 0,
    nbArtistes = 0,
    nbMusees = 0,
    nbMouvements = 0,
    parMouvement = [],
    parArtiste = [],
    parMusee = [],
    parDecennie = [],
    parRegion = [],
    topArtistesParMouvement = [],
  } = stats || {};

  const mouvements = parMouvement
    .filter((item) => item?.mouvement && String(item.mouvement).trim())
    .map((item) => ({
      ...item,
      mouvement: String(item.mouvement).trim(),
      nb: Number(item.nb) || 0,
    }));
  const artistes = parArtiste
    .filter((item) => item?.artiste && String(item.artiste).trim())
    .map((item) => ({
      ...item,
      artiste: String(item.artiste).trim(),
      nb: Number(item.nb) || 0,
    }))
    .sort((left, right) => right.nb - left.nb)
    .slice(0, 10);
  const musees = parMusee
    .filter((item) => item?.musee && String(item.musee).trim())
    .map((item) => ({
      ...item,
      musee: String(item.musee).trim(),
      nb: Number(item.nb) || 0,
    }))
    .sort((left, right) => right.nb - left.nb)
    .slice(0, 10);
  const decennies = parDecennie
    .filter((item) => item?.decennie !== null && item?.decennie !== undefined)
    .map((item) => ({
      ...item,
      decennie: `${item.decennie}s`,
      nb: Number(item.nb) || 0,
    }))
    .sort((left, right) => Number(left.decennie) - Number(right.decennie));
  const regions = parRegion
    .filter((item) => item?.region && String(item.region).trim())
    .map((item) => ({
      ...item,
      region: String(item.region).trim(),
      nb: Number(item.nb) || 0,
    }))
    .sort((left, right) => right.nb - left.nb)
    .slice(0, 10);
  const artistesParMouvement = topArtistesParMouvement
    .filter((item) => item?.artiste && String(item.artiste).trim())
    .map((item) => ({
      ...item,
      artiste: String(item.artiste).trim(),
      mouvement: String(item.mouvement || "Non renseigné").trim(),
      nb: Number(item.nb) || 0,
    }))
    .sort((left, right) => right.nb - left.nb)
    .slice(0, 10);

  return (
    <div className="page-container animate-fade-in flex flex-col gap-6">
      {/* Hero Banner */}
      <div className="glass-card p-7 border border-indigo-500/20 bg-gradient-to-r from-indigo-900/20 via-purple-900/10 to-slate-900/40 rounded-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="max-w-2xl">
            <div className="badge badge-purple inline-flex items-center gap-2 mb-3 px-3 py-1 text-xs">
              <Sparkles size={13} /> Base Joconde & Wikidata Neo4j AuraDB
            </div>
            <h1 className="font-display text-3xl font-extrabold text-white tracking-tight mb-2">
              Réseaux d'Influence &{" "}
              <span className="gradient-text">Diffusion Territoriale</span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Exploration graphe NoSQL des 137,000+ œuvres des musées de France
              et des généalogies artistiques. Analysez les centralités
              d'influence, le maillage des musées hubs et les chaînes de
              transmission.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/explorateur"
              className="btn btn-primary px-4 py-2.5 text-sm inline-flex items-center gap-2"
            >
              <Share2 size={16} /> Explorer le graphe
            </Link>
            <Link
              to="/questions"
              className="btn btn-secondary px-4 py-2.5 text-sm inline-flex items-center gap-2"
            >
              <HelpCircle size={16} /> Analyses Cypher
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Frame size={22} />}
          color="#818cf8"
          bg="rgba(129, 140, 248, 0.15)"
          label="Œuvres référencées"
          value={nbOeuvres}
        />
        <StatCard
          icon={<Palette size={22} />}
          color="#c084fc"
          bg="rgba(192, 132, 252, 0.15)"
          label="Artistes répertoriés"
          value={nbArtistes}
        />
        <StatCard
          icon={<Building2 size={22} />}
          color="#38bdf8"
          bg="rgba(56, 189, 248, 0.15)"
          label="Musées de France"
          value={nbMusees}
        />
        <StatCard
          icon={<Award size={22} />}
          color="#fbbf24"
          bg="rgba(251, 191, 36, 0.15)"
          label="Mouvements & Écoles"
          value={nbMouvements}
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <TrendingUp size={18} className="text-indigo-400" />
                Volume d'œuvres par mouvement
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Top mouvements artistiques les plus représentés
              </p>
            </div>
            <span className="badge badge-purple text-xs">TOP MOUVEMENTS</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={mouvements}
                margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
              >
                <XAxis
                  dataKey="mouvement"
                  stroke="#fff"
                  tick={{ fill: "#ffffff" }}
                  fontSize={11}
                  tickLine={false}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis
                  stroke="#fff"
                  fontSize={11}
                  tickLine={false}
                  tick={{ fill: "#ffffff" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#121522",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: 8,
                    color: "#fff",
                  }}
                  labelStyle={{ color: "#ffffff" }}
                  itemStyle={{ color: "#ffffff" }}
                  formatter={(value, name) => [value, name]}
                  cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
                />
                <Bar dataKey="nb" radius={[6, 6, 0, 0]}>
                  {mouvements.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={barColors[index % barColors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Artistes Chart */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <Sparkles size={18} className="text-purple-400" />
                Volume d'œuvres par artiste
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Top 10 des artistes les plus représentés
              </p>
            </div>
            <span className="badge badge-cyan text-xs">Top artistes</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={artistes}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
              >
                <XAxis
                  type="number"
                  stroke="#ffffff"
                  tick={{ fill: "#ffffff" }}
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="artiste"
                  stroke="#ffffff"
                  tick={{ fill: "#ffffff" }}
                  fontSize={10}
                  tickLine={false}
                  width={190}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#121522",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: 8,
                    color: "#fff",
                  }}
                  labelStyle={{ color: "#fff" }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(value, name) => [value, name]}
                  cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
                />
                <Bar dataKey="nb" radius={[0, 6, 6, 0]}>
                  {artistes.map((entry, index) => (
                    <Cell
                      key={`artist-bar-${index}`}
                      fill={barColors[index % barColors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Musées Chart */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <Building2 size={18} className="text-cyan-400" />
                Volume d'œuvres par musée
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Top 10 des musées les plus fournis en œuvres
              </p>
            </div>
            <span className="badge badge-purple text-xs">Top musées</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={musees}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
              >
                <XAxis
                  type="number"
                  stroke="#ffffff"
                  tick={{ fill: "#ffffff" }}
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="musee"
                  stroke="#ffffff"
                  tick={{ fill: "#ffffff" }}
                  fontSize={10}
                  tickLine={false}
                  width={190}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#121522",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: 8,
                    color: "#fff",
                  }}
                  labelStyle={{ color: "#fff" }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(value, name) => [value, name]}
                  cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
                />
                <Bar dataKey="nb" radius={[0, 6, 6, 0]}>
                  {musees.map((entry, index) => (
                    <Cell
                      key={`museum-bar-${index}`}
                      fill={barColors[index % barColors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <Frame size={18} className="text-indigo-400" />
                Œuvres par décennie
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Répartition temporelle des œuvres enregistrées
              </p>
            </div>
            <span className="badge badge-purple text-xs">TOP DÉCENNIES</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={decennies}
                margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
              >
                <XAxis
                  dataKey="decennie"
                  stroke="#ffffff"
                  tick={{ fill: "#ffffff" }}
                  fontSize={10}
                  tickLine={false}
                  interval={3}
                  angle={-25}
                />
                <YAxis
                  stroke="#ffffff"
                  tick={{ fill: "#ffffff" }}
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#121522",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    color: "#fff",
                  }}
                  labelStyle={{ color: "#fff" }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(value, name) => [value, name]}
                  cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
                />
                <Bar dataKey="nb" radius={[6, 6, 0, 0]}>
                  {decennies.map((entry, index) => (
                    <Cell
                      key={`decade-bar-${index}`}
                      fill={barColors[index % barColors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <MapPin size={18} className="text-cyan-400" />
                Répartition par région
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Régions qui concentrent le plus d'œuvres
              </p>
            </div>
            <span className="badge badge-cyan text-xs">TOP RÉGIONS</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={regions}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
              >
                <XAxis
                  type="number"
                  stroke="#ffffff"
                  tick={{ fill: "#ffffff" }}
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="region"
                  stroke="#ffffff"
                  tick={{ fill: "#ffffff" }}
                  fontSize={10}
                  tickLine={false}
                  width={140}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#121522",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    color: "#fff",
                  }}
                  labelStyle={{ color: "#fff" }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(value, name) => [value, name]}
                  cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
                />
                <Bar dataKey="nb" radius={[0, 6, 6, 0]}>
                  {regions.map((entry, index) => (
                    <Cell
                      key={`region-bar-${index}`}
                      fill={barColors[index % barColors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <Palette size={18} className="text-purple-400" />
                Top artistes par mouvement
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Artistes les plus représentés avec leur mouvement principal
              </p>
            </div>
            <span className="badge badge-purple text-xs">TOP ARTISTES</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={artistesParMouvement}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
              >
                <XAxis
                  type="number"
                  stroke="#ffffff"
                  tick={{ fill: "#ffffff" }}
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="artiste"
                  stroke="#ffffff"
                  tick={{ fill: "#ffffff" }}
                  fontSize={10}
                  tickLine={false}
                  width={140}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#121522",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    color: "#fff",
                  }}
                  labelStyle={{ color: "#fff" }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(value, name, props) => [
                    value,
                    `${name} • ${props?.payload?.mouvement || "Non renseigné"}`,
                  ]}
                  cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
                />
                <Bar dataKey="nb" radius={[0, 6, 6, 0]}>
                  {artistesParMouvement.map((entry, index) => (
                    <Cell
                      key={`artist-movement-bar-${index}`}
                      fill={barColors[index % barColors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Feature Exploration Modules */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">
          Modules d'Exploration
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <ModuleCard
            to="/explorateur"
            icon={<Share2 size={20} />}
            color="#c084fc"
            bg="rgba(168, 85, 247, 0.15)"
            titre="Réseau d'Influence des Artistes"
            desc="Visualisez les chaînes d'influence et la répartition des œuvres par musée."
          />
          <ModuleCard
            to="/carte"
            icon={<MapPin size={20} />}
            color="#38bdf8"
            bg="rgba(56, 189, 248, 0.15)"
            titre="Carte Géographique des Musées"
            desc="Cartographiez les musées détenteurs avec leurs coordonnées GPS réelles et filtres par mouvement."
          />
          <ModuleCard
            to="/questions"
            icon={<HelpCircle size={20} />}
            color="#34d399"
            bg="rgba(52, 211, 153, 0.15)"
            titre="5 Questions Métier & Cypher"
            desc="Centralité, musées hubs et requêtes Neo4j Cypher prêtes à être exécutées."
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, color, bg, label, value }) {
  return (
    <div className="glass-card glass-card-hover p-5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-white/10"
          style={{ background: bg, color }}
        >
          {icon}
        </div>
        <div>
          <div className="text-2xl font-extrabold text-white tracking-tight">
            {value.toLocaleString("fr-FR")}
          </div>
          <div className="text-xs text-slate-400 font-medium mt-0.5">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}

function ModuleCard({ to, icon, color, bg, titre, desc }) {
  return (
    <Link to={to} className="no-underline">
      <div className="glass-card glass-card-hover p-6 h-full flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center border border-white/10"
              style={{ background: bg, color }}
            >
              {icon}
            </div>
            <ArrowRight size={18} className="text-slate-500" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">{titre}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
        </div>
      </div>
    </Link>
  );
}
