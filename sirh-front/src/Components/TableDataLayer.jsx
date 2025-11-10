import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react/dist/iconify.js';
import { Dropdown } from 'react-bootstrap';
import { useSelector } from 'react-redux';

const TableDataLayer = ({
  title,
  data = [],
  columns,
  onAdd,
  onDelete,
  onExport,
  onImport,
  filters,
  searchPlaceholder,
  onToggleColumn,
  visibleColumns
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filteredData = data.filter(item => {
    return Object.values(item).some(value =>
      value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const visibleColumnsList = columns.filter(col => col.visible !== false);

  return (
    <div className='card basic-data-table'>
      <div className="card-header d-flex flex-column flex-md-row gap-2 justify-content-between align-items-start align-items-md-center">
        <h5 className="card-title mb-0">{title}</h5>

        <div className="d-flex flex-wrap gap-2">
          <Dropdown>
            <Dropdown.Toggle variant="light" id="column-visibility" className="d-flex align-items-center">
              <Icon icon="mdi:eye" className="me-2" />
              <span className="d-none d-md-inline">Colonnes</span>
            </Dropdown.Toggle>
            <Dropdown.Menu className="bg-base">
              {columns.map(column => (
                <Dropdown.Item
                  key={column.key}
                  onClick={() => onToggleColumn(column.key)}
                  className="d-flex align-items-center"
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns[column.key]}
                    onChange={() => {}}
                    className="form-check-input me-2"
                  />
                  {column.label}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>

          <button className="btn btn-primary d-flex align-items-center" onClick={onAdd}>
            <Icon icon="mdi:plus" />
            <span className="d-none d-md-inline ms-1">Ajouter</span>
          </button>

          <button className="btn btn-danger d-flex align-items-center" onClick={onDelete}>
            <Icon icon="mdi:trash" />
            <span className="d-none d-md-inline ms-1">Supprimer</span>
          </button>

          <button className="btn btn-outline-secondary d-flex align-items-center" onClick={onExport}>
            <Icon icon="mdi:download" />
            <span className="d-none d-md-inline ms-1">Export</span>
          </button>

          <button className="btn btn-outline-secondary d-flex align-items-center" onClick={onImport}>
            <Icon icon="mdi:upload" />
            <span className="d-none d-md-inline ms-1">Import</span>
          </button>

          <button
            className="btn btn-outline-secondary d-inline d-md-none"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <Icon icon="mdi:tune" />
          </button>
        </div>
      </div>

      <div className='card-body'>
        <div className={`filters-container mb-4 ${filtersOpen ? 'd-block' : 'd-none'} d-md-block`}>
          <div className="row g-3">
            {filters?.map((filter, index) => (
              <div key={index} className="col-6 col-sm-4 col-md-3 col-lg-2">
                {filter.component}
              </div>
            ))}
            <div className="col-12 col-sm-8 col-md-6 col-lg-4 ms-auto">
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button className="btn btn-outline-secondary" type="button">
                  <Icon icon="mdi:magnify" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className='table bordered-table mb-0'>
            <thead>
              <tr>
                {visibleColumnsList.map(column => (
                  <th key={column.key} scope='col'>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnsList.length} className="text-center">
                    Aucune donnée trouvée
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={index}>
                    {visibleColumnsList.map(column => (
                      <td key={column.key}>
                        {column.render ? column.render(item) : item[column.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TableDataLayer; 