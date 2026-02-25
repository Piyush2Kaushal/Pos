import { createContext, useContext, ReactNode } from "react";

interface User {
  id: string;
  username: string;
  name: string;
  role: "admin" | "cashier" | "manager";
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const DEFAULT_USER: User = {
  id: "1",
  username: "admin",
  name: "Admin User",
  role: "admin",
  email: "admin@bnmparts.com",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider
      value={{
        user: DEFAULT_USER,
        isAuthenticated: true,
        isLoading: false,
      }}
    >
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
