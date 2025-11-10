import React from 'react';
import { Icon } from '@iconify/react';

const AuditCard = ({ 
  entityData, 
  audits, 
  users, 
  getEventIcon, 
  getEventColor, 
  getEventLabel, 
  formatDate, 
  translateField,
  viewMode = 'timeline' 
}) => {
  
  const resolveUser = (id) => {
    if(!id) return id;
    const u = users?.find(us => us.id === id);
    return u ? `${u.prenom || ''} ${u.name || ''}`.trim() : id;
  };

  const renderAuditAction = (audit) => {
    const rawOld = typeof audit.old_values === 'string' ? JSON.parse(audit.old_values || '{}') : audit.old_values || {};
    const rawNew = typeof audit.new_values === 'string' ? JSON.parse(audit.new_values || '{}') : audit.new_values || {};
    
    const oldValues = { ...rawOld };
    const newValues = { ...rawNew };
    
    // Résoudre les noms d'utilisateurs
    ['assigned_to','user_id'].forEach(f => {
      if(oldValues[f]) oldValues[f] = resolveUser(oldValues[f]);
      if(newValues[f]) newValues[f] = resolveUser(newValues[f]);
    });

    const changed = [];
    if (audit.event === 'created') {
      Object.keys(newValues).forEach(k => { 
        if(!['id','created_at','updated_at'].includes(k)) 
          changed.push({field:k, value:newValues[k], type:'created'}); 
      });
    } else if (audit.event === 'updated') {
      Object.keys(newValues).forEach(k => { 
        if(!['created_at','updated_at'].includes(k) && oldValues[k] !== newValues[k]) 
          changed.push({field:k, old:oldValues[k], value:newValues[k], type:'updated'}); 
      });
    } else if (audit.event === 'deleted') {
      Object.keys(oldValues).forEach(k => { 
        if(!['id','created_at','updated_at'].includes(k)) 
          changed.push({field:k, value:oldValues[k], type:'deleted'}); 
      });
    }

    return (
      <div key={audit.id} className="audit-action-card">
        <div className="audit-action-header">
          <div className="d-flex align-items-center gap-3">
            <Icon icon={getEventIcon(audit.event)} style={{color:getEventColor(audit.event), fontSize:'20px'}} />
            <span className="audit-action-type" style={{color:getEventColor(audit.event)}}>{getEventLabel(audit.event)}</span>
            <span className="audit-action-date">{formatDate(audit.created_at)}</span>
          </div>
          <div className="audit-action-user">
            {audit.user ? `${audit.user.prenom || ''} ${audit.user.name || ''}`.trim() : 'Système'}
          </div>
        </div>
        
        {changed.length ? (
          <div className="audit-field-cards">
            {changed.map(ch => {
              const userLabel = audit.user ? `${audit.user.prenom || ''} ${audit.user.name || ''}`.trim() : 'Système';
              return (
                <div key={ch.field + audit.id} className={`audit-chip audit-chip--${ch.type==='updated'?'updated': ch.type==='created'?'created':'deleted'}`}> 
                  <div className="flex">
                    <div className="audit-chip-user">{userLabel || '—'}</div>
                    <div className="audit-chip-field">{translateField ? translateField(ch.field) : ch.field}</div>
                  </div>
                  
                  {ch.type === 'updated' ? (
                    <div className="audit-chip-values">
                      <span className="old" title={String(ch.old||'')}>
                        {String(ch.old||'vide').substring(0,55)}
                      </span>
                      <span className="new" title={String(ch.value||'')}>
                        {String(ch.value||'vide').substring(0,55)}
                      </span>
                    </div>
                  ) : (
                    <div className="audit-chip-values">
                      <span className={ch.type==='deleted' ? 'old' : 'new'}>
                        {String(ch.value).substring(0,80)}
                      </span>
                    </div>
                  )}
                  <div className="audit-chip-footer">
                    <span>{ch.type === 'updated' ? 'MODIF' : ch.type === 'created' ? 'CREATION' : 'SUPPR.'}</span>
                    <span>{new Date(audit.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-muted small ms-4">Aucun changement détecté</div>
        )}
      </div>
    );
  };

  const renderGroupedView = () => {
    // Historique par champ
    const fieldChanges = {};
    // tri audits par date croissante
    audits.sort((a,b)=> new Date(a.created_at) - new Date(b.created_at));
    
    audits.forEach(audit => {
      const rawOldValues = typeof audit.old_values === 'string' ? JSON.parse(audit.old_values || '{}') : audit.old_values || {};
      const rawNewValues = typeof audit.new_values === 'string' ? JSON.parse(audit.new_values || '{}') : audit.new_values || {};
      
      const oldValues = { ...rawOldValues };
      const newValues = { ...rawNewValues };
      ['assigned_to','user_id'].forEach(f=>{
        if(oldValues[f]) oldValues[f] = resolveUser(oldValues[f]);
        if(newValues[f]) newValues[f] = resolveUser(newValues[f]);
      });
      
      if (audit.event === 'created') {
        Object.keys(newValues).forEach(f=>{
          if(['id','created_at','updated_at'].includes(f)) return;
          const entry = {event:'created', field:f, before:null, after:newValues[f], date:audit.created_at, user:audit.user};
          (fieldChanges[f] ||= []).push(entry);
        });
      } else if (audit.event === 'updated') {
        Object.keys(newValues).forEach(f=>{
          if(['created_at','updated_at'].includes(f)) return;
          if(oldValues[f] !== newValues[f]){
            const entry = {event:'updated', field:f, before:oldValues[f], after:newValues[f], date:audit.created_at, user:audit.user};
            (fieldChanges[f] ||= []).push(entry);
          }
        });
      } else if (audit.event === 'deleted') {
        Object.keys(oldValues).forEach(f=>{
          if(['id','created_at','updated_at'].includes(f)) return;
          const entry = {event:'deleted', field:f, before:oldValues[f], after:null, date:audit.created_at, user:audit.user};
          (fieldChanges[f] ||= []).push(entry);
        });
      }
    });
    
    const fieldEntries = Object.entries(fieldChanges).sort((a,b)=> a[0].localeCompare(b[0]));
    
    return fieldEntries.length ? (
      <div className="table-responsive">
        <table className="table table-sm align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th style={{width:'160px'}}>Propriété</th>
              <th>Historique des valeurs</th>
            </tr>
          </thead>
          <tbody>
            {fieldEntries.map(([field, changes]) => (
              <tr key={field}>
                <td className="fw-semibold small text-primary">{translateField ? translateField(field) : field}</td>
                <td>
                  <div className="d-flex flex-wrap gap-2">
                    {changes.sort((a,b)=> new Date(a.date)-new Date(b.date)).map((chg, idx) => {
                      const userLabel = chg.user ? `${chg.user.prenom||''} ${chg.user.name||''}`.trim() : 'Système';
                      return (
                        <div key={idx} className={`audit-chip audit-chip--${chg.event==='updated'?'updated': chg.event==='created'?'created':'deleted'}`}>
                          <div className="audit-chip-user">{userLabel}</div>
                          <div className="audit-chip-field">{translateField ? translateField(chg.field) : chg.field}</div>
                          {chg.event === 'updated' ? (
                            <div className="audit-chip-values">
                              <span className="old" title={String(chg.before||'')}>
                                {String(chg.before||'vide').substring(0,40)}
                              </span>
                              <span className="new" title={String(chg.after||'')}>
                                {String(chg.after||'vide').substring(0,40)}
                              </span>
                            </div>
                          ) : (
                            <div className="audit-chip-values">
                              <span className={chg.event==='deleted' ? 'old' : 'new'}>
                                {String((chg.after??chg.before) || '').substring(0,60)}
                              </span>
                            </div>
                          )}
                          <div className="audit-chip-footer">
                            <span>{new Date(chg.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}</span>
                            <span>{new Date(chg.date).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="text-muted small fst-italic">Aucun changement pertinent</div>
    );
  };

  if (!entityData || !audits?.length) {
    return (
      <div className="audit-main-card">
        <div className="audit-card-header">
          <div className="text-muted">Aucune donnée d'audit disponible</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 audit-main-card">
      <div className="audit-card-header">
        <div>
          <div className="audit-card-title">{entityData.title}</div>
          <div className="audit-card-subtitle">{entityData.badge} #{entityData.id}</div>
          {entityData.path && entityData.path !== entityData.title && (
            <div className="audit-card-path">{entityData.path}</div>
          )}
        </div>
        <div className="text-muted" style={{fontSize:'0.9rem', fontWeight:'600'}}>
          {audits.length} action{audits.length > 1 ? 's' : ''}
        </div>
      </div>
      
      <div className="audit-card-body">
        {viewMode === 'groupe' ? renderGroupedView() : audits.map(renderAuditAction)}
      </div>
    </div>
  );
};

export default AuditCard;
