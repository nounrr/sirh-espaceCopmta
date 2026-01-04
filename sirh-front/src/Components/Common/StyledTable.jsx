import React from 'react';

const StyledTable = ({ thead, children, className = '', ...props }) => {
  return (
    <div className="styled-table-container">
      <div className="table-responsive">
        <table className={`table table-hover mb-0 ${className}`} {...props}>
          {thead ? (
            <>
              <thead>{thead}</thead>
              <tbody>{children}</tbody>
            </>
          ) : (
            children
          )}
        </table>
      </div>
      <style>{`
        .styled-table-container :global(.table-responsive) {
          border-radius: 1rem;
          box-shadow: 0 0 20px rgba(0,0,0,0.05);
          background: white;
        }
        .styled-table-container :global(.table) {
          margin-bottom: 0;
          border-collapse: separate;
          border-spacing: 0;
        }
        .styled-table-container :global(thead th) {
          background-color: #f8f9fa;
          color: #2c3e50;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.7rem;
          letter-spacing: 0.5px;
          padding: 1rem 1rem;
          border-bottom: 1px solid #e9ecef;
          border-right: 1px solid #e9ecef;
          vertical-align: middle;
        }
        .styled-table-container :global(tbody td) {
          padding: 1rem 1rem;
          vertical-align: middle;
          border-bottom: 1px solid #e9ecef;
          border-right: 1px solid #f0f2f5;
          color: #525f7f;
          font-size: 0.875rem;
        }
        .styled-table-container :global(th:last-child), 
        .styled-table-container :global(td:last-child) {
          border-right: none;
        }
        .styled-table-container :global(tbody tr:hover) {
          background-color: #f6f9fc;
        }
        .styled-table-container :global(tbody tr:last-child td) {
          border-bottom: none;
        }
      `}</style>
    </div>
  );
};

export default StyledTable;
