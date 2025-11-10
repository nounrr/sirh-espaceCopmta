import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPublications } from '../../Redux/Slices/publicationSlice';
import SondageVote from './SondageVote';
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


export default function SondageList() {
  const dispatch = useDispatch();
  const { items: publications, loading } = useSelector(state => state.publications);
  const { votes } = useSelector(state => state.vote);
  const user = useSelector(state => state.auth.user);
  const [blockedIds, setBlockedIds] = React.useState([]);

  const sondages = publications.filter(pub => pub.type === 'sondage');
  
  // Si l'utilisateur a déjà voté à ce sondage (backend ou local)
  const hasVotedFor = (pub) => {
    const question = pub.questions?.[0];
    if (!question || !user) return false;
    return (
      votes.some(v => v.answer && v.answer.question_id === question.id && v.user_id === user.id)
      || blockedIds.includes(pub.id)
    );
  };

  // Séparer les sondages votés et non votés pour la priorité d'affichage
  const nonVotedSondages = sondages.filter(pub => !hasVotedFor(pub) && pub.statut === 'publie');
  const votedSondages = sondages.filter(pub => hasVotedFor(pub) || pub.statut !== 'publie');
  const sortedSondages = [...nonVotedSondages, ...votedSondages];

  const handleVoted = (pubId) => {
    setBlockedIds(ids => [...ids, pubId]);
    // Refetch les publications pour mettre à jour les votes
    dispatch(fetchPublications());
  };

  if (loading === 'loading') {
    return <div className="text-center py-10 text-gray-500">Chargement…</div>;
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
                    <Icon icon="fluent:poll-24-filled" style={{ fontSize: '1.5rem' }} className="d-block d-sm-none" />
                    <Icon icon="fluent:poll-24-filled" style={{ fontSize: '2rem' }} className="d-none d-sm-block" />
                  </div>
                  <div>
                    <h1 className="fw-bold mb-1" style={{ fontSize: '1.3rem' }}>
                      <span className="d-block d-sm-none">Sondages</span>
                      <span className="d-none d-sm-block" style={{ fontSize: '1.8rem' }}>Sondages</span>
                    </h1>
                    <p className="mb-0 opacity-90" style={{ fontSize: '0.8rem' }}>
                      <span className="d-block d-sm-none">Participez aux sondages</span>
                      <span className="d-none d-sm-block">Participez aux sondages de l'entreprise</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Grid des sondages - priorité aux non votés */}
        <div className="row">
        {sortedSondages.length === 0 && (
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-5 text-center">
                <Icon icon="fluent:poll-24-regular" style={{ fontSize: '4rem' }} className="text-muted mb-3" />
                <h5 className="text-muted fw-bold">Aucun sondage disponible</h5>
                <p className="text-muted">Il n'y a actuellement aucun sondage à afficher.</p>
              </div>
            </div>
          </div>
        )}
        {sortedSondages.map((pub, idx) => {
          const blocked = hasVotedFor(pub);
          return (
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
                    <Icon icon="fluent:poll-24-filled" 
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
                      WebkitLineClamp: '3',
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {pub.texte}
                    </p>
                  </div>

                  {/* Section vote/résultat - optimisée mobile */}
                  <div className="flex-grow-1">
                    {blocked ? (
                      <div className="text-center py-2">
                        {/* Affichage du vote sélectionné avec bouton "Voté" en ligne */}
                        <div className="d-flex align-items-center justify-content-center gap-2 flex-wrap">
                          {(() => {
                            const question = pub.questions?.[0];
                            let answerId = null;
                            if (question && user) {
                              let vote = votes.find(v => v.answer && v.answer.question_id === question.id && v.user_id === user.id);
                              if (!vote) {
                                vote = (pub.votes || []).find(v => v.user_id === user.id || (v.user && v.user.id === user.id));
                              }
                              if (vote) {
                                answerId = vote.answer_id || (vote.answer && vote.answer.id);
                              }
                            }
                            
                            const selectedAnswer = question && question.answers.find(ans => ans.id === answerId);
                            
                            return (
                              <>
                                {/* Bouton "Voté" */}
                                <div className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill" style={{
                                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                  color: 'white',
                                  fontSize: '0.8rem',
                                  fontWeight: '600',
                                  boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
                                }}>
                                  <Icon icon="fluent:checkmark-circle-24-filled" style={{ fontSize: '0.9rem' }} />
                                  <span>Voté</span>
                                </div>
                                
                                {/* Réponse sélectionnée */}
                                {selectedAnswer && (
                                  <div className="d-inline-flex align-items-center gap-1 px-3 py-2 rounded-pill"
                                       style={{
                                         background: '#f8f9fa',
                                         color: '#495057',
                                         fontSize: '0.8rem',
                                         fontWeight: '500',
                                         border: '1px solid #dee2e6'
                                       }}>
                                    <Icon icon="fluent:arrow-right-24-filled" style={{ fontSize: '0.7rem' }} />
                                    <span className="text-truncate">{selectedAnswer.answer}</span>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-auto">
                        <SondageVote
                          key={pub.id}
                          publication={pub}
                          canVote={pub.statut === 'publie' && !blocked}
                          onVoted={() => handleVoted(pub.id)}
                        />
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
                      <Icon icon="fluent:people-24-regular" style={{ fontSize: '0.8rem' }} />
                      <span>{pub.votes?.length || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
