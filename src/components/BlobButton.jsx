import React from 'react';

const BlobButton = ({ children, className = '', type = 'button', onClick, title, disabled, style, ...rest }) => (
  <button
    type={type}
    className={`blob-btn ${className}`}
    onClick={onClick}
    title={title}
    disabled={disabled}
    style={style}
    {...rest}
  >
    <span className="btn-content">{children}</span>
    <span className="blob-btn__inner">
      <span className="blob-btn__blobs">
        <span className="blob-btn__blob" />
        <span className="blob-btn__blob" />
        <span className="blob-btn__blob" />
        <span className="blob-btn__blob" />
      </span>
    </span>
  </button>
);

export default BlobButton;
