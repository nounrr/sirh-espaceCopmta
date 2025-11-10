import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Icon } from '@iconify/react/dist/iconify.js';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

const COLORS = ['#00C49F', '#FF8042', '#0088FE', '#FFBB28'];

const PresenceStatsChart = () => {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [periode, setPeriode] = useState('jour');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchStats = () => {
    axios.get(`/api/statistiques/presence?periode=${periode}&date=${date}`)
      .then(response => {
        const stats = response.data;
        setStats(stats);

        const chartData = [
          { name: 'Présents', value: stats.present || 0 },
          { name: 'Absents', value: stats.absent || 0 },
          { name: 'Congé', value: stats.conge || 0 },
          { name: 'Malade', value: stats.malade || 0 },
        ];
        setData(chartData);
      })
      .catch(error => {
        console.error('Erreur lors du chargement des statistiques :', error);
        setData([]);
      })
  };

  useEffect(() => {
    fetchStats();
  }, [periode, date]);

  const isDataEmpty = data.every(item => !item.value);

  return (
    <div className="card h-100 p-0 radius-12">
      <div className="card-header border-bottom bg-base py-16 px-24">
        <h6 className="text-lg fw-semibold mb-0">Taux de présence</h6>
      </div>
      <div className="card-body p-24">
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center mb-6">
          <select
            className="border p-2 rounded"
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
          >
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
        <div className="row row-cols-xxxl-5 row-cols-lg-3 row-cols-sm-2 row-cols-1 gy-4">
          {stats && (
            <>
              {/* Total Présent */}
              <div className="col">
                <div className="card shadow-none border bg-gradient-start-1">
                  <div className="card-body p-20">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                      <div>
                        <p className="fw-medium text-primary-light mb-1">Total Présent</p>
                        <h6 className="mb-0">{stats.present}</h6>
                      </div>
                      <div className="w-50-px h-50-px bg-cyan rounded-circle d-flex justify-content-center align-items-center">
                        <Icon icon="mdi:account-check" className="text-base text-2xl mb-0" color="#10B981" />
                      </div>
                    </div>
                    <p className="fw-medium text-sm text-primary-light mt-12 mb-0">
                      <span className="text-success-main">+{stats.pourcentage_present}%</span>
                      Dernière période
                    </p>
                  </div>
                </div>
              </div>
              {/* Total Absent */}
              <div className="col">
                <div className="card shadow-none border bg-gradient-start-2">
                  <div className="card-body p-20">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                      <div>
                        <p className="fw-medium text-primary-light mb-1">Total Absent</p>
                        <h6 className="mb-0">{stats.absent}</h6>
                      </div>
                      <div className="w-50-px h-50-px bg-purple rounded-circle d-flex justify-content-center align-items-center">
                        <Icon icon="mdi:account-off" className="text-base text-2xl mb-0" color="#FF0000" />
                      </div>
                    </div>
                    <p className="fw-medium text-sm text-primary-light mt-12 mb-0">
                      <span className="text-danger-main">+{stats.pourcentage_absent}%</span>
                      Dernière période
                    </p>
                  </div>
                </div>
              </div>
              {/* Congé */}
              <div className="col">
                <div className="card shadow-none border bg-gradient-start-3">
                  <div className="card-body p-20">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                      <div>
                        <p className="fw-medium text-primary-light mb-1">Total Congé</p>
                        <h6 className="mb-0">{stats.conge}</h6>
                      </div>
                      <div className="w-50-px h-50-px bg-info rounded-circle d-flex justify-content-center align-items-center">
                        <Icon icon="mdi:briefcase" className="text-base text-2xl mb-0" color="#FFA500" />
                      </div>
                    </div>
                    <p className="fw-medium text-sm text-primary-light mt-12 mb-0">
                      <span className="text-success-main">+{stats.pourcentage_conge}%</span>
                      Dernière période
                    </p>
                  </div>
                </div>
              </div>
              {/* Maladie */}
              <div className="col">
                <div className="card shadow-none border bg-gradient-start-4">
                  <div className="card-body p-20">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                      <div>
                        <p className="fw-medium text-primary-light mb-1">Total Maladie</p>
                        <h6 className="mb-0">{stats.malade}</h6>
                      </div>
                      <div className="w-50-px h-50-px bg-success-main rounded-circle d-flex justify-content-center align-items-center">
                        <Icon icon="mdi:stethoscope" className="text-base text-2xl mb-0" color="#00FF00" />
                      </div>
                    </div>
                    <p className="fw-medium text-sm text-primary-light mt-12 mb-0">
                      <span className="text-success-main">+{stats.pourcentage_malade}%</span>
                      Dernière période
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        <div style={{ width: '100%', height: 400 }}>
          {isDataEmpty ? (
            <div className="flex flex-col items-center justify-center bg-gray-100 rounded-xl p-6 shadow mt-6" style={{ width: '50%', margin: 'auto' }}>
              <InformationCircleIcon className="w-6 h-6 text-blue-400 mb-1" style={{ height: '60px' }} />
              <p className="text-gray-600 text-center text-lg font-medium">
                Aucune statistique disponible pour cette date.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={120}
                  fill="#8884d8"
                  label
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default PresenceStatsChart;
