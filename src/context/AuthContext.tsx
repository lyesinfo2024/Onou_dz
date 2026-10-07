import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../types/index.ts';

interface AuthContextType extends AuthState {
  login: (identifier: string, password: string, directorateId?: number | string | null) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return sessionStorage.getItem('dorm_auth_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Verify token on mount with the backend database
  useEffect(() => {
    const verifyExistingToken = async () => {
      const storedToken = sessionStorage.getItem('dorm_auth_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setUser(data.user);
            setToken(storedToken);
          } else {
            sessionStorage.removeItem('dorm_auth_token');
            setToken(null);
            setUser(null);
          }
        } else {
          sessionStorage.removeItem('dorm_auth_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to verify token with backend API:', err);
        sessionStorage.removeItem('dorm_auth_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    verifyExistingToken();
  }, []);

  const login = async (identifier: string, password: string, directorateId?: number | string | null): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, password, directorateId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = data.error || 'فشل تسجيل الدخول، يرجى التأكد من البيانات';
        setError(errorMsg);
        setIsLoading(false);
        return { success: false, error: errorMsg };
      }

      sessionStorage.setItem('dorm_auth_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      console.error('Login request failed:', err);
      const errorMsg = 'تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى';
      setError(errorMsg);
      setIsLoading(false);
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    sessionStorage.removeItem('dorm_auth_token');
    setToken(null);
    setUser(null);
    setError(null);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
        }
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
