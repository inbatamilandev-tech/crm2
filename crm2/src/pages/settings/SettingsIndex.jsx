import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '../../hooks/usePermission';

export default function SettingsIndex() {
  const { hasPermission } = usePermission();
  const navigate = useNavigate();

  useEffect(() => {
    // Default to profile for all users as per enterprise standards
    navigate('/settings/profile', { replace: true });
  }, [navigate]);

  return null;
}
