import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from 'sweetalert2';

const PrivateRouteWithRole = ({ children, allowedRoles = [] }) => {
  const { isSuccess, token } = useSelector((state) => state.auth);
  const user = useSelector((state) => state.auth.user);
  const roles = useSelector((state) => state.auth.roles || []);
  const location = useLocation();

  // Vérifier l'authentification
  if (!isSuccess || !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Vérifier les rôles autorisés
  const hasRequiredRole = allowedRoles.length === 0 || 
    allowedRoles.some(role => roles.includes(role));

  if (!hasRequiredRole) {
    // Afficher une notification d'accès refusé
    Swal.fire({
      icon: 'error',
      title: 'Accès refusé',
      text: 'Vous n\'avez pas les permissions nécessaires pour accéder à cette page.',
      confirmButtonText: 'Retour',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 4000
    });
    
    // Rediriger vers le dashboard
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PrivateRouteWithRole;