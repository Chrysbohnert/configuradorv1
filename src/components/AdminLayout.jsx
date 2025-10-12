import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminNavigation from './AdminNavigation';

const AdminLayout = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/');
    }
  }, [navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="admin-layout">
      <AdminNavigation user={user} />
      <div className="admin-content">
        <Outlet context={{ user }} />
      </div>
    </div>
  );
};

export default AdminLayout;

