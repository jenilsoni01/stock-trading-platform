import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getAuthToken, setAuthToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'

  const refreshWallet = async () => {
    try {
      if (getAuthToken()) {
        const w = await api.getWallet();
        setWallet(w);
      }
    } catch (err) {
      console.warn('Could not refresh wallet:', err.message);
    }
  };

  const loadUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setWallet(null);
      setLoading(false);
      return;
    }

    try {
      const u = await api.getMe();
      setUser(u);
      await refreshWallet();
    } catch (err) {
      console.warn('Session expired or invalid:', err.message);
      setAuthToken(null);
      setUser(null);
      setWallet(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = async (username, password) => {
    const res = await api.login({ username, password });
    if (res.token) {
      setAuthToken(res.token);
      await loadUser();
      setIsAuthModalOpen(false);
    }
    return res;
  };

  const register = async (username, email, password, fullName) => {
    const res = await api.register({ username, email, password, fullName });
    if (res.token) {
      setAuthToken(res.token);
      await loadUser();
      setIsAuthModalOpen(false);
    }
    return res;
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setWallet(null);
  };

  const openAuthModal = (mode = 'login') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        wallet,
        loading,
        login,
        register,
        logout,
        refreshWallet,
        isAuthModalOpen,
        authMode,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
