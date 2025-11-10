import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AddTaskForm from './AddTaskForm';
import { useSelector, useDispatch } from 'react-redux';
import { Icon } from '@iconify/react';
import { fetchTodoLists } from '../../Redux/Slices/todoListSlice';

const AddTaskPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const todoLists = useSelector(state => state.todoLists.items);
  const status = useSelector(state => state.todoLists.status);
  const todoList = todoLists.find(l => String(l.id) === String(id));

  useEffect(() => {
    if (!todoLists.length && status !== 'loading') {
      dispatch(fetchTodoLists());
    }
  }, [dispatch, todoLists.length, status]);

  if (!todoList && status === 'succeeded') {
    return (
      <div className="container py-5">
        <div className="alert alert-danger shadow-sm rounded-3 text-center py-4">
          <Icon icon="mdi:alert-circle" className="me-2 text-danger" style={{ fontSize: 32 }} />
          To-Do List introuvable.
        </div>
      </div>
    );
  }

  if (!todoList) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="card mx-auto border-0 shadow-lg rounded-4" style={{ maxWidth: 480 }}>
        <div className="card-header bg-primary text-white d-flex align-items-center gap-2 rounded-top-4 border-0" style={{ minHeight: 60 }}>
          <button
            className="btn btn-light btn-sm rounded-circle d-flex align-items-center justify-content-center me-3"
            style={{ width: 36, height: 36 }}
            onClick={() => navigate(-1)}
            title="Retour"
          >
            <Icon icon="mdi:arrow-left" className="text-primary" style={{ fontSize: 20 }} />
          </button>
          <h5 className="mb-0 fw-bold">Ajouter une tâche à&nbsp;
            <span className="text-warning">{todoList.title}</span>
          </h5>
        </div>
        <div className="card-body p-4">
          <AddTaskForm listId={todoList.id} />
        </div>
      </div>
    </div>
  );
};

export default AddTaskPage;
