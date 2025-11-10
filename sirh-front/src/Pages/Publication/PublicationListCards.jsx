import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPublications } from '../../Redux/Slices/publicationSlice';
import { Icon } from '@iconify/react';
import './SondageCards.css';

const borderClasses = [
  "border-green",
  "border-blue",
  "border-orange",
  "border-pink",
  "border-purple",
  "border-yellow"
];

export default function PublicationListCards() {
  const dispatch = useDispatch();
  const { items: publications, loading } = useSelector(state => state.publications);

  useEffect(() => {
    dispatch(fetchPublications());
  }, [dispatch]);

  // Filtrer uniquement les actualités (type news ou actualite)
  const actualites = publications.filter(pub => pub.type === 'news' || pub.type === 'actualite');

  if (loading === 'loading') {
    return (
      <div className="container-fluid py-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
        <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <div className="d-flex align-items-center justify-content-center gap-2">
              <Icon icon="fluent:news-24-filled" style={{ fontSize: '1.5rem', color: '#6c757d' }} />
              <p className="text-muted mb-0">Chargement des actualités...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      <div className="container-fluid px-4">
        {/* En-tête moderne - optimisé mobile */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="card-body p-3 p-sm-4" style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}>
                <div className="d-flex align-items-center gap-2 gap-sm-3">
                  <div className="p-2 p-sm-3 rounded-circle bg-white bg-opacity-20">
                    <Icon icon="fluent:news-24-filled" style={{ fontSize: '1.5rem' }} className="d-block d-sm-none" />
                    <Icon icon="fluent:news-24-filled" style={{ fontSize: '2rem' }} className="d-none d-sm-block" />
                  </div>
                  <div>
                    <h1 className="fw-bold mb-1" style={{ fontSize: '1.3rem' }}>
                      <span className="d-block d-sm-none">Actualités</span>
                      <span className="d-none d-sm-block" style={{ fontSize: '1.8rem' }}>Actualités</span>
                    </h1>
                    <p className="mb-0 opacity-90" style={{ fontSize: '0.8rem' }}>
                      <span className="d-block d-sm-none">Dernières nouvelles</span>
                      <span className="d-none d-sm-block">Découvrez les dernières actualités de l'entreprise</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Grid des actualités */}
        <div className="row">
        {actualites.length === 0 && (
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-5 text-center">
                <Icon icon="fluent:news-24-regular" style={{ fontSize: '4rem' }} className="text-muted mb-3" />
                <h5 className="text-muted fw-bold">Aucune actualité disponible</h5>
                <p className="text-muted">Il n'y a actuellement aucune actualité à afficher.</p>
              </div>
            </div>
          </div>
        )}
        {actualites.map((pub, idx) => (
          <div key={pub.id} className="col-12 col-lg-6 col-xl-4 mb-3">
            <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden" style={{
              transition: 'all 0.3s ease',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              maxWidth: '100%'
            }}>
              {/* En-tête de la carte - optimisé mobile */}
              <div className="card-header border-0" style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '0.75rem 1rem'
              }}>
                <div className="d-flex align-items-start gap-2">
                  <Icon icon="fluent:news-24-filled" 
                        style={{ fontSize: '1.2rem', marginTop: '2px', flexShrink: 0 }} />
                  <h6 className="mb-0 fw-bold lh-sm" style={{ fontSize: '0.95rem' }}>
                    {pub.titre}
                  </h6>
                </div>
              </div>

              {/* Corps de la carte - optimisé mobile */}
              <div className="card-body d-flex flex-column" style={{ padding: '1rem' }}>
                {/* Description - plus compacte sur mobile */}
                <div className="mb-3">
                  <p className="text-secondary mb-0" style={{ 
                    lineHeight: '1.4', 
                    fontSize: '0.875rem',
                    display: '-webkit-box',
                    WebkitLineClamp: '4',
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {pub.texte}
                  </p>
                </div>

                {/* Section statut si non publié */}
                <div className="flex-grow-1 d-flex align-items-end">
                  {pub.statut !== 'publie' && (
                    <div className="d-flex align-items-center justify-content-center w-100">
                      <div className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill" style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: 'white',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                      }}>
                        <Icon icon="fluent:warning-24-filled" style={{ fontSize: '0.9rem' }} />
                        <span>Non publié</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pied de carte avec métadonnées - mobile optimisé */}
              <div className="card-footer bg-transparent border-0" style={{ padding: '0.5rem 1rem 0.75rem' }}>
                <div className="d-flex align-items-center justify-content-between text-muted" style={{ fontSize: '0.7rem' }}>
                  <div className="d-flex align-items-center gap-1">
                    <Icon icon="fluent:calendar-24-regular" style={{ fontSize: '0.8rem' }} />
                    <span className="d-none d-sm-inline">
                      {new Date(pub.created_at).toLocaleDateString('fr-FR')}
                    </span>
                    <span className="d-inline d-sm-none">
                      {new Date(pub.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-1">
                    <Icon icon="fluent:eye-24-regular" style={{ fontSize: '0.8rem' }} />
                    <span>Actualité</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
