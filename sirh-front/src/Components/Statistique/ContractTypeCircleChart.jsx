import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

// Palette personnalisée (modifie ou étends selon les types)
const COLORS = ["#2563EB", "#F59E0B", "#10B981", "#6366F1", "#EF4444", "#EAB308"];

function ContractTypeCircleChart({ periode, date, dateDebut, dateFin, mois, isMobile = false }) {
  const pointages = useSelector((state) => state.pointages.items || []);
  const users = useSelector((state) => state.users.items || []);
  const departments = useSelector((state) => state.departments.items || []);
  const roles = useSelector((state) => state.auth.roles || []);
  const isRH = roles.includes('RH');
  const isCD = roles.includes('Chef_Dep');
  const [filtreDepartement, setFiltreDepartement] = useState("");

  // Filtrage de pointages par période
  let filteredPointages = [];
  if (periode === "jour") {
    filteredPointages = pointages.filter((p) => p.date === date);
  } else if (periode === "semaine") {
    filteredPointages = pointages.filter((p) => p.date >= dateDebut && p.date <= dateFin);
  } else if (periode === "mois") {
    filteredPointages = pointages.filter((p) => p.date && p.date.startsWith(mois));
  }

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
  
  // Extraire les userIds uniques des pointages traités (sans doublons par jour)
  const presentUserIds = [
    ...new Set(Object.values(userStatsByDate)
      .filter(p => p.statutJour !== 'absent') // Ne garder que présents et retards
      .map((p) => p.user_id))
  ];

  // Filtrer les utilisateurs présents dans la période et (si filtre) du département
  const filteredUsers = users.filter((u) =>
    presentUserIds.includes(u.id || u._id) &&
    (!filtreDepartement || u.departement_id === +filtreDepartement)
  );

  // Groupement par type de contrat
  const pieData = useMemo(() => {
    const map = {};
    filteredUsers.forEach((u) => {
      const type = u.typeContrat || "Non spécifié";
      map[type] = (map[type] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredUsers]);

  // Pourcentages pour affichage
  const total = pieData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="bg-white rounded shadow-sm p-3 mt-4" style={{ placeItems: 'center' }}>
      {isRH && !isMobile && (
        <div className="text-center">
          <label className="fw-semibold mb-1 text-primary">Département</label>
          <select
            className="form-select form-select-sm border-primary"
            style={{ minWidth: 140, maxWidth: 220 }}
            value={filtreDepartement}
            onChange={(e) => setFiltreDepartement(e.target.value)}
          >
            <option value="">Tous</option>
            {departments.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.nom}
              </option>
            ))}
          </select>
        </div>
      )}

      <h6 className={`fw-semibold text-center ${isMobile ? 'my-1' : 'my-2'}`}
          style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
        {isMobile ? 'Types de contrat' : 'Répartition des types de contrat'}
      </h6>
      
      <div style={{ 
        height: isMobile ? 200 : 320, 
        width: "100%", 
        position: "relative" 
      }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={isMobile ? 40 : 80}
              outerRadius={isMobile ? 65 : 120}
              dataKey="value"
              nameKey="name"
              labelLine={false}
              paddingAngle={2}
              isAnimationActive
              label={isMobile ? false : ({ name, value }) =>
                `${name} (${total ? ((value / total) * 100).toFixed(0) : 0}%)`
              }
              labelStyle={{ fontSize: isMobile ? 10 : 12 }}
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Légende mobile-friendly */}
      <div className={`d-flex justify-content-center gap-${isMobile ? '2' : '3'} mt-2 flex-wrap`}>
        {pieData.map((item, idx) => (
          <span key={idx} 
                className="fw-semibold" 
                style={{ 
                  color: COLORS[idx % COLORS.length], 
                  fontSize: isMobile ? '0.8rem' : '1rem' 
                }}>
            {isMobile ? item.name.substring(0, 4) : item.name}: {item.value} 
            {" ("}
            {total ? ((item.value / total) * 100).toFixed(0) : 0}
            {"%)"}
          </span>
        ))}
      </div>
    </div>
  );
}

export default ContractTypeCircleChart;
