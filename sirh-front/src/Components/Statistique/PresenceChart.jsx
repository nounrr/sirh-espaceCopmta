// src/components/statistics/PresenceChart.jsx
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#00C49F', '#FF8042', '#FFBB28'];

const PresenceChart = ({ data }) => {
  const isEmpty = data.every(item => !item.value);

  if (isEmpty) {
    return (
      <div className="text-center mt-6 bg-gray-100 p-4 rounded-xl shadow">
        <p className="text-gray-600 text-lg font-medium">Aucune statistique disponible pour cette date.</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 400 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={120} label>
            {data.map((entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend layout="vertical" verticalAlign="middle" align="right" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PresenceChart;