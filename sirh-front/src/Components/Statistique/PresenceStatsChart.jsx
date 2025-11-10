import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPresenceStats } from '../../Redux/Slices/presenceStatsSlice';
import PresenceChart from './PresenceChart';

const PresenceStatsChart = () => {
  const [periode, setPeriode] = useState('jour');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const dispatch = useDispatch();
  const { data: stats, loading } = useSelector((state) => state.presence);

  useEffect(() => {
    dispatch(fetchPresenceStats({ periode, date }));
  }, [periode, date, dispatch]);

  const chartData = stats ? [
    { name: 'Présents', value: stats.present || 0 },
    { name: 'Absents', value: stats.absent || 0 },
    { name: 'Congé', value: stats.conge || 0 },
    { name: 'Malade', value: stats.malade || 0 },
  ] : [];

  return (
    <div className="card p-4 rounded-lg shadow">
      <div className="flex gap-4 mb-4 justify-center">
        <select className="border p-2 rounded" value={periode} onChange={(e) => setPeriode(e.target.value)}>
          <option value="jour">Par Jour</option>
          <option value="semaine">Par Semaine</option>
          <option value="mois">Par Mois</option>
        </select>
        <input
          type="date"
          className="border p-2 rounded"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Chargement...</p>
      ) : (
        <>
          {/* Mini cards à afficher ici si nécessaire */}
          <PresenceChart data={chartData} />
        </>
      )}
    </div>
  );
};

export default PresenceStatsChart;