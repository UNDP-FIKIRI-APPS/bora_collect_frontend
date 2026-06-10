import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const PublicFormPage = lazy(() => import('./pages/PublicFormPage'));
const PublicFormEmbedPage = lazy(() => import('./pages/PublicFormEmbedPage'));

const CreateAccount = lazy(() => import('./pages/CreateAccount'));
const ProjectManagerRegistration = lazy(() => import('./pages/ProjectManagerRegistration'));
const AccountCreatedSuccess = lazy(() => import('./pages/AccountCreatedSuccess'));
const AdminHome = lazy(() => import('./pages/AdminHome'));
const ControllerHome = lazy(() => import('./pages/ControllerHome'));
const AnalystHome = lazy(() => import('./pages/AnalystHome'));
const ProjectManagerHome = lazy(() => import('./pages/ProjectManagerHome'));
const PMEnumeratorRequests = lazy(() => import('./pages/PMEnumeratorRequests'));
const Settings = lazy(() => import('./pages/Settings'));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-gray-600">Chargement...</p>
    </div>
  </div>
);

function PrivateRoute({ children, roles }: { children: React.ReactNode; roles: string[] }) {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  const currentUserId = localStorage.getItem('currentUserId');
  
  if (!token || !user) {
    return <Navigate to="/login" />;
  }
  
  try {
    const userData = JSON.parse(user);
    
    if (!userData || !userData.role || !userData.id) {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('currentUserId');
      localStorage.removeItem('sessionId');
      return <Navigate to="/login" />;
    }
    
    if (currentUserId) {
      if (currentUserId !== userData.id) {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('sessionId');
        toast.warning('Un autre compte s\'est connecté sur ce navigateur. Vous avez été déconnecté.', {
          autoClose: 5000,
          position: 'top-center'
        });
        return <Navigate to="/login" />;
      }
    } else if (userData.id) {
      localStorage.setItem('currentUserId', userData.id);
    }
    
    if (userData.status && userData.status !== 'ACTIVE') {
      return <Navigate to="/login" state={{ reason: 'account_inactive' }} />;
    }
    
    if (!roles.includes(userData.role)) {
      return <Navigate to="/login" />;
    }
    
    return <>{children}</>;
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('sessionId');
    return <Navigate to="/login" />;
  }
}

export default function App() {
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'forceLogout') {
        try {
          const forceLogoutData = e.newValue ? JSON.parse(e.newValue) : null;
          if (forceLogoutData) {
            const currentUser = localStorage.getItem('user');
            const currentUserId = localStorage.getItem('currentUserId');
            
            if (currentUser) {
              const userData = JSON.parse(currentUser);
              if (userData.id === forceLogoutData.userId || currentUserId === forceLogoutData.userId) {
                localStorage.removeItem('token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user');
                localStorage.removeItem('currentUserId');
                localStorage.removeItem('sessionId');
                toast.warning('Un autre compte s\'est connecté sur ce navigateur. Vous avez été déconnecté.', {
                  autoClose: 5000,
                  position: 'top-center'
                });
                window.location.href = '/login';
              }
            }
          }
        } catch (error) {
          console.error('Erreur lors du traitement de la déconnexion forcée:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    const currentUser = localStorage.getItem('user');
    const currentUserId = localStorage.getItem('currentUserId');
    if (currentUser && !currentUserId) {
      try {
        const userData = JSON.parse(currentUser);
        if (userData.id) {
          localStorage.setItem('currentUserId', userData.id);
        }
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de currentUserId:', error);
      }
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover />
      <Router>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/create-account" element={<CreateAccount />} />
            <Route path="/project-manager-registration" element={<ProjectManagerRegistration />} />
            <Route path="/account-created" element={<AccountCreatedSuccess />} />
            <Route path="/admin" element={<PrivateRoute roles={["ADMIN"]}><AdminHome /></PrivateRoute>} />
            <Route path="/controleur" element={<PrivateRoute roles={["CONTROLLER"]}><ControllerHome /></PrivateRoute>} />
            <Route path="/analyst-home" element={<PrivateRoute roles={["ANALYST"]}><AnalystHome /></PrivateRoute>} />
            <Route path="/project-manager" element={<PrivateRoute roles={["PROJECT_MANAGER"]}><ProjectManagerHome /></PrivateRoute>} />
            <Route path="/project-manager/enumerator-requests" element={<PrivateRoute roles={["PROJECT_MANAGER"]}><PMEnumeratorRequests /></PrivateRoute>} />
            <Route path="/analyst/parametres" element={<PrivateRoute roles={["ANALYST"]}><Settings /></PrivateRoute>} />
            <Route path="/form/:token" element={<PublicFormPage />} />
            <Route path="/embed/:token" element={<PublicFormEmbedPage />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </Suspense>
      </Router>
    </>
  );
}
