import React from 'react';
import { Icon } from '@iconify/react';

const AuditTimelineModal = ({ isOpen, onClose, loading, history = [], entityLabel }) => {
  if (!isOpen) return null;

  const formatDate = (d) => new Date(d).toLocaleString('fr-FR', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'});
  const colorByEvent = (e) => e==='created' ? '#28a745' : e==='updated' ? '#ffc107' : e==='deleted' ? '#dc3545' : '#6c757d';
  const iconByEvent = (e) => e==='created' ? 'mdi:plus-circle' : e==='updated' ? 'mdi:pencil-circle' : e==='deleted' ? 'mdi:delete-circle' : 'mdi:circle';

  return (
    <div className="modal fade show" style={{display:'block'}} tabIndex="-1">
      <div className="modal-backdrop fade show" onClick={onClose}></div>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title mb-0">Timeline des modifications {entityLabel && `- ${entityLabel}`}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {loading && (
              <div className="text-center py-4"><div className="spinner-border text-primary" /><p className="text-muted small mt-2">Chargement...</p></div>
            )}
            {!loading && history.length === 0 && (
              <div className="text-center py-4 text-muted small">Aucun historique trouvé</div>
            )}
            {!loading && history.length > 0 && (
              <div className="timeline-wrapper position-relative">
                <div className="d-flex flex-column gap-3">
                  {history.map(item => {
                    const oldVals = typeof item.old_values === 'string' ? JSON.parse(item.old_values || '{}') : (item.old_values || {});
                    const newVals = typeof item.new_values === 'string' ? JSON.parse(item.new_values || '{}') : (item.new_values || {});
                    const changed = [];
                    if (item.event === 'created') {
                      Object.keys(newVals).forEach(k=>{ if(!['id','created_at','updated_at'].includes(k)) changed.push({field:k, value:newVals[k], type:'created'});});
                    } else if (item.event === 'updated') {
                      Object.keys(newVals).forEach(k=>{ if(oldVals[k] !== newVals[k] && !['created_at','updated_at'].includes(k)) changed.push({field:k, oldValue:oldVals[k], value:newVals[k], type:'updated'});});
                    } else if (item.event === 'deleted') {
                      Object.keys(oldVals).forEach(k=>{ if(!['id','created_at','updated_at'].includes(k)) changed.push({field:k, value:oldVals[k], type:'deleted'});});
                    }
                    return (
                      <div key={item.id} className="border rounded p-3 bg-light">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <Icon icon={iconByEvent(item.event)} style={{color:colorByEvent(item.event), fontSize:'20px'}} />
                            <span className="fw-semibold" style={{color:colorByEvent(item.event)}}>{item.event}</span>
                            <small className="text-muted">{formatDate(item.created_at)}</small>
                          </div>
                          <small className="text-muted">Par {item.user ? `${item.user.prenom || ''} ${item.user.name || ''}`.trim() : 'Système'}</small>
                        </div>
                        {changed.length === 0 && <div className="text-muted small fst-italic">Aucun champ significatif modifié</div>}
                        {changed.length > 0 && (
                          <div className="d-flex flex-wrap gap-2">
                            {changed.map(c => (
                              <div key={c.field+item.id} className="small border bg-white rounded px-2 py-1" style={{minWidth:'140px'}}>
                                <div className="fw-semibold mb-1 text-primary d-flex align-items-center gap-1">
                                  <Icon icon="mdi:shape" className="text-secondary" /> {c.field}
                                </div>
                                {c.type==='updated' ? (
                                  <div className="d-flex flex-column gap-1">
                                    <span className="text-danger text-truncate" style={{maxWidth:'200px'}} title={String(c.oldValue||'')}>
                                      {String(c.oldValue||'vide').substring(0,50)}
                                    </span>
                                    <span className="text-success text-truncate" style={{maxWidth:'200px'}} title={String(c.value||'')}>
                                      {String(c.value||'vide').substring(0,50)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className={c.type==='deleted' ? 'text-danger' : 'text-success'}>
                                    {String(c.value).substring(0,70)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditTimelineModal;
