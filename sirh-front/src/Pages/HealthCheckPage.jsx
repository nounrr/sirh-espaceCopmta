import React, { useState, useEffect } from 'react';
import axios from 'axios';

const HealthCheckPage = () => {
  const [checks, setChecks] = useState({
    frontend: { status: 'pending', message: 'Checking...' },
    backend: { status: 'pending', message: 'Checking...' },
    database: { status: 'pending', message: 'Checking...' },
  });

  useEffect(() => {
    checkSystem();
  }, []);

  const checkSystem = async () => {
    // 1. Frontend Check (Immediate)
    setChecks(prev => ({
      ...prev,
      frontend: { status: 'ok', message: 'Frontend is running and rendering.' }
    }));

    // 2. Backend & Database Check
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/health`);
      if (response.data.status === 'ok') {
        setChecks(prev => ({
          ...prev,
          backend: { status: 'ok', message: 'Backend API is reachable.' },
          database: { status: 'ok', message: 'Database is connected.' }
        }));
      } else {
        throw new Error(response.data.message || 'Unknown error');
      }
    } catch (error) {
      setChecks(prev => ({
        ...prev,
        backend: { status: 'error', message: `Backend Error: ${error.message}` },
        database: { status: 'error', message: 'Could not verify database connection.' }
      }));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ok': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ok': return '✅';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">System Health Check</h1>
      
      <div className="grid gap-4">
        {Object.entries(checks).map(([key, value]) => (
          <div key={key} className="p-4 border rounded shadow-sm bg-white">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold capitalize">{key}</h2>
              <span className={`font-bold ${getStatusColor(value.status)}`}>
                {getStatusIcon(value.status)} {value.status.toUpperCase()}
              </span>
            </div>
            <p className="mt-2 text-gray-600">{value.message}</p>
          </div>
        ))}
      </div>

      <button 
        onClick={checkSystem}
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        Re-run Checks
      </button>
    </div>
  );
};

export default HealthCheckPage;
