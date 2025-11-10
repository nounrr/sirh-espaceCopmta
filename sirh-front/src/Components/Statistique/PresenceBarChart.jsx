import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PresenceBarChart = ({ data }) => {
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
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" name="Nombre d'employés" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PresenceBarChart; 