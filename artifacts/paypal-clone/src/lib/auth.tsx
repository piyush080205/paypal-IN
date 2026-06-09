import React, { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, setAuthTokenGetter, User } from "@workspace/api-client-react";
import { useLocation } from "wouter";

// Provide the token from localStorage
setAuthTokenGetter(() => {
  return localStorage.getItem("paypal_token");
});

type AuthContextType = {
  user: User | null | undefined;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const token = localStorage.getItem("paypal_token");
  
  const { data: user, isLoading, isError } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    }
  });

  useEffect(() => {
    if (isError) {
      localStorage.removeItem("paypal_token");
      setLocation("/login");
    }
  }, [isError, setLocation]);

  const login = (newToken: string) => {
    localStorage.setItem("paypal_token", newToken);
    window.location.href = "/dashboard";
  };

  const logout = () => {
    localStorage.removeItem("paypal_token");
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, isLoading: isLoading && !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
