import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTimeAnalytics } from '../../Redux/Slices/timeTrackingSlice';

const todayStr = () => new Date().toISOString().slice(0,10);
const firstDayStr = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0,10); };

export default function TimeAnalyticsPage(){
  const dispatch = useDispatch();
  const { analytics, loading, error } = useSelector(s=>s.timeTracking);
  const authUser = useSelector(s=>s.auth.user);
  const [from, setFrom] = useState(firstDayStr());
  const [to, setTo] = useState(todayStr());

  useEffect(()=>{ dispatch(fetchTimeAnalytics({ from, to })); },[from,to,dispatch]);

  const hasAccess = ['RH','Gest_RH','Chef_Dep'].includes(authUser?.role);

  return (
    <div className="container py-3">
      <h3>Analytics temps & coût</h3>
      <div className="d-flex gap-2 align-items-end mb-3">
        <div>
          <label className="form-label mb-1">De</label>
          <input type="date" className="form-control" value={from} onChange={(e)=>setFrom(e.target.value)} />
        </div>
        <div>
          <label className="form-label mb-1">À</label>
          <input type="date" className="form-control" value={to} onChange={(e)=>setTo(e.target.value)} />
        </div>
      </div>
      {loading && <div>Chargement…</div>}
      {error && <div className="alert alert-danger">{String(error)}</div>}
      {!hasAccess && <div className="alert alert-warning">Accès limité. Contactez votre administrateur.</div>}
      {hasAccess && analytics && (
        <div className="row">
          <div className="col-md-6">
            <h6>Coût par client</h6>
            <ul className="list-group">
              {analytics.costPerClient && Object.entries(analytics.costPerClient).map(([clientId, val])=> (
                <li className="list-group-item d-flex justify-content-between" key={clientId}>
                  <div>Client #{clientId}</div>
                  <div>{Number(val.hours).toFixed(2)} h — {Number(val.cost).toFixed(2)} DH</div>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-md-6">
            <h6>Totaux</h6>
            <div className="alert alert-light">
              Heures totales: <strong>{Number(analytics.totalHours||0).toFixed(2)} h</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}