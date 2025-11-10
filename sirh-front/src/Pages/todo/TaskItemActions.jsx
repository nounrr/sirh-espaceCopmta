import React from 'react';
import { Icon } from '@iconify/react';

const TaskItemActions = ({ onEdit, onDelete }) => (
  <div className="d-flex align-items-center gap-1">
    <button
      className="btn btn-sm btn-outline-primary rounded-circle p-1 d-flex align-items-center justify-content-center"
      style={{ 
        width: '28px', 
        height: '28px',
        border: '1px solid #667eea',
        color: '#667eea',
        transition: 'all 0.3s ease'
      }}
      onClick={onEdit}
      title="Modifier la tâche"
      type="button"
      onMouseEnter={(e) => {
        e.target.style.background = '#667eea';
        e.target.style.color = 'white';
        e.target.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        e.target.style.background = 'transparent';
        e.target.style.color = '#667eea';
        e.target.style.transform = 'scale(1)';
      }}
    >
      <Icon icon="lucide:edit" style={{ fontSize: '0.9rem' }} />
    </button>
    
    <button
      className="btn btn-sm btn-outline-danger rounded-circle p-1 d-flex align-items-center justify-content-center"
      style={{ 
        width: '28px', 
        height: '28px',
        border: '1px solid #dc3545',
        color: '#dc3545',
        transition: 'all 0.3s ease'
      }}
      onClick={onDelete}
      title="Supprimer la tâche"
      type="button"
      onMouseEnter={(e) => {
        e.target.style.background = '#dc3545';
        e.target.style.color = 'white';
        e.target.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        e.target.style.background = 'transparent';
        e.target.style.color = '#dc3545';
        e.target.style.transform = 'scale(1)';
      }}
    >
      <Icon icon="mingcute:delete-2-line" style={{ fontSize: '0.9rem' }} />
    </button>
  </div>
);

export default TaskItemActions;
