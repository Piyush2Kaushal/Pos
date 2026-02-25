import { Link } from "react-router";
import { AlertCircle } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export function NotFound() {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="text-center">
        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-gray-600 mb-6">Page not found</p>
        <Link to="/">
          <Button>Return to Sales</Button>
        </Link>
      </div>
    </div>
  );
}
