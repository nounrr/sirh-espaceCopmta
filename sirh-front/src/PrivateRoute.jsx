import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useState, useEffect } from "react";

const PrivateRoute = ({ children, requirePlayerId = true }) => {
  const { isSuccess, token } = useSelector((state) => state.auth);
  const location = useLocation();
  const user = useSelector((state) => state.auth.user);

  if (!isSuccess || !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default PrivateRoute;
