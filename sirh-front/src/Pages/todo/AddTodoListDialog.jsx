import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { createTodoList } from '../../Redux/Slices/todoListSlice';

const AddTodoListDialog = () => {
  const dispatch = useDispatch();
  const [title, setTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !assignedTo) return;

    dispatch(createTodoList({ title, assigned_to: assignedTo }));
    setTitle('');
    setAssignedTo('');
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-2">
      <input
        className="border px-3 py-2 w-full rounded"
        placeholder="Titre de la liste"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className="border px-3 py-2 w-full rounded"
        placeholder="ID utilisateur assigné"
        value={assignedTo}
        onChange={(e) => setAssignedTo(e.target.value)}
      />
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        Créer
      </button>
    </form>
  );
};

export default AddTodoListDialog;
