import React from 'react';
import ProfileSettingsCore from '../components/settings/ProfileSettingsCore';
import ControllerSettingsExtras from '../components/settings/ControllerSettingsExtras';

const Settings: React.FC = () => (
  <div className="space-y-6">
    <ProfileSettingsCore showPMFields={false} pageTitle="Paramètres" />
    <ControllerSettingsExtras />
  </div>
);

export default Settings;
