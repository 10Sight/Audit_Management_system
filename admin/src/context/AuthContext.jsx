import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import api from "@/utils/axios";

// Create the context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);      
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState(null);

  // Memoized fetch user function to prevent unnecessary re-renders
  const fetchUser = useCallback(async () => {
    if (loading === false) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const res = await api.get("/api/v1/auth/me");
      const userData = res.data?.data?.employee || null;
      setUser(userData);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Auth fetch error:', err.response?.status);
      }
      setUser(null);
      if (err.response?.status !== 401) {
        setError(err.message || 'Failed to authenticate');
      }
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Memoized logout function
  const logout = useCallback(() => {
    setUser(null);
    setError(null);
  }, []);

  // Only fetch user on initial mount
  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      if (mounted) {
        await fetchUser();
      }
    };
    
    initAuth();
    
    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array for initial fetch only

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    setUser,
    loading,
    error,
    fetchUser,
    logout,
  }), [user, loading, error, fetchUser, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use context easily
export const useAuth = () => useContext(AuthContext);
