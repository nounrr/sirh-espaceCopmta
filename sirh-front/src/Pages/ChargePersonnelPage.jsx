import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchChargePersonnels, createChargePersonnel, updateChargePersonnel, deleteChargePersonnels } from '../Redux/Slices/chargePersonnelSlice';
import { Icon } from '@iconify/react/dist/iconify.js';
import Swal from 'sweetalert2';

const toMonthInput = (dateStr) => {
  if (!dateStr) return '';
  // expects YYYY-MM-01 -> YYYY-MM
  try {
    return dateStr.slice(0, 7);
  } catch {
    return '';
  }
};

const toMonthDisplay = (dateStr) => {
  if (!dateStr) return '';
  // expects YYYY-MM-01 -> YYYY_MM
  try {
    return dateStr.slice(0, 7).replace('-', '_');
  } catch {
    return '';
  }
};

const ChargePersonnelPage = () => {
  const dispatch = useDispatch();
  const { items, status, error } = useSelector((s) => s.chargePersonnels);
  const societeId = useSelector((s) => s.auth.user?.societe_id);
  const [year, setYear] = useState(new Date().getFullYear());
  const CHARGE_RATE = 0.27;

  const computeCharge = (val) => {
    const n = parseFloat(val);
    if (isNaN(n)) return '';
    // keep two decimals
    return Math.round(n * CHARGE_RATE * 100) / 100;
  };

  const [form, setForm] = useState({
    id: null,
    mois: new Date().toISOString().slice(0, 7),
    salaire_permanent: '',
    charge_salaire_permanent: '',
    salaire_temporaire: '',
    charge_salaire_temp: '',
    autres_charge: ''
  });

  // Auto-calc flags: while true, charges follow salaries (27%).
  // If user edits a charge manually, disable auto for that field.
  const [autoChargePerm, setAutoChargePerm] = useState(true);
  const [autoChargeTemp, setAutoChargeTemp] = useState(true);

  const sortedItems = useMemo(() => {
    return [...(items || [])].sort((a,b) => (a.mois || '').localeCompare(b.mois || ''));
  }, [items]);

  // Front validations
  const duplicateMonth = useMemo(() => {
    if (!form.mois) return false;
    const key = form.mois; // YYYY-MM
    return (items || []).some(r => toMonthInput(r.mois) === key);
  }, [items, form.mois]);

  const formYear = useMemo(() => {
    if (!form.mois) return null;
    const y = parseInt(form.mois.slice(0,4), 10);
    return isNaN(y) ? null : y;
  }, [form.mois]);

  const yearMismatch = useMemo(() => {
    // When creating a new record, enforce that selected month is within current selected year
    return !form.id && formYear !== null && formYear !== year;
  }, [form.id, formYear, year]);

  const isFutureMonth = useMemo(() => {
    if (!form.mois) return false;
    const selectedDate = new Date(form.mois + '-01');
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return selectedDate > currentMonth;
  }, [form.mois]);

  useEffect(() => {
    if (societeId) dispatch(fetchChargePersonnels({ societeId, year }));
  }, [dispatch, societeId, year]);

  const resetForm = () => {
    setForm({
      id: null,
      mois: new Date().toISOString().slice(0,7),
      salaire_permanent: '',
      charge_salaire_permanent: '',
      salaire_temporaire: '',
      charge_salaire_temp: '',
      autres_charge: ''
    });
    setAutoChargePerm(true);
    setAutoChargeTemp(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      societe_id: societeId,
      mois: form.mois, // backend normalise en YYYY-MM-01
      salaire_permanent: Number(form.salaire_permanent || 0),
      charge_salaire_permanent: Number(form.charge_salaire_permanent || 0),
      salaire_temporaire: Number(form.salaire_temporaire || 0),
      charge_salaire_temp: Number(form.charge_salaire_temp || 0),
      autres_charge: Number(form.autres_charge || 0)
    };
    try {
      if (form.id) {
        await dispatch(updateChargePersonnel({ id: form.id, ...payload })).unwrap();
        Swal.fire('Succès!', 'Charge mise à jour avec succès.', 'success');
      } else {
        await dispatch(createChargePersonnel(payload)).unwrap();
        Swal.fire('Succès!', 'Charge ajoutée avec succès.', 'success');
      }
      resetForm();
      if (societeId) dispatch(fetchChargePersonnels({ societeId, year }));
    } catch (error) {
      const msg = error?.message || error?.response?.data?.message || 'Une erreur est survenue';
      Swal.fire('Erreur!', msg, 'error');
    }
  };

  const onEdit = (rec) => {
    setForm({
      id: rec.id,
      mois: toMonthInput(rec.mois),
      salaire_permanent: rec.salaire_permanent,
      charge_salaire_permanent: rec.charge_salaire_permanent,
      salaire_temporaire: rec.salaire_temporaire,
      charge_salaire_temp: rec.charge_salaire_temp,
      autres_charge: rec.autres_charge
    });
    // Don't auto-overwrite existing values when editing
    setAutoChargePerm(false);
    setAutoChargeTemp(false);
  };

  if (status === 'loading') {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="basic-data-table">
        {/* Header */}
        <div className="card-header d-flex flex-column flex-md-row gap-2 justify-content-between align-items-start align-items-md-center">
          <h5 className="card-title mb-0">Charge Personnel</h5>
          
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <span className="text-muted small">Année:</span>
            <input 
              type="number" 
              min="2000" 
              max="3000" 
              className="form-control form-control-sm shadow-sm border-0 bg-light" 
              style={{width: 100, borderRadius: '8px'}} 
              value={year} 
              onChange={e=>setYear(Number(e.target.value||new Date().getFullYear()))} 
            />
          </div>
        </div>

        <div className="card-body">
          {/* Form Section */}
          <div className="mb-4 p-3 rounded" style={{backgroundColor: '#F8FAFC'}}>
            <form className="row g-3" onSubmit={onSubmit}>
            <div className="col-md-2">
              <label className="form-label small fw-semibold text-secondary">Mois</label>
              <input 
                type="month" 
                className="form-control shadow-sm border-0" 
                style={{borderRadius: '8px', backgroundColor: '#fff'}}
                value={form.mois} 
                onChange={e=>setForm(f=>({...f, mois: e.target.value}))} 
                required 
              />
              {duplicateMonth && !form.id && (
                <div className="form-text text-danger small"><Icon icon="mdi:alert-circle" className="me-1" />Mois déjà existant</div>
              )}
              {yearMismatch && (
                <div className="form-text text-warning small"><Icon icon="mdi:alert" className="me-1" />Année {year} requise</div>
              )}
              {isFutureMonth && (
                <div className="form-text text-danger small"><Icon icon="mdi:alert-circle" className="me-1" />Mois futur non autorisé</div>
              )}
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-semibold text-secondary">Salaire Permanent</label>
              <input
                type="number"
                className="form-control shadow-sm border-0"
                style={{borderRadius: '8px', backgroundColor: '#fff'}}
                value={form.salaire_permanent}
                onChange={e=>{
                  const v = e.target.value;
                  setForm(f=>{
                    const next = { ...f, salaire_permanent: v };
                    if (autoChargePerm) {
                      next.charge_salaire_permanent = v === '' ? '' : computeCharge(v);
                    }
                    return next;
                  });
                }}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-semibold text-secondary">Charge Perm. (27%)</label>
              <input
                type="number"
                className="form-control shadow-sm border-0"
                style={{borderRadius: '8px', backgroundColor: '#fff'}}
                value={form.charge_salaire_permanent}
                onChange={e=>{
                  setAutoChargePerm(false);
                  setForm(f=>({ ...f, charge_salaire_permanent: e.target.value }));
                }}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-semibold text-secondary">Salaire Temporaire</label>
              <input
                type="number"
                className="form-control shadow-sm border-0"
                style={{borderRadius: '8px', backgroundColor: '#fff'}}
                value={form.salaire_temporaire}
                onChange={e=>{
                  const v = e.target.value;
                  setForm(f=>{
                    const next = { ...f, salaire_temporaire: v };
                    if (autoChargeTemp) {
                      next.charge_salaire_temp = v === '' ? '' : computeCharge(v);
                    }
                    return next;
                  });
                }}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-semibold text-secondary">Charge Temp. (27%)</label>
              <input
                type="number"
                className="form-control shadow-sm border-0"
                style={{borderRadius: '8px', backgroundColor: '#fff'}}
                value={form.charge_salaire_temp}
                onChange={e=>{
                  setAutoChargeTemp(false);
                  setForm(f=>({ ...f, charge_salaire_temp: e.target.value }));
                }}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-semibold text-secondary">Autres Charges</label>
              <input 
                type="number" 
                className="form-control shadow-sm border-0" 
                style={{borderRadius: '8px', backgroundColor: '#fff'}}
                value={form.autres_charge} 
                onChange={e=>setForm(f=>({...f, autres_charge: e.target.value}))} 
              />
            </div>
            <div className="col-12 d-flex gap-2 mt-3">
              <button
                type="submit"
                className="btn btn-primary px-4 shadow-sm"
                style={{borderRadius: '8px'}}
                disabled={!form.id && (duplicateMonth || yearMismatch || isFutureMonth)}
                title={
                  !form.id && duplicateMonth ? 'Mois déjà existant' : 
                  !form.id && isFutureMonth ? 'Mois futur non autorisé' : 
                  undefined
                }
              >
                <Icon icon={form.id ? "lucide:check" : "mdi:plus"} className="me-2" />
                {form.id ? 'Mettre à jour' : 'Ajouter'}
              </button>
              {form.id && (
                <button 
                  type="button" 
                  className="btn btn-outline-secondary px-4 shadow-sm" 
                  style={{borderRadius: '8px'}}
                  onClick={resetForm}
                >
                  <Icon icon="mdi:close" className="me-2" />
                  Annuler
                </button>
              )}
            </div>
          </form>
          </div>

          {/* Table Section */}
          <div className="table-responsive">
            <table className="table bordered-table mb-0">
              <thead>
                <tr>
                  <th scope="col" className="text-secondary">Mois</th>
                  <th scope="col" className="text-secondary">Sal. Permanent</th>
                  <th scope="col" className="text-secondary">Charge Perm.</th>
                  <th scope="col" className="text-secondary">Sal. Temporaire</th>
                  <th scope="col" className="text-secondary">Charge Temp.</th>
                  <th scope="col" className="text-secondary">Autres</th>
                  <th scope="col" className="text-secondary">Total coût</th>
                  <th scope="col" className="text-secondary text-center" style={{width:120}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map(rec => (
                  <tr key={rec.id}>
                    <td className="fw-semibold">
                      <Icon icon="mdi:calendar-month" className="me-2 text-primary" />
                      {toMonthDisplay(rec.mois)}
                    </td>
                    <td>{Number(rec.salaire_permanent || 0).toLocaleString()} DH</td>
                    <td className="text-success">{Number(rec.charge_salaire_permanent || 0).toLocaleString()} DH</td>
                    <td>{Number(rec.salaire_temporaire || 0).toLocaleString()} DH</td>
                    <td className="text-success">{Number(rec.charge_salaire_temp || 0).toLocaleString()} DH</td>
                    <td className="text-info">{Number(rec.autres_charge || 0).toLocaleString()} DH</td>
                    <td className="fw-bold text-primary">
                      {(Number(rec.salaire_permanent||0)+Number(rec.charge_salaire_permanent||0)+Number(rec.salaire_temporaire||0)+Number(rec.charge_salaire_temp||0)+Number(rec.autres_charge||0)).toLocaleString()} DH
                    </td>
                    <td className="text-center">
                      <button 
                        className="w-32-px h-32-px bg-primary-light text-primary-600 rounded-circle d-inline-flex align-items-center justify-content-center" 
                        onClick={()=>onEdit(rec)}
                        title="Modifier"
                      >
                        <Icon icon="lucide:edit" />
                      </button>
                    </td>
                  </tr>
                ))}
                {sortedItems.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-muted py-5">
                      <Icon icon="mdi:database-off" className="fs-1 mb-2 d-block mx-auto text-secondary opacity-50" />
                      <span>Aucune donnée pour {year}</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChargePersonnelPage;
