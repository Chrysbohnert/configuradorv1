import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/SessionUpdateToast.css';

const STORAGE_KEY = 'configuratorUpdateToastShown';

const SessionUpdateToast = () => {
  const { user, loading } = useAuth();
  const [visible, setVisible] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    if (loading || !user || shownRef.current || sessionStorage.getItem(STORAGE_KEY)) return undefined;

    shownRef.current = true;
    sessionStorage.setItem(STORAGE_KEY, '1');
    setVisible(true);

    const timeout = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [loading, user]);

  if (!visible) return null;

  return (
    <div className="session-update-toast" role="status" aria-live="polite">
      <span className="session-update-toast-indicator" />
      <span>Configurador atualizado — novas melhorias já estão disponíveis.</span>
    </div>
  );
};

export default SessionUpdateToast;
