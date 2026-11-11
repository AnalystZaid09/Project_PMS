import React, { createContext, useContext, useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { CurrentUser } from "@/types";

interface AuthContextType {
  user: CurrentUser | null;
  token: string | null;
  isLoading: boolean;
  login: (usernameOrEmail: string, password: string, branchId?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchBranch: (branchId: string) => Promise<void>;
  hasPermission: (permissionCode: string) => boolean;
  hasRole: (roleSlug: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CurrentUser | null>(() => {
    const saved = localStorage.getItem("pms_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("pms_token"));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate active session on initial mount
  useEffect(() => {
    async function checkAuth() {
      const storedToken = localStorage.getItem("pms_token");
      if (!storedToken) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const { data } = await apiClient.get<CurrentUser>("/auth/me");
        setUser(data);
        localStorage.setItem("pms_user", JSON.stringify(data));
      } catch (err) {
        localStorage.removeItem("pms_token");
        localStorage.removeItem("pms_user");
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  const login = async (usernameOrEmail: string, password: string, branchId?: string) => {
    const { data } = await apiClient.post("/auth/login", {
      username_or_email: usernameOrEmail,
      password,
      branch_id: branchId,
    });

    const accessToken = data.access_token;
    const userData = data.user;

    localStorage.setItem("pms_token", accessToken);
    localStorage.setItem("pms_user", JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem("pms_token");
      localStorage.removeItem("pms_user");
      setUser(null);
      setToken(null);
      window.location.href = "/login";
    }
  };

  const switchBranch = async (branchId: string) => {
    const { data } = await apiClient.post(`/auth/switch-branch/${branchId}`);
    localStorage.setItem("pms_token", data.access_token);
    localStorage.setItem("pms_user", JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
  };

  const hasPermission = (permissionCode: string): boolean => {
    if (!user) return false;
    if (user.is_superadmin) return true;
    return user.permissions.includes(permissionCode);
  };

  const hasRole = (roleSlug: string): boolean => {
    if (!user) return false;
    if (user.is_superadmin) return true;
    return user.roles.some((r) => r.toLowerCase().replace(/[\s_]+/g, "-") === roleSlug.toLowerCase());
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        switchBranch,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
