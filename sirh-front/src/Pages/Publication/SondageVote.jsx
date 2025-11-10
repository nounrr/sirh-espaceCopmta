import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { submitVote,fetchVotes } from '../../Redux/slices/voteSlice';
import { fetchPublications } from '../../Redux/Slices/publicationSlice';
import { Icon } from "@iconify/react";
import PropTypes from 'prop-types';
import { toErrorMessage } from '../../utils/errorUtils';

const chipColors = [
  'sondage-chip-blue',
  'sondage-chip-yellow',
  'sondage-chip-orange',
  'sondage-chip-pink',
  'sondage-chip-purple',
  'sondage-chip-cyan',
  'sondage-chip-lime',
  'sondage-chip-indigo',
  'sondage-chip-teal',
  'sondage-chip-amber',
];

function getChipColor(answer, idx) {
  if (!answer || typeof answer !== 'string') return chipColors[idx % chipColors.length];
  const lower = answer.trim().toLowerCase();
  if (lower === 'oui' || lower === 'yes') return 'sondage-chip-green';
  if (lower === 'non' || lower === 'no') return 'sondage-chip-red';
  return chipColors[idx % chipColors.length];
}

export default function SondageVote({ publication, canVote, onVoted }) {
  const dispatch = useDispatch();
  const { status, error } = useSelector(state => state.vote);
  const user = useSelector(state => state.auth.user);

  const question = publication.questions?.[0];
  let previousVote = null;
  if (user && publication.votes && Array.isArray(publication.votes)) {
    previousVote = publication.votes.find(
      v => v.user_id === user.id || (v.user && v.user.id === user.id)
    );
  }
  const [selectedAnswer, setSelectedAnswer] = useState(previousVote ? previousVote.answer_id : null);
  const [voted, setVoted] = useState(!!previousVote);
  const [justVoted, setJustVoted] = useState(false); // État local pour ce composant seulement

  const handleVote = (ansId) => {
    if (!canVote || voted) return;
    setSelectedAnswer(ansId);
    dispatch(submitVote({ answer_id: ansId }));
    setVoted(true);
    setJustVoted(true); // Marquer que l'utilisateur vient de voter dans ce composant
    if (typeof onVoted === 'function') onVoted();
    
    // Refetch les publications pour mettre à jour les votes
    dispatch(fetchVotes());
    dispatch(fetchPublications());
    
    // Cacher le message après 2 secondes
    setTimeout(() => {
      setJustVoted(false);
    }, 2000);
  };

  if (!question) return null;

  return (
    <div>
      <div className="mb-3">
        <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2" style={{ fontSize: '0.9rem' }}>
          <Icon icon="fluent:question-24-filled" className="text-primary" style={{ fontSize: '1rem' }} />
          {question.question}
        </h6>
        <div className="d-flex flex-row flex-wrap gap-2 justify-content-center">
          {question.answers.map((ans, idx) => {
            const isSelected = selectedAnswer === ans.id;
            const isDisabled = voted || !canVote;
            
            // Définir les couleurs selon la réponse
            let buttonStyle = {};
            const lower = (ans.answer || '').trim().toLowerCase();
            
            if (isSelected && voted) {
              if (lower === 'oui' || lower === 'yes') {
                buttonStyle = {
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: 'white',
                  border: '2px solid #22c55e',
                  boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)',
                  transform: 'translateY(-1px)'
                };
              } else if (lower === 'non' || lower === 'no') {
                buttonStyle = {
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  border: '2px solid #ef4444',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                  transform: 'translateY(-1px)'
                };
              } else {
                buttonStyle = {
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  border: '2px solid #3b82f6',
                  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
                  transform: 'translateY(-1px)'
                };
              }
            } else {
              if (lower === 'oui' || lower === 'yes') {
                buttonStyle = {
                  background: '#f0fdf4',
                  color: '#15803d',
                  border: '2px solid #22c55e',
                };
              } else if (lower === 'non' || lower === 'no') {
                buttonStyle = {
                  background: '#fef2f2',
                  color: '#dc2626',
                  border: '2px solid #ef4444',
                };
              } else {
                buttonStyle = {
                  background: '#f8fafc',
                  color: '#475569',
                  border: '2px solid #cbd5e1',
                };
              }
            }

            return (
              <button
                key={ans.id}
                type="button"
                className="btn fw-semibold rounded-pill d-flex align-items-center justify-content-center gap-2 flex-fill"
                onClick={() => handleVote(ans.id)}
                disabled={isDisabled}
                style={{
                  ...buttonStyle,
                  transition: 'all 0.3s ease',
                  fontSize: '0.875rem',
                  padding: '0.6rem 1rem',
                  minWidth: 'fit-content',
                  maxWidth: 'none',
                  ...(isDisabled ? { opacity: 0.7, cursor: 'not-allowed' } : {})
                }}
                onMouseEnter={e => {
                  if (!isDisabled && !isSelected) {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isDisabled && !isSelected) {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }
                }}
              >
                {isSelected && voted && (
                  <Icon icon="fluent:checkmark-circle-24-filled" style={{ fontSize: '1rem' }} />
                )}
                <span className="text-truncate">{ans.answer}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      {voted && !justVoted && (
        <div className="d-flex align-items-center justify-content-center gap-2 mt-2 mt-sm-3 p-2 rounded-3" style={{
          background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
          border: '1px solid #22c55e40',
          fontSize: '0.8rem'
        }}>
          <Icon icon="fluent:checkmark-circle-24-filled" style={{ color: '#16a34a', fontSize: '1rem' }} />
          <span className="fw-semibold text-success">Participation enregistrée</span>
        </div>
      )}
      
      {justVoted && (
        <>
          <div className="position-fixed top-50 start-50 translate-middle vote-success-modal" style={{ 
            zIndex: 9999,
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '90vw'
          }}>
            <div className="card border-0 shadow-lg rounded-4 p-3 p-sm-4 mx-2" style={{
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: 'white',
              minWidth: '280px',
              maxWidth: '350px',
              width: '100%'
            }}>
              <div className="text-center">
                <div className="mb-2 mb-sm-3">
                  <Icon icon="fluent:checkmark-circle-24-filled" style={{ fontSize: '2.5rem' }} />
                </div>
                <h6 className="fw-bold mb-1 mb-sm-2" style={{ fontSize: '1.1rem' }}>Vote enregistré !</h6>
                <p className="mb-0 opacity-90" style={{ fontSize: '0.875rem' }}>Merci pour votre participation</p>
              </div>
            </div>
          </div>
          <style>{`
            .vote-success-modal {
              animation: voteSuccess 2s ease-in-out forwards;
            }
            @keyframes voteSuccess {
              0% { 
                transform: translate(-50%, -50%) scale(0) rotate(-180deg);
                opacity: 0;
              }
              20% { 
                transform: translate(-50%, -50%) scale(1.05) rotate(0deg);
                opacity: 1;
              }
              80% { 
                transform: translate(-50%, -50%) scale(1) rotate(0deg);
                opacity: 1;
              }
              100% { 
                transform: translate(-50%, -50%) scale(0) rotate(180deg);
                opacity: 0;
              }
            }
            @media (max-width: 576px) {
              .vote-success-modal .card {
                margin: 0 1rem;
              }
            }
          `}</style>
        </>
      )}
      
    {status === 'fail' && justVoted && (
        <div className="alert alert-danger rounded-3 border-0 d-flex align-items-center gap-2 mt-3" style={{ fontSize: '0.875rem' }}>
          <Icon icon="fluent:error-circle-24-filled" />
      <span>{toErrorMessage(error)}</span>
        </div>
      )}
    </div>
  );
}

SondageVote.propTypes = {
  publication: PropTypes.object.isRequired,
  canVote: PropTypes.bool,
  onVoted: PropTypes.func,
};

SondageVote.defaultProps = {
  canVote: true,
  onVoted: () => {},
};
