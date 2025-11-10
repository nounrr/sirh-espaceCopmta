import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Icon } from "@iconify/react";

const SelectModal = ({ title, items, selectedItems, setSelectedItems, onClose }) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrer les items par le terme de recherche
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Gestion de la sélection/désélection d'un élément
  const toggleItemSelection = (item) => {
    setSelectedItems(prev =>
      prev.includes(item.id)
        ? prev.filter(id => id !== item.id)
        : [...prev, item.id]
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        
        {/* Zone de recherche */}
        <input
          type="text"
          placeholder="Rechercher..."
          className="border rounded px-3 py-2 mb-4 w-full"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />

        {/* Liste des items avec checkboxes */}
        <div className="max-h-60 overflow-y-auto mb-4">
          {filteredItems.map(item => (
            <div key={item.id} className="flex items-center justify-between mb-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={() => toggleItemSelection(item)}
                  className="h-5 w-5"
                />
                <span>{item.name}</span>
              </label>
              {selectedItems.includes(item.id) && (
                <Icon icon="mdi:check-circle" className="text-green-600" />
              )}
            </div>
          ))}
        </div>

        {/* Sélectionner les employés sélectionnés sous forme de badges */}
        <div className="mb-4">
          <h4 className="font-semibold">Sélectionnés :</h4>
          <div className="flex flex-wrap gap-2">
            {selectedItems.map(id => {
              const item = items.find(i => i.id === id);
              return (
                <span key={id} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center">
                  {item.name}
                  <button
                    type="button"
                    onClick={() => toggleItemSelection(item)}
                    className="ml-2 text-red-500"
                  >
                    x
                  </button>
                </span>
              );
            })}
          </div>
        </div>

        {/* Boutons pour fermer le modal */}
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={() => onClose(selectedItems)}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Valider
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectModal;
