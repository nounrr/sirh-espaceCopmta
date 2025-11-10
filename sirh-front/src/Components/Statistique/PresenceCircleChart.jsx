import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

// Dégradé pour "Présents"
const COLORS = [
  "url(#presentGradient)", // Présent + En retard
  "#FF7700"                // Absent
];

function PresenceCircleChart({ periode, date, dateDebut, dateFin, mois, isMobile = false }) {
  const pointages = useSelector((state) => state.pointages.items || []);
  const users = useSelector((state) => state.users.items || []);
  const departments = useSelector((state) => state.departments.items || []);
  const roles = useSelector((state) => state.auth.roles || []);
  const isRH = roles.includes('RH');
  const isEMP = roles.includes('Employe');
  // Filtres
  const [filtreDepartement, setFiltreDepartement] = useState("");
  const [filtreContrat, setFiltreContrat] = useState("");

  const getUser = (userId) =>
    users.find((u) => u.id === userId || u._id === userId);

  // Filtrage période
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

  // Filtres supplémentaires
  filteredPointages = filteredPointages.filter((p) => {
    const user = getUser(p.user_id);
    if (!user) return false;
    if (filtreDepartement && user.departement_id !== +filtreDepartement)
      return false;
    if (filtreContrat && user.typeContrat !== filtreContrat) return false;
    return true;
  });

  // Fusion Présents + En retard, Absent seul
  const pieData = useMemo(() => {
    // Déduplication par utilisateur et par date pour éviter les doublons
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
    
    // Compter les statuts uniques
    let present = 0, absent = 0, retard = 0;
    Object.values(userStatsByDate).forEach((p) => {
      if (p.statutJour === "present") present++;
      if (p.statutJour === "retard") retard++;
    });
    // Les absents sont uniquement ceux avec statutJour === 'absent'
    absent = Object.values(userStatsByDate).filter(p => p.statutJour === "absent").length;
    
    return [
      { name: "Présents", value: present + retard },
      { name: "Absents", value: absent }
    ];
  }, [filteredPointages]);

  const total = pieData.reduce((sum, d) => sum + d.value, 0);
  const getPercent = v => total ? ((v / total) * 100).toFixed(1) : "0.0";

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

  // Légende personnalisée avec adaptation mobile
  const renderCustomLegend = () => (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      gap: isMobile ? 15 : 30, 
      marginTop: isMobile ? 8 : 12,
      flexDirection: isMobile ? "column" : "row",
      alignItems: "center"
    }}>
      {pieData.map((entry, idx) => (
        <div key={entry.name} style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: isMobile ? 6 : 8, 
          minWidth: isMobile ? "auto" : 110,
          justifyContent: isMobile ? "center" : "flex-start"
        }}>
          <div
            style={{
              width: isMobile ? 12 : 16,
              height: isMobile ? 12 : 16,
              background: COLORS[idx],
              borderRadius: 4,
              display: "inline-block",
              marginRight: isMobile ? 3 : 5,
            }}
          />
          <span style={{ 
            fontWeight: 600, 
            fontSize: isMobile ? 12 : 15 
          }}>
            {entry.name}
          </span>
          <span style={{ 
            color: "#888", 
            fontWeight: 500, 
            marginLeft: isMobile ? 4 : 6,
            fontSize: isMobile ? 11 : 14
          }}>
            {entry.value}
          </span>
          <span style={{ 
            color: idx === 0 ? "#10B981" : "#FF7700", 
            fontWeight: 700, 
            marginLeft: isMobile ? 4 : 6,
            fontSize: isMobile ? 11 : 14
          }}>
            {getPercent(entry.value)}%
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-white rounded shadow-sm p-3 mt-4">
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
          {!isEMP && (
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
          )}
        </div>
      )}
      
      <h6 className={`fw-semibold text-center ${isMobile ? 'mb-1' : 'mb-2'}`} 
          style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
        Présence globale
      </h6>
      
      <div style={{ 
        height: isMobile ? 200 : 320, 
        width: "100%", 
        position: "relative" 
      }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <linearGradient id="presentGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="5%" stopColor="#10B981" />
                <stop offset="90%" stopColor="#2563EB" />
              </linearGradient>
            </defs>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={isMobile ? 40 : 80}
              outerRadius={isMobile ? 65 : 120}
              dataKey="value"
              nameKey="name"
              paddingAngle={3}
              labelLine={false}
              isAnimationActive
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={COLORS[i]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Légende custom avec adaptation mobile */}
      {renderCustomLegend()}
    </div>
  );
}

export default PresenceCircleChart;
