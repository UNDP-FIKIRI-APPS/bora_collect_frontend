import React from 'react';
import ProfileSettingsCore from '../components/settings/ProfileSettingsCore';

const AdminSettings: React.FC = () => (
  <ProfileSettingsCore showPMFields={false} pageTitle="Paramètres administrateur" />
);

export default AdminSettings;
