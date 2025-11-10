import React from 'react';
import { useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import SondageVote from './SondageVote';
import './SondageCards.css';

const STATUT_COLORS = {
  publie: { bg: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)", color: "white", icon: "fluent:checkmark-circle-24-filled" },
  brouillon: { bg: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)", color: "white", icon: "fluent:document-24-filled" },
  ferme: { bg: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", color: "white", icon: "fluent:lock-closed-24-filled" }
};

const TYPE_COLORS = {
  actualite: { bg: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "white", icon: "fluent:news-24-filled" },
  news: { bg: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "white", icon: "fluent:news-24-filled" },
  sondage: { bg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "white", icon: "fluent:poll-24-filled" }
};

export default function PublicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const publication = useSelector(
    state => state.publications.items.find(pub => String(pub.id) === String(id))
  );
  const votes = useSelector(state => state.publications.votes || []);
  const voteSlice = useSelector(state => state.vote?.votes || []);
  const user = useSelector(state => state.auth.user);
  // Combine les votes des deux slices
  const allVotes = [...votes, ...voteSlice];

  // Vérifier si l'utilisateur a déjà voté
  const hasVoted = publication?.questions?.[0] && user ? 
    allVotes.some(v => 
      ((v.answer && v.answer.question_id === publication.questions[0].id) || 
       (v.question_id === publication.questions[0].id)) && 
      v.user_id === user.id
    ) : false;

  if (!publication) {
    return (
      <div className="container-fluid py-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="card border-0 shadow-lg rounded-4 text-center">
              <div className="card-body p-5">
                <div className="mb-4">
                  <Icon icon="fluent:document-question-mark-24-filled" width="64" height="64" className="text-muted" />
                </div>
                <h3 className="fw-bold text-dark mb-3">Publication introuvable</h3>
                <p className="text-muted mb-4">La publication que vous recherchez n'existe pas ou a été supprimée.</p>
                <button 
                  className="btn btn-primary btn-lg px-4 py-2 rounded-pill d-flex align-items-center gap-2 mx-auto"
                  onClick={() => navigate('/publications')}
                  style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}
                >
                  <Icon icon="fluent:arrow-left-24-filled" />
                  Retour aux publications
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statutColor = STATUT_COLORS[publication.statut] || STATUT_COLORS.brouillon;
  const typeColor = TYPE_COLORS[publication.type] || TYPE_COLORS.actualite;

  return (
    <div className="container-fluid py-4" style={{ 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', 
      minHeight: '100vh' 
    }}>
      <div className="container-fluid px-4">
        {/* En-tête moderne - comme les autres pages */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="card-body p-3 p-sm-4" style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}>
                <div className="d-flex align-items-center gap-2 gap-sm-3">
                  <button 
                    className="btn btn-light rounded-circle d-flex align-items-center justify-content-center shadow-sm border-0 hover-lift me-2"
                    style={{ width: '40px', height: '40px', transition: 'all 0.3s ease' }}
                    onClick={() => navigate('/publications')}
                    onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                  >
                    <Icon icon="fluent:arrow-left-24-filled" width="18" />
                  </button>
                  <div className="p-2 p-sm-3 rounded-circle bg-white bg-opacity-20">
                    <Icon icon={typeColor.icon} style={{ fontSize: '1.5rem' }} className="d-block d-sm-none" />
                    <Icon icon={typeColor.icon} style={{ fontSize: '2rem' }} className="d-none d-sm-block" />
                  </div>
                  <div>
                    <h1 className="fw-bold mb-1" style={{ fontSize: '1.3rem' }}>
                      <span className="d-block d-sm-none">Publication</span>
                      <span className="d-none d-sm-block" style={{ fontSize: '1.8rem' }}>Détail de la publication</span>
                    </h1>
                    <p className="mb-0 opacity-90" style={{ fontSize: '0.8rem' }}>
                      <span className="d-block d-sm-none">
                        {publication.titre.length > 25 ? `${publication.titre.substring(0, 25)}...` : publication.titre}
                      </span>
                      <span className="d-none d-sm-block">
                        {publication.titre.length > 60 ? `${publication.titre.substring(0, 60)}...` : publication.titre}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card principale avec toutes les infos */}
        <div className="row g-4">
          <div className="col-12">
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden" 
                 style={{ 
                   transition: 'all 0.3s ease',
                   animation: 'fadeInUp 0.6s ease-out'
                 }}>
              {/* En-tête avec badges */}
              <div className="card-header border-0" style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '1.5rem'
              }}>
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                  <div>
                    <h1 className="h4 fw-bold mb-3 text-white">
                      <span className="d-none d-md-inline">{publication.titre}</span>
                      <span className="d-md-none" style={{ fontSize: '1.1rem' }}>
                        {publication.titre.length > 30 ? `${publication.titre.substring(0, 30)}...` : publication.titre}
                      </span>
                    </h1>
                    <div className="d-flex flex-wrap gap-2">
                      <span 
                        className="badge rounded-pill px-2 py-1 d-flex align-items-center gap-1 fw-semibold"
                        style={{ backgroundColor: typeColor.bg, color: typeColor.color, fontSize: '0.75rem' }}
                      >
                        <Icon icon={typeColor.icon} width="16" />
                        <span className="d-none d-sm-inline">{publication.type}</span>
                      </span>
                      <span 
                        className="badge rounded-pill px-2 py-1 d-flex align-items-center gap-1 fw-semibold"
                        style={{ backgroundColor: statutColor.bg, color: statutColor.color, fontSize: '0.75rem' }}
                      >
                        <Icon icon={statutColor.icon} width="16" />
                        <span className="d-none d-sm-inline">{publication.statut}</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="text-white-50 small">
                      <Icon icon="fluent:calendar-24-filled" className="me-1" width="14" />
                      <span className="d-none d-md-inline">
                        {new Date(publication.created_at).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="d-md-none">
                        {new Date(publication.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                    {publication.user && (
                      <div className="text-white-50 small mt-1">
                        <Icon icon="fluent:person-24-filled" className="me-1" width="14" />
                        <span className="d-none d-md-inline">{publication.user.name}</span>
                        <span className="d-md-none">
                          {publication.user.name.length > 15 ? `${publication.user.name.substring(0, 15)}...` : publication.user.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            {/* Contenu principal unifié */}
            <div className="card-body p-4">
              {/* Description */}
              <div className="mb-4">
                <h6 className="fw-bold mb-2 text-primary d-flex align-items-center gap-2">
                  <Icon icon="fluent:document-text-24-filled" width="18" />
                  <span className="d-none d-md-inline">Description</span>
                  <span className="d-md-none">Info</span>
                </h6>
                <div className="bg-light rounded-3 p-3">
                  <p className="mb-0 text-dark lh-base" style={{ fontSize: '0.95rem' }}>
                    {publication.description || 'Aucune description disponible.'}
                  </p>
                </div>
              </div>

              {/* Image si présente */}
              {publication.image && (
                <div className="mb-4">
                  <h6 className="fw-bold mb-2 text-info d-flex align-items-center gap-2">
                    <Icon icon="fluent:image-24-filled" width="18" />
                    <span className="d-none d-md-inline">Image</span>
                    <span className="d-md-none">Img</span>
                  </h6>
                  <div className="text-center">
                    <img 
                      src={publication.image} 
                      alt={publication.titre}
                      className="img-fluid rounded-3 shadow-sm"
                      style={{ maxHeight: '300px', objectFit: 'contain' }}
                    />
                  </div>
                </div>
              )}

              {/* Question du sondage intégrée */}
              {publication.type === 'sondage' && publication.questions && publication.questions[0] && (
                <div className="mb-4">
                  <div className="alert border-0" style={{ 
                    background: 'linear-gradient(135deg, #f59e0b20 0%, #d9770620 100%)',
                    borderLeft: '4px solid #f59e0b'
                  }}>
                    <h6 className="fw-bold mb-2 text-warning d-flex align-items-center gap-2">
                      <Icon icon="fluent:question-circle-24-filled" width="18" />
                      <span className="d-none d-md-inline">Question du sondage</span>
                      <span className="d-md-none">Question</span>
                    </h6>
                    <p className="mb-3 fw-semibold text-dark" style={{ fontSize: '0.95rem' }}>
                      {publication.questions[0].question}
                    </p>
                    
                    {/* Section de vote intégrée */}
                    {publication.statut === 'publie' && (
                      <div>
                        {hasVoted ? (
                          <div className="d-flex align-items-center text-success">
                            <Icon icon="fluent:checkmark-circle-24-filled" className="me-2" width="16" />
                            <span className="small">
                              <span className="d-none d-md-inline">Vous avez déjà voté pour ce sondage</span>
                              <span className="d-md-none">Déjà voté</span>
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div className="small fw-semibold text-primary mb-2">
                              <span className="d-none d-md-inline">Votre vote :</span>
                              <span className="d-md-none">Vote :</span>
                            </div>
                            <SondageVote publication={publication} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Statistiques Sondage - Card séparée et compacte */}
        {publication.type === 'sondage' && publication.questions && publication.questions[0] && (
          <div className="col-12">
            <div className="card border-0 shadow-sm"
                 style={{ 
                   transition: 'all 0.3s ease',
                   animation: 'fadeInUp 0.6s ease-out 0.2s both'
                 }}>
              <div className="card-header py-3" style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '1rem 1rem 0 0'
              }}>
                <h6 className="fw-bold mb-0 text-white d-flex align-items-center gap-2">
                  <Icon icon="fluent:data-pie-24-filled" width="20" />
                  <span className="d-none d-md-inline">Statistiques du sondage</span>
                  <span className="d-md-none">Stats</span>
                </h6>
              </div>
              <div className="card-body p-3">
                {/* Compte des votes par réponse - Version moderne colorée */}
                <div className="mb-4">
                  <div className="small fw-semibold mb-3 text-primary d-flex align-items-center gap-1">
                    <Icon icon="fluent:vote-24-filled" width="16" />
                    <span className="d-none d-md-inline">Répartition des votes</span>
                    <span className="d-md-none">Votes</span>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {publication.questions[0].answers.map((ans, index) => {
                      const count = allVotes.filter(v => 
                        (v.answer && v.answer.question_id === publication.questions[0].id && v.answer_id === ans.id) ||
                        (v.question_id === publication.questions[0].id && v.answer_id === ans.id)
                      ).length;
                      
                      // Couleurs dynamiques pour chaque réponse
                      const colors = [
                        { bg: '#e3f2fd', border: '#2196f3', badge: '#1976d2' },
                        { bg: '#f3e5f5', border: '#9c27b0', badge: '#7b1fa2' },
                        { bg: '#e8f5e8', border: '#4caf50', badge: '#388e3c' },
                        { bg: '#fff3e0', border: '#ff9800', badge: '#f57c00' },
                        { bg: '#fce4ec', border: '#e91e63', badge: '#c2185b' },
                        { bg: '#e0f2f1', border: '#009688', badge: '#00695c' }
                      ];
                      const color = colors[index % colors.length];
                      
                      return (
                        <div key={ans.id} className="d-flex align-items-center gap-2 px-3 py-2 rounded-3 shadow-sm" 
                             style={{ 
                               backgroundColor: color.bg, 
                               border: `2px solid ${color.border}`,
                               fontSize: '0.85rem',
                               transition: 'all 0.3s ease'
                             }}
                             onMouseEnter={(e) => {
                               e.target.style.transform = 'translateY(-2px)';
                               e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                             }}
                             onMouseLeave={(e) => {
                               e.target.style.transform = 'translateY(0)';
                               e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                             }}>
                          <span className="fw-semibold text-dark text-truncate" style={{ maxWidth: '120px' }}>
                            {ans.answer}
                          </span>
                          <span className="badge rounded-pill px-2 py-1 fw-bold text-white" 
                                style={{ backgroundColor: color.badge, fontSize: '0.7rem' }}>
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Liste des votants - Version moderne colorée */}
                <div>
                  <div className="small fw-semibold mb-3 text-success d-flex align-items-center gap-1">
                    <Icon icon="fluent:people-24-filled" width="16" />
                    <span className="d-none d-md-inline">Détail des votes</span>
                    <span className="d-md-none">Détails</span>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                      <thead style={{ 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white'
                      }}>
                        <tr style={{ fontSize: '0.85rem' }}>
                          <th className="fw-semibold py-3 border-0">
                            <Icon icon="fluent:person-24-filled" className="me-2" width="16" />
                            <span className="d-none d-md-inline">Utilisateur</span>
                            <span className="d-md-none">User</span>
                          </th>
                          <th className="fw-semibold py-3 border-0">
                            <Icon icon="fluent:checkmark-circle-24-filled" className="me-2" width="16" />
                            <span className="d-none d-md-inline">Réponse</span>
                            <span className="d-md-none">Rép.</span>
                          </th>
                          <th className="fw-semibold py-3 border-0 d-none d-md-table-cell">
                            <Icon icon="fluent:phone-24-filled" className="me-2" width="16" />
                            Téléphone
                          </th>
                        </tr>
                      </thead>
                      <tbody style={{ backgroundColor: '#f8f9fa' }}>
                        {allVotes.filter(v => 
                          (v.answer && v.answer.question_id === publication.questions[0].id) ||
                          (v.question_id === publication.questions[0].id)
                        ).map((vote, idx) => {
                          const user = vote.user || vote.utilisateur || {};
                          const answer = (publication.questions[0].answers || []).find(a => 
                            a.id === (vote.answer_id || (vote.answer && vote.answer.id))
                          );
                          
                          // Couleurs alternées pour les lignes
                          const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8f9fa';
                          
                          return (
                            <tr key={`${vote.id || idx}-${vote.user_id}`} 
                                style={{ 
                                  fontSize: '0.9rem',
                                  backgroundColor: rowBg,
                                  transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#e3f2fd';
                                  e.target.style.transform = 'scale(1.02)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = rowBg;
                                  e.target.style.transform = 'scale(1)';
                                }}>
                              <td className="py-3 border-0">
                                <div className="d-flex align-items-center gap-2">
                                  <div className="rounded-circle d-flex align-items-center justify-content-center" 
                                       style={{ 
                                         width: '32px', 
                                         height: '32px', 
                                         background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                         color: 'white',
                                         fontSize: '0.8rem',
                                         fontWeight: 'bold'
                                       }}>
                                    {(user.name || user.nom || user.prenom || 'U').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="fw-semibold text-dark">
                                      <span className="d-none d-md-inline">
                                        {user.name || user.nom || user.prenom || user.email || vote.user_id || 'Utilisateur inconnu'}
                                      </span>
                                      <span className="d-md-none">
                                        {(user.name || user.nom || user.prenom || user.email || vote.user_id || 'Inconnu').substring(0, 12)}
                                        {(user.name || user.nom || user.prenom || user.email || vote.user_id || '').length > 12 ? '...' : ''}
                                      </span>
                                    </div>
                                    {user.email && (
                                      <div className="text-muted small d-none d-md-block">
                                        {user.email.length > 20 ? `${user.email.substring(0, 20)}...` : user.email}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 border-0">
                                <span className="badge px-3 py-2 fw-semibold" 
                                      style={{ 
                                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                        color: 'white',
                                        fontSize: '0.8rem',
                                        borderRadius: '20px'
                                      }}>
                                  <span className="d-none d-md-inline">
                                    {answer ? answer.answer : (vote.answer_text || vote.answer_id || 'Réponse inconnue')}
                                  </span>
                                  <span className="d-md-none">
                                    {(answer ? answer.answer : (vote.answer_text || vote.answer_id || 'Inconnu')).substring(0, 8)}
                                    {(answer ? answer.answer : (vote.answer_text || vote.answer_id || '')).length > 8 ? '...' : ''}
                                  </span>
                                </span>
                              </td>
                              <td className="d-none d-md-table-cell py-3 border-0">
                                <div className="d-flex align-items-center gap-2 text-muted">
                                  <Icon icon="fluent:phone-24-regular" width="16" />
                                  <span style={{ fontSize: '0.85rem' }}>
                                    {user.tel || user.telephone || '-'}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {allVotes.filter(v => 
                          (v.answer && v.answer.question_id === publication.questions[0].id) ||
                          (v.question_id === publication.questions[0].id)
                        ).length === 0 && (
                          <tr>
                            <td colSpan="3" className="text-center py-5 border-0" style={{ backgroundColor: '#ffffff' }}>
                              <div className="d-flex flex-column align-items-center gap-2">
                                <div className="rounded-circle d-flex align-items-center justify-content-center" 
                                     style={{ 
                                       width: '48px', 
                                       height: '48px', 
                                       background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                                       color: 'white'
                                     }}>
                                  <Icon icon="fluent:vote-24-regular" width="24" />
                                </div>
                                <div className="text-muted fw-semibold">
                                  <span className="d-none d-md-inline">Aucun vote pour le moment</span>
                                  <span className="d-md-none">Pas de votes</span>
                                </div>
                                <div className="text-muted small">
                                  <span className="d-none d-md-inline">Soyez le premier à participer à ce sondage !</span>
                                  <span className="d-md-none">Votez maintenant !</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
