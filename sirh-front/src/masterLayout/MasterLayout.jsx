/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Link, NavLink, useLocation, Outlet, useNavigate } from "react-router-dom";
import ThemeToggleButton from "../helper/ThemeToggleButton";
import { useDispatch } from "react-redux";
import { logout } from "../Redux/Slices/authSlice";
import { useSelector } from "react-redux";
import BottomMenu from "./BottomMenu";

const MasterLayout = ({ children }) => {

  const roles = useSelector((state) => state.auth.roles || []);
  const ISGestProjet = Array.isArray(roles)&& roles.some(r => ["Gest_Projet"].includes(r));
const user = useSelector((state)=>state.auth.user)
const apiUrl = import.meta.env.VITE_API_URL;
const societe_id = useSelector((state) => state.auth.user?.societe_id);
const [imageUrl, setImageUrl] = useState("/assets/default.webp");
const canSeeProjects = true;

// const canSeeProjects = Array.isArray(roles)&& roles.some(r => ["Gest_Projet","RH"].includes(r));
useEffect(() => {
  console.log("Current societe_id:", societe_id);
  console.log("Current user roles:", roles); // Debug pour voir les rôles
  
  const getImageUrl = () => {
    if (societe_id === 1) return "/assets/images/smee.webp";
    if (societe_id ===2) return "/assets/images/dct.webp";
    return "/assets/default.webp";
  };
  setImageUrl(getImageUrl());
}, [societe_id, roles]);


  let [sidebarActive, seSidebarActive] = useState(false);
  let [mobileMenu, setMobileMenu] = useState(false);
  const location = useLocation(); // Hook to get the current route
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [imagePreview, setImagePreview] = useState(
    user?.picture
      ? `${apiUrl}storage/profile_picture/${user.picture}`
      : "assets/images/user-grid/user-grid-img13.png"
  );
  useEffect(() => {
    const handleDropdownClick = (event) => {
      event.preventDefault();
      const clickedLink = event.currentTarget;
      const clickedDropdown = clickedLink.closest(".dropdown");

      if (!clickedDropdown) return;

      const isActive = clickedDropdown.classList.contains("open");

      // Close all dropdowns
      const allDropdowns = document.querySelectorAll(".sidebar-menu .dropdown");
      allDropdowns.forEach((dropdown) => {
        dropdown.classList.remove("open");
        const submenu = dropdown.querySelector(".sidebar-submenu");
        if (submenu) {
          submenu.style.maxHeight = "0px"; // Collapse submenu
        }
      });

      // Toggle the clicked dropdown
      if (!isActive) {
        clickedDropdown.classList.add("open");
        const submenu = clickedDropdown.querySelector(".sidebar-submenu");
        if (submenu) {
          submenu.style.maxHeight = `${submenu.scrollHeight}px`; // Expand submenu
        }
      }
    };

    // Attach click event listeners to all dropdown triggers
    const dropdownTriggers = document.querySelectorAll(
      ".sidebar-menu .dropdown > a, .sidebar-menu .dropdown > Link"
    );

    dropdownTriggers.forEach((trigger) => {
      trigger.addEventListener("click", handleDropdownClick);
    });

    const openActiveDropdown = () => {
      const allDropdowns = document.querySelectorAll(".sidebar-menu .dropdown");
      allDropdowns.forEach((dropdown) => {
        const submenuLinks = dropdown.querySelectorAll(".sidebar-submenu li a");
        submenuLinks.forEach((link) => {
          if (
            link.getAttribute("href") === location.pathname ||
            link.getAttribute("to") === location.pathname
          ) {
            dropdown.classList.add("open");
            const submenu = dropdown.querySelector(".sidebar-submenu");
            if (submenu) {
              submenu.style.maxHeight = `${submenu.scrollHeight}px`; // Expand submenu
            }
          }
        });
      });
    };

    // Open the submenu that contains the active route
    openActiveDropdown();

    // Cleanup event listeners on unmount
    return () => {
      dropdownTriggers.forEach((trigger) => {
        trigger.removeEventListener("click", handleDropdownClick);
      });
    };
  }, [location.pathname]);
// Remove auto toggle on route change; keep user-controlled visibility

  let sidebarControl = () => {
    seSidebarActive(!sidebarActive);
  };

  let mobileMenuControl = () => {
    setMobileMenu(!mobileMenu);
  };

  // Fonction pour fermer la sidebar lors du clic sur un lien
  const handleLinkClick = () => {
    seSidebarActive(false);
    setMobileMenu(false);
  };

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      dispatch({ type: 'RESET_ALL' }); // Reset tout le redux
      navigate('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  return (
    <>
    <div className={mobileMenu ? "overlay active" : "overlay"} onClick={() => setMobileMenu(false)}></div>
    <section className="layout-wrapper">
      {/* sidebar */}
      <aside
      className={
        (sidebarActive ? "sidebar active " : mobileMenu ? "sidebar sidebar-open" : "sidebar") +
        " md:block hidden" // Ajoute cette classe
      }
      >
        {/* Toggle Button - Half inside/half outside */}
        <button
          type='button'
          onClick={sidebarControl}
          className='sidebar-toggle-btn'
          aria-label={sidebarActive ? 'Masquer la barre latérale' : 'Afficher la barre latérale'}
        >
          <Icon 
            icon='fluent:chevron-right-24-filled' 
            className={`icon ${sidebarActive ? 'rotate-180' : ''}`} 
          />
        </button>

        <button
          onClick={sidebarControl}
          type='button'
          className='sidebar-close-btn'
        >
          <Icon icon='radix-icons:cross-2' />
        </button>
        <div className='sidebar-menu-area'>
        <ul style={{paddingLeft:"0px"}} className="sidebar-menu" id="sidebar-menu">

  {/* Tableau de bord - Tous sauf Gest_Projet et Resp_Com */}
  {!roles.includes("Gest_Projet") && !roles.includes("Resp_Com") && (
    <li>
      <NavLink to="/" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
        <Icon icon="fluent:home-24-filled" className="menu-icon" />
        <span>Tableau de bord</span>
      </NavLink>
    </li>
  )}

  {/* Gestion des taches - Visible pour tous sauf Resp_Com */}
  {!roles.includes("Resp_Com") && (
    <li className="dropdown">
      <Link to="#">
        <Icon icon="fluent:task-list-square-24-filled" className="menu-icon" />
        <span>Gestion des taches</span>
      </Link>
      <ul className="sidebar-submenu">
        <li>
          <NavLink to="/todo/phone" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
            <Icon icon="fluent:board-24-filled" className="circle-icon w-auto" />
            Tableau des tâches
          </NavLink>
        </li>
        <li>
          <NavLink to="/todo/lists" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
            <Icon icon="fluent:list-24-filled" className="circle-icon w-auto" />
            Mes listes
          </NavLink>
        </li>

      </ul>
    </li>
  )}

  {/* Projets - Gest_Projet et RH */}
  {(roles.includes("Gest_Projet") || roles.includes("RH")) && (
    <li className="dropdown">
      <Link to="#">
        <Icon icon="fluent:folder-24-filled" className="menu-icon" />
        <span>Catégories</span>
      </Link>
      <ul className="sidebar-submenu">
        <li>
          <NavLink to="/projets" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
            <Icon icon="fluent:folder-open-24-filled" className="circle-icon w-auto" />
            Liste des catégories
          </NavLink>
        </li>
        <li>
          <NavLink to="/projets/creer" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
            <Icon icon="fluent:add-square-24-filled" className="circle-icon w-auto" />
            Créer une catégorie
          </NavLink>
        </li>
        <li>
          <NavLink to="/projets-rapport" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
            <Icon icon="fluent:data-bar-vertical-24-filled" className="circle-icon w-auto" />
            Reporting
          </NavLink>
        </li>
      </ul>
    </li>
  )}

  {/* Gestion des employés & Clients - RH & Chef_Dep & Chef_Chant & Gest_Projet */}
  {(roles.includes("RH") || roles.includes("Chef_Dep") || roles.includes("Chef_Chant") || roles.includes("Gest_RH") || roles.includes("Gest_Projet")) && (
    <li className="dropdown">
      <Link to="#">
        <Icon icon="fluent:people-24-filled" className="menu-icon" />
        <span> Employés & Clients</span>
      </Link>
      <ul className="sidebar-submenu">
         
      <li>
          <NavLink to="/users" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
            <Icon icon="fluent:people-list-24-filled" className="circle-icon w-auto" />
            Liste des employés
                    </NavLink>
                  </li>
                  
                  {(roles.includes("RH") || roles.includes("Gest_RH") || roles.includes("Chef_Dep") || roles.includes("Chef_Chant")) &&( <>
                    <li>
                    <NavLink to="/clients" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
                      <Icon icon="fluent:person-briefcase-24-filled" className="circle-icon w-auto" />
                      Liste des clients
                              </NavLink>
                            </li>
                    <li>
                    <NavLink to="/clients/add" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
                      <Icon icon="fluent:person-add-24-filled" className="circle-icon w-auto" />
                      Ajouter un client
                              </NavLink>
                            </li>
                    <li>
          <NavLink to="/users/add" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
            <Icon icon="fluent:person-add-24-filled" className="circle-icon w-auto" />
            Ajouter les employés
          </NavLink>
        </li>
        </>)}

        {/* Départements moved here */}
        {(roles.includes("RH") || roles.includes("Gest_RH")) && (
            <>
            <li>
                <NavLink to="/departments" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
                    <Icon icon="fluent:building-multiple-24-filled" className="circle-icon w-auto" />
                    Liste des départements
                </NavLink>
            </li>
            <li>
                <NavLink to="/departments/add" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
                    <Icon icon="fluent:add-square-24-filled" className="circle-icon w-auto" />
                    Créer un département
                </NavLink>
            </li>
            </>
        )}
       
        
                </ul>
              </li>
  )}

  {/* Documents - RH et Gest_RH */}
  {(roles.includes("RH") || roles.includes("Gest_RH")) && (
  <li className="dropdown">
      <Link to="#" >
        <Icon icon="fluent:document-24-filled" className="menu-icon" />
        <span>Documents</span>
      </Link>
      <ul className="sidebar-submenu">
        {(roles.includes("RH") || roles.includes("Gest_RH")) && (
         <li>
          <NavLink to="/type-docs" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
            <Icon icon="fluent:document-table-24-filled" className="circle-icon w-auto" />
            Types des documents
                    </NavLink>
                  </li>)}
    
        <li>
          <NavLink to="/documents" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
            <Icon icon="fluent:folder-24-filled" className="circle-icon w-auto" />
            Liste des documents
                    </NavLink>
                  </li>
 
                 
                </ul>
              </li>
  )}
  {/* Demande d'absences - RH, Employe, Chef_Dep, Chef_Chant, Resp_Com */}
  {(roles.includes("RH") || roles.includes("Employe") || roles.includes("Chef_Dep") || roles.includes("Chef_Chant") || roles.includes("Gest_RH") || roles.includes("Resp_Com")) && (
  <li className="dropdown">
    <Link to="#">
      <Icon icon="fluent:calendar-person-24-filled" className="menu-icon" />
      <span>Demandes</span>
              </Link>
    <ul className="sidebar-submenu">
      


        <li>
          <NavLink to="/absences" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
            <Icon icon="fluent:clipboard-task-list-ltr-24-filled" className="circle-icon w-auto" />
            Liste des demandes
                  </NavLink>
                </li>
{(roles.includes("RH") || roles.includes("Chef_Dep") || roles.includes("Chef_Chant") || roles.includes("Gest_RH")) && (
<li>
<NavLink to="/absences/calendar" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
  <Icon icon="fluent:calendar-24-filled" className="circle-icon w-auto" />
  Calendrier des demandes
        </NavLink>
      </li>
                
      )}
      <li>
        <NavLink to="absences/add" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
          <Icon icon="fluent:calendar-add-24-filled" className="circle-icon w-auto" />
          Ajouter une demande
                  </NavLink>
                </li>
              </ul>
            </li>
  )}

  {/* Soldes de Congés - RH uniquement */}
  {false && (roles.includes("RH") || roles.includes("Chef_Dep") || roles.includes("Chef_Chant") || roles.includes("Employe") || roles.includes("Gest_RH")) && (
    <li>
      <NavLink to="/conges/soldes" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
        <Icon icon="fluent:table-24-filled" className="menu-icon" />
        <span>Soldes de Congés</span>
      </NavLink>
    </li>
  )}

  {/* Pointage - RH, Chef_Dep, Chef_Chant, Employe */}
  {false && (roles.includes("RH") || roles.includes("Chef_Dep") || roles.includes("Chef_Chant") || roles.includes("Employe") || roles.includes("Gest_RH")) && (
  <li>
    <NavLink to="/pointages" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
      <Icon icon="fluent:clock-24-filled" className="menu-icon" />
      <span>Pointages</span>
    </NavLink>
  </li>
  )}


  {/* Publications & Sondages - Liste pub pour tous, Créer pub seulement RH */}
  {false && (roles.includes("RH") || roles.includes("Chef_Dep") || roles.includes("Chef_Chant") || roles.includes("Employe") || roles.includes("Gest_RH") || roles.includes("Resp_Com")) && (  <li className="dropdown">
    <Link to="#">
      <Icon icon="fluent:news-24-filled" className="menu-icon" />
      <span>Communications</span>
    </Link>
    <ul className="sidebar-submenu">
      {/* Liste des publications - Tous les rôles */}
      <li>
        <NavLink to="/publications" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
          <Icon icon="fluent:news-24-filled" className="circle-icon w-auto" />
          {roles.includes("RH") || roles.includes("Gest_RH") || roles.includes("Resp_Com") ? "Liste des publications" : "Publications"}
        </NavLink>
      </li>
      
      {/* Créer publication - Seulement RH et Resp_Com */}
      {(roles.includes("RH") || roles.includes("Gest_RH") || roles.includes("Resp_Com")) && (
        <li>
          <NavLink to="/publications/nouveau" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
            <Icon icon="fluent:add-square-24-filled" className="circle-icon w-auto" />
            Nouvelle publication
          </NavLink>
        </li>
      )}
      
      {/* Sondages - Pour les non-RH */}
      {!roles.includes("RH") && !roles.includes("Gest_RH") && (
        <li>
          <NavLink to="/sondages" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
            <Icon icon="fluent:poll-24-filled" className="circle-icon w-auto" />
            Sondages
          </NavLink>
        </li>
      )}
    </ul>
  </li>)}

  {/* Reporting */}
  {false && (
  <li className="dropdown">
    <Link to="#">
      <Icon icon="fluent:data-bar-vertical-24-filled" className="menu-icon" />
      <span>Reporting</span>
              </Link>
    <ul className="sidebar-submenu">
    
                {/* Rapport des catégories */}
                {(roles.includes("Gest_Projet") || roles.includes("RH")) && (
                    <li>
                    <NavLink to="/projets-rapport" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
                        <Icon icon="fluent:folder-open-24-filled" className="circle-icon w-auto" />
                        <span> Rapport des catégories</span>
                    </NavLink>
                    </li>
                )}

                {/* Liste des catégories */}
                {(roles.includes("Gest_Projet") || roles.includes("RH")) && (
                    <li>
                    <NavLink to="/projets" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
                        <Icon icon="fluent:folder-24-filled" className="circle-icon w-auto" />
                        <span>Liste des catégories</span>
                    </NavLink>
                    </li>
                )}

                {/* Statistiques - Tous les rôles */}
                <li>
        <NavLink to="/statistiques" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
          <Icon icon="fluent:data-bar-vertical-24-filled" className="circle-icon w-auto" />
          Statistiques
                  </NavLink>
                </li>
                
                {/* Pointage Details - Tous sauf Gest_RH et Gest_Projet */}
                {!roles.includes("Gest_RH") && !roles.includes("Gest_Projet") && (
                <li>
        <NavLink to="/pointagedetails" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
          <Icon icon="fluent:clock-toolbox-24-filled" className="circle-icon w-auto" />
          Pointage Details
                  </NavLink>
                </li>
                )}
                
                {/* Excel Export - Seulement RH */}
                {(roles.includes("RH") || roles.includes("Gest_RH")) && (
                <li>
                <NavLink to="/Export" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
                  <Icon icon="fluent:document-table-arrow-right-24-filled" className="circle-icon w-auto" />
                  Excel  Export
                          </NavLink>
                        </li>
                )}
              </ul>
            </li>
  )}

  {/* Paie - RH uniquement (sous-menu: Salaires, Charge Personnel) */}
  {false && roles.includes("RH") && (
    <li className="dropdown">
      <Link to="#">
        <Icon icon="fluent:money-24-filled" className="menu-icon" />
        <span>Paie</span>
      </Link>
      <ul className="sidebar-submenu">
        <li>
          <NavLink to="/salaires" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
            <Icon icon="fluent:money-24-filled" className="circle-icon w-auto" />
            Salaires
          </NavLink>
        </li>
        <li>
          <NavLink to="/charges-personnel" className={(navData) => navData.isActive ? "active-page" : ""} onClick={handleLinkClick}>
            <Icon icon="fluent:money-calculator-24-regular" className="circle-icon w-auto" />
            Charge Personnel
          </NavLink>
        </li>
      </ul>
    </li>
  )}
           
</ul>
        </div>
      </aside>

      <main
        className={sidebarActive ? "dashboard-main active" : "dashboard-main"}
      >
        <div className='navbar-header'>
          <div className='row align-items-center justify-content-between'>
            <div className='col-auto'>
              <div className='d-flex flex-wrap align-items-center gap-4'>
                <button
                  onClick={mobileMenuControl}
                  type='button'
                  className='sidebar-mobile-toggle'
                >
                  <Icon icon='fluent:navigation-24-filled' className='icon' />
                </button>
                
              </div>
            </div>
            <div className='col-auto'>
              <div  className='  d-flex flex-wrap align-items-center gap-3'>
                {/* ThemeToggleButton */}
                <div className="d-none">
                <ThemeToggleButton/>
                </div>
              
                {/* Notification dropdown end */}
                <div className='dropdown'>
                  <button
                    className='d-flex align-items-center gap-3 bg-transparent border-0 p-0'
                    type='button'
                    data-bs-toggle='dropdown'
                    aria-expanded="false"
                  >
                    <div className="text-end d-none d-sm-block">
                      <h6 className='text-primary fw-bold mb-0 text-md'>
                        {user?.name ? `${user.name} ${user.prenom}` : "Admin DRH"}
                      </h6>
                      <span className='text-secondary-light text-xs fw-medium d-block mt-1'>
                        {user?.role || "Responsable RH"}
                      </span>
                    </div>
                    <div className="position-relative">
                      <div className='w-48-px h-48-px rounded-circle bg-primary-50 d-flex justify-content-center align-items-center border border-2 border-white shadow-sm'>
                        <Icon icon="fluent:person-24-filled" className="text-2xl text-primary" />
                      </div>
                      <span className="position-absolute bottom-0 end-0 w-12-px h-12-px bg-success rounded-circle border border-2 border-white"></span>
                    </div>
                  </button>
                  <div className='dropdown-menu to-top dropdown-menu-sm'>
                    <div className='py-12 px-16 radius-8 bg-primary-50 mb-16 d-flex align-items-center justify-content-between gap-2'>
                      <Link to="/view-profile">
                        <h6 className='text-lg text-primary-light fw-semibold mb-2'>
                          {user?.name ? `${user.name} ${user.prenom}` : "Admin DRH"}
                        </h6>
                        <span className='text-secondary-light fw-medium text-sm'>
                        {user?.role || "Responsable RH"}
                        </span>
                      </Link>
                      <button type='button' className='hover-text-danger'>
                <Icon
                          icon='radix-icons:cross-1'
                          className='icon text-xl'
                        />
                      </button>
                    </div>
                    <ul className='to-top-list'>
                 
                <li>
                        <Link
                          className='dropdown-item text-black px-0 py-8 hover-bg-transparent hover-text-danger d-flex align-items-center gap-3'
                          to='#'
                          onClick={handleLogout}
                        >
                          <Icon icon='fluent:power-24-filled' className='icon text-xl' />{" "}
                          Log Out
                        </Link>
            </li>
          </ul>
        </div>
                </div>
                {/* Profile dropdown end */}
              </div>
            </div>
          </div>
        </div>

        {/* dashboard-main-body */}
        <div className='dashboard-main-body'>
          <Outlet />
          
        </div>
        


      </main>
      <BottomMenu />

    </section>
    </>
  );
};

export default MasterLayout;