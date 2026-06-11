import React from 'react';
import ProjectManagerForm from '../components/ProjectManagerForm';
import { devLogger } from '../utils/logger';


interface AdminCreateProjectManagerProps {
  onBack?: () => void;
}

const AdminCreateProjectManager: React.FC<AdminCreateProjectManagerProps> = ({ onBack }) => {
  return (
    <ProjectManagerForm 
      isAdmin={true}
      onBack={onBack}
      onSuccess={() => {
        devLogger.log('Project Manager créé avec succès');
      }}
    />
  );
};

export default AdminCreateProjectManager;
