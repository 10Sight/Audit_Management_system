import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useGetMeQuery } from "@/store/api";

// Create the context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);      
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState(null);

  const { data: meData, isLoading: meLoading, refetch } = useGetMeQuery();

  // Memoized fetch user function
  const fetchUser = useCallback(async () => {
    setError(null);
    try {
      const res = await refetch();
      const userData = res.data?.data?.employee || null;
      setUser(userData);
    } catch (err) {
      setUser(null);
      setError(err?.error || 'Failed to authenticate');
    }
  }, [refetch]);

  // Memoized logout function
  const logout = useCallback(() => {
    setUser(null);
    setError(null);
  }, []);

  // Sync local state with RTK Query data
  useEffect(() => {
    setLoading(meLoading);
    const userData = meData?.data?.employee || null;
    if (userData !== undefined) {
      setUser(userData);
    }
  }, [meData, meLoading]);

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
