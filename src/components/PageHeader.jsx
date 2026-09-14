import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/PageHeader.css';

const PageHeader = ({
  breadcrumb = [],
  title,
  subtitle,
  actions,
  back,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (typeof back === 'function') back();
    else if (typeof back === 'string') navigate(back);
    else navigate(-1);
  };

  return (
    <div className="erp-page-heading">
      <div>
        {breadcrumb.length > 0 && (
          <nav className="erp-breadcrumb" aria-label="Breadcrumb">
            {back && (
              <>
                <button type="button" onClick={handleBack} aria-label="Voltar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Voltar
                </button>
                <span className="erp-breadcrumb-separator">/</span>
              </>
            )}
            {breadcrumb.map((item, index) => {
              const isLast = index === breadcrumb.length - 1;
              return (
                <React.Fragment key={item.label + index}>
                  {item.path && !isLast ? (
                    <Link to={item.path}>{item.label}</Link>
                  ) : (
                    <span className={isLast ? 'erp-breadcrumb-current' : ''}>{item.label}</span>
                  )}
                  {!isLast && <span className="erp-breadcrumb-separator">/</span>}
                </React.Fragment>
              );
            })}
          </nav>
        )}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="erp-page-heading-actions">{actions}</div>}
    </div>
  );
};

export default PageHeader;
