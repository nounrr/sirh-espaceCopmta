import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import axios from 'axios'; // Assuming axios instance is configured
import Swal from 'sweetalert2';

const InfoRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [clients, setClients] = useState([]); // Need to fetch clients
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    client_id: '',
    priority: 'medium',
    due_date: ''
  });

  useEffect(() => {
    fetchRequests();
    fetchClients();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await axios.get('/api/info-requests');
      setRequests(res.data.data || []);
    } catch (error) {
      console.error("Error fetching requests", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await axios.get('/api/clients');
      setClients(res.data || []);
    } catch (error) {
      console.error("Error fetching clients", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/info-requests', formData);
      setShowModal(false);
      fetchRequests();
      Swal.fire('Succès', 'Demande créée avec succès', 'success');
    } catch (error) {
      Swal.fire('Erreur', 'Impossible de créer la demande', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: 'bg-primary',
      pending_client: 'bg-warning text-dark',
      answered: 'bg-info text-dark',
      closed: 'bg-success'
    };
    const labels = {
      open: 'Ouvert',
      pending_client: 'En attente client',
      answered: 'Répondu',
      closed: 'Clôturé'
    };
    return <span className={`badge ${styles[status] || 'bg-secondary'}`}>{labels[status] || status}</span>;
  };

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold">Demandes d'information</h4>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setShowModal(true)}>
          <Icon icon="mdi:plus" /> Nouvelle Demande
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4">Sujet</th>
                  <th>Client</th>
                  <th>Priorité</th>
                  <th>Statut</th>
                  <th>Date limite</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center p-4">Chargement...</td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan="6" className="text-center p-4">Aucune demande trouvée</td></tr>
                ) : (
                  requests.map(req => (
                    <tr key={req.id}>
                      <td className="ps-4 fw-semibold">{req.title}</td>
                      <td>{req.client?.name || 'N/A'}</td>
                      <td>
                        {req.priority === 'high' && <Icon icon="mdi:alert" className="text-danger me-1" />}
                        {req.priority}
                      </td>
                      <td>{getStatusBadge(req.status)}</td>
                      <td>{req.due_date || '-'}</td>
                      <td>
                        <button className="btn btn-sm btn-light text-primary">
                          <Icon icon="mdi:eye" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Nouvelle demande d'information</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Sujet</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Client</label>
                    <select 
                      className="form-select" 
                      required
                      value={formData.client_id}
                      onChange={e => setFormData({...formData, client_id: e.target.value})}
                    >
                      <option value="">Sélectionner un client...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea 
                      className="form-control" 
                      rows="3"
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                    ></textarea>
                  </div>
                  <div className="row">
                    <div className="col-6 mb-3">
                      <label className="form-label">Priorité</label>
                      <select 
                        className="form-select"
                        value={formData.priority}
                        onChange={e => setFormData({...formData, priority: e.target.value})}
                      >
                        <option value="low">Basse</option>
                        <option value="medium">Moyenne</option>
                        <option value="high">Haute</option>
                      </select>
                    </div>
                    <div className="col-6 mb-3">
                      <label className="form-label">Date limite</label>
                      <input 
                        type="date" 
                        className="form-control"
                        value={formData.due_date}
                        onChange={e => setFormData({...formData, due_date: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                  <button type="submit" className="btn btn-primary">Créer</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoRequestsPage;
