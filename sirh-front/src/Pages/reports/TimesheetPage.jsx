import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTimesheet } from '../../Redux/Slices/timeTrackingSlice';

const todayStr = () => new Date().toISOString().slice(0,10);
const firstDayStr = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0,10); };

export default function TimesheetPage(){
  const dispatch = useDispatch();
  const { timesheet, loading, error } = useSelector(s=>s.timeTracking);
  const [from, setFrom] = useState(firstDayStr());
  const [to, setTo] = useState(todayStr());

  useEffect(()=>{ dispatch(fetchTimesheet({ from, to })); },[from,to,dispatch]);

  return (
    <div className="container py-3">
      <h3>Feuille de temps</h3>
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
      {timesheet && (
        <div className="row">
          <div className="col-md-6">
            <h6>Journal</h6>
            <ul className="list-group">
              {(timesheet.entries||[]).map((e)=> (
                <li className="list-group-item" key={e.id}>
                  <div className="d-flex justify-content-between">
                    <div>
                      <div className="fw-semibold">{e.task?.description || `Tâche #${e.todo_task_id}`}</div>
                      <small className="text-muted">{new Date(e.started_at).toLocaleString()} → {e.stopped_at ? new Date(e.stopped_at).toLocaleString() : 'en cours'}</small>
                    </div>
                    <div className="text-end">
                      <div>{e.duration_minutes ? (e.duration_minutes/60).toFixed(2) : '-'} h</div>
                      {e.client && <small className="text-muted">Client: {e.client.prenom || ''} {e.client.name || ''}</small>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-md-6">
            <h6>Temps par jour</h6>
            <table className="table table-sm">
              <thead><tr><th>Jour</th><th>Heures</th><th>Nb tâches</th></tr></thead>
              <tbody>
                {timesheet.daily && Object.entries(timesheet.daily).map(([day, info])=> (
                  <tr key={day}><td>{day}</td><td>{(info.minutes/60).toFixed(2)}</td><td>{info.tasks}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}