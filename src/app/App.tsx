import { RouterProvider } from "react-router";
import { router } from "@/app/routes.tsx";
import { AuthProvider } from "@/app/context/auth-context";
import { Toaster } from "@/app/components/ui/sonner";

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster />
    </AuthProvider>
  );
}