import { Navigate } from "react-router";
import { useAuth } from "@/app/context/auth-context";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}