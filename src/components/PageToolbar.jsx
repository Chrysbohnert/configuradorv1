import React from 'react';
import '../styles/PageHeader.css';

const PageToolbar = ({ search, filters, count, actions, children }) => {
  return (
    <div className="erp-toolbar">
      <div className="erp-toolbar-left">
        {search && (
          <label className="erp-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input
              type="text"
              placeholder={search.placeholder || 'Buscar...'}
              value={search.value || ''}
              onChange={(e) => search.onChange(e.target.value)}
            />
          </label>
        )}
        {filters}
        {children}
      </div>
      <div className="erp-toolbar-right">
        {count !== undefined && (
          <span className="erp-toolbar-count">
            {count}
          </span>
        )}
        {actions}
      </div>
    </div>
  );
};

export default PageToolbar;
