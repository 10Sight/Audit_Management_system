import React, { memo } from "react";
import OptimizedLoader from "@/components/ui/OptimizedLoader";
import { useAuth } from "@/context/AuthContext.jsx";
import { Navigate } from "react-router-dom";

const ProtectedRoute = memo(({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <OptimizedLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role))
    return <Navigate to="/login" replace />; // Redirect to login instead of unauthorized

  return children;
});

ProtectedRoute.displayName = "ProtectedRoute";

export default ProtectedRoute;
