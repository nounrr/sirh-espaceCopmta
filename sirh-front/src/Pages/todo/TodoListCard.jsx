import React from 'react';
import TaskItem from './TaskItem';
import AddTaskForm from './AddTaskForm';
import { Icon } from '@iconify/react';

const TodoListCard = ({ list }) => {
  const total = list.tasks.length;
  const done = list.tasks.filter(t => t.status === 'Terminée').length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  let status = 'Non commencée';
  let badgeClass = 'bg-secondary-subtle text-secondary';
  let icon = 'mdi:progress-clock';
  if (total > 0 && done === total) {
    status = 'Terminée';
    badgeClass = 'bg-success-subtle text-success';
    icon = 'mdi:check-circle-outline';
  } else if (list.tasks.some(t => t.status === 'En cours' || t.status === 'Terminée')) {
    status = 'En cours';
    badgeClass = 'bg-warning-subtle text-warning';
    icon = 'mdi:clock-outline';
  }

  return (
    <div>
      <div className="mb-2 d-flex align-items-center justify-content-between gap-2">
        <span className="badge bg-secondary-light text-secondary fw-normal">Assignée à : {list.assignee?.name || 'N/A'}</span>
        <span className={`badge rounded-pill d-flex align-items-center gap-1 px-3 py-1 fw-normal ${badgeClass}`} style={{ fontSize: 14, minWidth: 110, justifyContent: 'center' }}>
          <Icon icon={icon} /> {status}
        </span>
      </div>
      <div className="d-flex align-items-center gap-2 mb-2">
        <div className="progress flex-grow-1" style={{ height: 8 }}>
          <div
            className="progress-bar bg-success"
            role="progressbar"
            style={{ width: `${percent}%` }}
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <span className="small text-muted" style={{ minWidth: 38 }}>{percent}%</span>
      </div>
      <div className="d-flex flex-column gap-2 mb-3">
        {list.tasks.length === 0 ? (
          <span className="text-muted small">Aucune tâche.</span>
        ) : (
          list.tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))
        )}
      </div>
      <AddTaskForm listId={list.id} />
    </div>
  );
};

export default TodoListCard;
