import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

function PresenceEvaluationChart({
  periode,
  date,
  dateDebut,
  dateFin,
  mois,
  isMobile = false,
}) {
  const pointages = useSelector((state) => state.pointages.items || []);
  const users = useSelector((state) => state.users.items || []);
  const departments = useSelector((state) => state.departments.items || []);
  const roles = useSelector((state) => state.auth.roles || []);
  const isRH = roles.includes('RH');
  // Filtres
  const [filtreDepartement, setFiltreDepartement] = useState("");
  const [filtreContrat, setFiltreContrat] = useState("");

  // Helpers
  const getUser = (userId) =>
    users.find((u) => u.id === userId || u._id === userId);

  // Période - sélectionne les pointages correspondants
  let filteredPointages = [];
  if (periode === "jour") {
    filteredPointages = pointages.filter((p) => p.date === date);
  } else if (periode === "semaine") {
    filteredPointages = pointages.filter(
      (p) => p.date >= dateDebut && p.date <= dateFin
    );
  } else if (periode === "mois") {
    filteredPointages = pointages.filter(
      (p) => p.date && p.date.startsWith(mois)
    );
  }

  // Filtrage selon département et contrat
  filteredPointages = filteredPointages.filter((p) => {
    const user = getUser(p.user_id);
    if (!user) return false;
    if (filtreDepartement && user.departement_id !== +filtreDepartement)
      return false;
    if (filtreContrat && user.typeContrat !== filtreContrat) return false;
    return true;
  });

  // Construction des données pour le chart : 1 barre par date avec déduplication par utilisateur
  const chartData = useMemo(() => {
    const map = {};
    
    // D'abord, dédupliquer les pointages par utilisateur et par date
    const userStatsByDate = {};
    filteredPointages.forEach((p) => {
      const userId = p.user_id;
      const date = p.date;
      const key = `${userId}_${date}`;
      
      // Si cet utilisateur n'a pas encore de statut pour cette date, ou si le nouveau statut est prioritaire
      if (!userStatsByDate[key] || 
          (userStatsByDate[key].statutJour === 'absent' && p.statutJour !== 'absent') ||
          (userStatsByDate[key].statutJour === 'present' && p.statutJour === 'retard')) {
        userStatsByDate[key] = p;
      }
    });
    
    // Ensuite, compter les statuts par date
    Object.values(userStatsByDate).forEach((p) => {
      const d = p.date;
      if (!map[d]) {
        map[d] = { date: d, presentRetard: 0, absent: 0 };
      }
      if (p.statutJour === "present" || p.statutJour === "retard")
        map[d].presentRetard++;
      if (p.statutJour === "absent") map[d].absent++;
    });
    
    return Object.values(map).sort((a, b) =>
      a.date > b.date ? 1 : a.date < b.date ? -1 : 0
    );
  }, [filteredPointages]);

  // Options dynamiques
  const contratOptions = [
    ...new Set(
      users
        .filter((u) =>
          !filtreDepartement ? true : u.departement_id === +filtreDepartement
        )
        .map((u) => u.typeContrat)
        .filter(Boolean)
    ),
  ];
  const departementOptions = departments;

  return (
    <div className="w-100">
      {isRH && !isMobile && (
        <div className="d-flex gap-3 align-items-end justify-content-center mb-3 flex-wrap">
          <div className="text-center">
            <label className="fw-semibold mb-1 text-primary">Département</label>
            <select
              className="form-select form-select-sm border-primary"
              style={{ minWidth: 140 }}
              value={filtreDepartement}
              onChange={(e) => setFiltreDepartement(e.target.value)}
            >
              <option value="">Tous</option>
              {departementOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="text-center">
            <label className="fw-semibold mb-1 text-primary">Type contrat</label>
            <select
              className="form-select form-select-sm border-primary"
              style={{ minWidth: 140 }}
              value={filtreContrat}
              onChange={(e) => setFiltreContrat(e.target.value)}
            >
              <option value="">Tous</option>
              {contratOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="bg-white rounded shadow-sm p-3">
        <h6 className={`fw-semibold ${isMobile ? 'mb-1' : 'mb-2'} text-center`}
            style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
          {isMobile ? 'Évolution' : 'Evolution: Effectif & Présence'}
        </h6>
        <ResponsiveContainer 
          width="100%" 
          height={isMobile ? 220 : 350}
        >
          <BarChart 
            data={chartData} 
            margin={{ 
              top: isMobile ? 10 : 20, 
              right: isMobile ? 8 : 24, 
              left: isMobile ? 4 : 8, 
              bottom: isMobile ? 4 : 8 
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              fontSize={isMobile ? 10 : 12} 
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? "end" : "middle"}
              height={isMobile ? 40 : 30}
            />
            <YAxis 
              allowDecimals={false} 
              fontSize={isMobile ? 10 : 12}
              width={isMobile ? 30 : 40}
            />
            <Tooltip 
              contentStyle={{ 
                fontSize: isMobile ? '0.8rem' : '0.9rem' 
              }}
            />
            <Legend />
            <Bar
              dataKey="presentRetard"
              name="Présents"
              stackId="all"
              fill="#226EDD"
              barSize={isMobile ? 16 : 24}
            />
            <Bar
              dataKey="absent"
              name="Absents"
              stackId="all"
              fill="#FF7700"
              barSize={isMobile ? 16 : 24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default PresenceEvaluationChart;
