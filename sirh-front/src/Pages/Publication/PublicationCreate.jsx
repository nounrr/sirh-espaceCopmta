import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createPublication, resetCreationStatus, fetchPublications } from "../../Redux/Slices/publicationSlice";
import { Icon } from "@iconify/react";

// Liste dynamique des rôles
const roleOptions = [
  { id: 'Employe', name: 'Employé' },
  { id: 'Chef_Dep', name: 'Chef de Département' },
  { id: 'RH', name: 'RH' },
];

// Utilitaire pour labels
const getItemLabel = (obj) =>
  obj?.name ||
  obj?.nom ||
  obj?.label ||
  obj?.raison_sociale ||
  obj?.type ||
  obj?.titre ||
  obj?.libelle ||
  `#${obj?.id}`;

// Badge stylé
function Badge({ text, color, textColor, onRemove }) {
  return (
    <span className="badge-pill" style={{ background: color, color: textColor }}>
      {text}
      {onRemove && (
        <button type="button" className="badge-close" onClick={onRemove} title="Supprimer">
          <Icon icon="mdi:close" />
        </button>
      )}
    </span>
  );
}

// Popover badge générique
function BadgeSelectPopover({
  open, label, options, selected, setSelected, search, setSearch,
  color, textColor, onClose
}) {
  const ref = useRef();
  useEffect(() => {
    if (!open) return;
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);
  return open ? (
    <div ref={ref} className="popover-badges" style={{ borderTop: `3px solid ${color}` }}>
      <div className="popover-badges-title" style={{ color }}>
        <Icon icon="mdi:chevron-down" className="mr-1" />
        {label}
      </div>
      <input
        className="popover-search"
        type="search"
        value={search}
        autoFocus
        onChange={e => setSearch(e.target.value)}
        placeholder="Rechercher…"
        style={{ borderColor: color }}
      />
      <div style={{ overflowY: "auto", maxHeight: 190 }}>
        {options.length === 0 && <div className="popover-noresult">Aucun résultat</div>}
        {options.map(o => (
          <label key={o.id} className="popover-row">
            <input
              type="checkbox"
              checked={selected.includes(o.id)}
              onChange={() =>
                setSelected(selected.includes(o.id)
                  ? selected.filter(v => v !== o.id)
                  : [...selected, o.id]
                )
              }
            />
            <span style={{ color: textColor }}>{getItemLabel(o)}</span>
          </label>
        ))}
      </div>
      <button className="popover-close" onClick={onClose}>
        <Icon icon="mdi:close" />
      </button>
    </div>
  ) : null;
}

// Liste fixe des types de contrat
const contractTypes = [
  { id: "permanent", name: "Permanent" },
  { id: "temporaire", name: "Temporaire" }
];

export default function PublicationCreate() {
  // Sélections et états
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [popoverRole, setPopoverRole] = useState(false);
  const [searchRole, setSearchRole] = useState("");

  const dispatch = useDispatch();
  const { creationStatus, creationError } = useSelector(s => s.publications);

  // Redux selectors
  const employees = useSelector(s => s.users.items ?? []);
  const departments = useSelector(s => s.departments.items ?? []);
  const companies = useSelector(s => s.societes?.items ?? []);

  // Auto-fetch data si vide
  useEffect(() => {
    if (!departments.length) dispatch({ type: 'departments/fetchAll' });
    if (!companies.length) dispatch({ type: 'societes/fetchAll' });
  }, [dispatch, departments.length, companies.length]);

  // Form state
  const [type, setType] = useState("news");
  const [titre, setTitre] = useState("");
  const [texte, setTexte] = useState("");
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState(["", ""]);
  // PAS DE STATUT à afficher : il sera 'publie' dans le payload
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [selectedContracts, setSelectedContracts] = useState([]);

  // Popover state
  const [popover, setPopover] = useState("");
  const [searchEmp, setSearchEmp] = useState("");
  const [searchDept, setSearchDept] = useState("");
  const [searchCompany, setSearchCompany] = useState("");
  const [searchContract, setSearchContract] = useState("");

  useEffect(() => {
    if (creationStatus === "success") {
      setType("news");
      setTitre("");
      setTexte("");
      setQuestion("");
      setAnswers(["", ""]);
      setSelectedEmployees([]);
      setSelectedDepartments([]);
      setSelectedCompanies([]);
      setSelectedContracts([]);
      setSelectedRoles([]);
      dispatch(fetchPublications());
      setTimeout(() => dispatch(resetCreationStatus()), 2000);
    }
  }, [creationStatus, dispatch]);

  const handleSubmit = e => {
    e.preventDefault();
    let payload = {
      type,
      titre,
      texte,
      statut: "publie", // <-- statut mis par défaut ici
      targets: {
        user_ids: selectedEmployees,
        departements: selectedDepartments,
        societe_ids: selectedCompanies,
        typeContrat: selectedContracts,
        roles: selectedRoles,
      },
    };
    if (type === "sondage") {
      payload.questions = [
        {
          question,
          answers: answers.filter(a => a.trim() !== ""),
        },
      ];
    }
    dispatch(createPublication(payload));
  };

  // UI COLORS
  const c_employee = "#bae6fd", c_dept = "#bbf7d0", c_company = "#fde68a", c_contract = "#ddd6fe";
  const t_employee = "#075985", t_dept = "#166534", t_company = "#a16207", t_contract = "#5b21b6";

  // Filtre générique
  const filtered = (arr, search) =>
    arr.filter(x => getItemLabel(x).toLowerCase().includes(search.toLowerCase()));

  return (
    <form className="flotte-modal-pub text-center" onSubmit={handleSubmit}>
      <h2 className="titre-pubmodal text-center">
        <Icon icon="mdi:plus-circle-outline" style={{ marginRight: 8, fontSize: 22 }} />
        Nouvelle {type === "sondage" ? "Sondage" : "Actualité"}
      </h2>
      {/* Type, Titre, Texte */}
      <div className="row g-3 text-center">
        <div className="modalfield col-md-12" style={{placeItems:"center"}}>
          <label className="labelf">Type</label>
          <div className="flex-btns">
            <button type="button" className={`btn-pill ${type === "news" ? "selected" : ""}`} onClick={() => setType("news")}>
              <Icon icon="mdi:newspaper" style={{ marginRight: 5 }} /> Actualité
            </button>
            <button type="button" className={`btn-pill ${type === "sondage" ? "selected" : ""}`} onClick={() => setType("sondage")}>
              <Icon icon="mdi:poll" style={{ marginRight: 5 }} /> Sondage
            </button>
          </div>
        </div>
       
      </div>
      <div className="row g-3">
         <div className="modalfield col-md-6">
          <label className="labelf">Titre</label>
          <input className="form-control modalinput" value={titre} required onChange={e => setTitre(e.target.value)} />
        </div>
        <div className="modalfield col-md-6">
          <label className="labelf">Texte</label>
          <input className="form-control modalinput"  value={texte} onChange={e => setTexte(e.target.value)} />
        </div>
      </div>
      {/* Sondage */}
      {type === "sondage" && (
        <div className="row g-3">
          <div className="modalfield col-md-12">
            <label className="labelf">Question</label>
            <input className="form-control modalinput" value={question} required onChange={e => setQuestion(e.target.value)} />
          </div>
          <div className="modalfield col-md-12">
            <label className="labelf">Réponses</label>
            <div className="row g-2">
              {answers.map((a, idx) => {
                const count = answers.length;
                let colClass = "col-6";
                if (count === 2) colClass += " col-md-6";
                else if (count === 3) colClass += " col-md-4";
                else if (count === 4) colClass += " col-md-3";
                else if (count === 5) colClass += " col-md-2";
                else colClass += " col-md-6";
                return (
                  <div className={`${colClass} mb-2 d-flex align-items-center`} key={idx}>
                    <input
                      className="form-control modalinput"
                      value={a}
                      onChange={e => {
                        const arr = [...answers];
                        arr[idx] = e.target.value;
                        setAnswers(arr);
                      }}
                      required
                    />
                    {answers.length > 2 && (
                      <button type="button" className="btn btn-outline-danger btn-sm ms-2 del-answer" onClick={() => setAnswers(answers.filter((_, i) => i !== idx))}>
                        <Icon icon="mdi:close" />
                      </button>
                    )}
                  </div>
                );
              })}
              <button
              type="button"
              className="btn btn-outline-primary btn-sm mt-2 mb-3 btn-add-answer"
              onClick={() => setAnswers([...answers, ""])}
              disabled={answers.length >= 5}
            >
              <Icon icon="mdi:plus" /> Ajouter une réponse
            </button>
            </div>
            
          </div>
        </div>
      )}
      {/* Sélecteurs */}
      <div className="row g-3 text-center">
        <div className="modalfield col-md-4">
          <div style={{ position: "relative", display: "inline-block" }}>
            <button type="button" className="btn-pick" style={{ background: c_employee, color: t_employee }} onClick={() => setPopover(popover === "emp" ? "" : "emp")}>
              <Icon icon="mdi:account-multiple" className="mr-1" />
              Sélectionner employés
            </button>
            <BadgeSelectPopover
              open={popover === "emp"}
              label="Employés"
              options={filtered(employees, searchEmp)}
              selected={selectedEmployees}
              setSelected={setSelectedEmployees}
              search={searchEmp}
              setSearch={setSearchEmp}
              color={c_employee}
              textColor={t_employee}
              onClose={() => setPopover("")}
            />
          </div>
          <div className="badges-row">
            {selectedEmployees.map(id => {
              const emp = employees.find(e => e.id === id);
              return emp ? <Badge key={id} text={getItemLabel(emp)} color={c_employee} textColor={t_employee}
                onRemove={() => setSelectedEmployees(selectedEmployees.filter(eid => eid !== id))}
              /> : null;
            })}
          </div>
        </div>
        <div className="modalfield col-md-4">
          <div style={{ position: "relative", display: "inline-block" }}>
            <button type="button" className="btn-pick" style={{ background: "#fbcfe8", color: "#be185d" }} onClick={() => setPopoverRole(!popoverRole)}>
              <Icon icon="mdi:account-badge" className="mr-1" />
              Sélectionner rôle(s)
            </button>
            <BadgeSelectPopover
              open={popoverRole}
              label="Rôles"
              options={roleOptions.filter(r => getItemLabel(r).toLowerCase().includes(searchRole.toLowerCase()))}
              selected={selectedRoles}
              setSelected={setSelectedRoles}
              search={searchRole}
              setSearch={setSearchRole}
              color="#fbcfe8"
              textColor="#be185d"
              onClose={() => setPopoverRole(false)}
            />
          </div>
          <div className="badges-row">
            {selectedRoles.map(id => {
              const role = roleOptions.find(r => r.id === id);
              return role ? <Badge key={id} text={getItemLabel(role)} color="#fbcfe8" textColor="#be185d"
                onRemove={() => setSelectedRoles(selectedRoles.filter(rid => rid !== id))}
              /> : null;
            })}
          </div>
        </div>
        <div className="modalfield col-md-4">
          <div style={{ position: "relative", display: "inline-block" }}>
            <button type="button" className="btn-pick" style={{ background: c_company, color: t_company }} onClick={() => setPopover(popover === "company" ? "" : "company")}>
              <Icon icon="mdi:domain" className="mr-1" />
              Sélectionner sociétés
            </button>
            <BadgeSelectPopover
              open={popover === "company"}
              label="Sociétés"
              options={filtered(companies, searchCompany)}
              selected={selectedCompanies}
              setSelected={setSelectedCompanies}
              search={searchCompany}
              setSearch={setSearchCompany}
              color={c_company}
              textColor={t_company}
              onClose={() => setPopover("")}
            />
          </div>
          <div className="badges-row">
            {selectedCompanies.map(id => {
              const soc = companies.find(e => e.id === id);
              return soc ? <Badge key={id} text={getItemLabel(soc)} color={c_company} textColor={t_company}
                onRemove={() => setSelectedCompanies(selectedCompanies.filter(eid => eid !== id))}
              /> : null;
            })}
          </div>
        </div>
        <div className="modalfield col-md-6">
          <div style={{ position: "relative", display: "inline-block" }}>
            <button type="button" className="btn-pick" style={{ background: c_contract, color: t_contract }} onClick={() => setPopover(popover === "contract" ? "" : "contract")}>
              <Icon icon="mdi:file-certificate" className="mr-1" />
              Sélectionner type(s) contrat
            </button>
            <BadgeSelectPopover
              open={popover === "contract"}
              label="Types de contrat"
              options={filtered(contractTypes, searchContract)}
              selected={selectedContracts}
              setSelected={setSelectedContracts}
              search={searchContract}
              setSearch={setSearchContract}
              color={c_contract}
              textColor={t_contract}
              onClose={() => setPopover("")}
            />
          </div>
          <div className="badges-row">
            {selectedContracts.map(id => {
              const typ = contractTypes.find(e => e.id === id);
              return typ ? <Badge key={id} text={getItemLabel(typ)} color={c_contract} textColor={t_contract}
                onRemove={() => setSelectedContracts(selectedContracts.filter(eid => eid !== id))}
              /> : null;
            })}
          </div>
        </div>
        <div className="modalfield col-md-6">
          <div style={{ position: "relative", display: "inline-block" }}>
            <button type="button" className="btn-pick" style={{ background: c_dept, color: t_dept }} onClick={() => setPopover(popover === "dept" ? "" : "dept")}>
              <Icon icon="mdi:office-building" className="mr-1" />
              Sélectionner départements
            </button>
            <BadgeSelectPopover
              open={popover === "dept"}
              label="Départements"
              options={filtered(departments, searchDept)}
              selected={selectedDepartments}
              setSelected={setSelectedDepartments}
              search={searchDept}
              setSearch={setSearchDept}
              color={c_dept}
              textColor={t_dept}
              onClose={() => setPopover("")}
            />
          </div>
          <div className="badges-row">
            {selectedDepartments.map(id => {
              const dep = departments.find(e => e.id === id);
              return dep ? <Badge key={id} text={getItemLabel(dep)} color={c_dept} textColor={t_dept}
                onRemove={() => setSelectedDepartments(selectedDepartments.filter(eid => eid !== id))}
              /> : null;
            })}
          </div>
        </div>
        
      </div>
      <button type="submit" className="btn-submit-pub text-center mt-4">
        Publier <Icon icon="mdi:send" style={{ marginLeft: 6 }} />
      </button>
      {creationStatus === "success" && <div className="success-text">Publication créée !</div>}
      {creationStatus === "fail" && <div className="fail-text">{creationError}</div>}
    </form>
  );
}
