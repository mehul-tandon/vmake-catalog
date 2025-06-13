import { useState } from "react";
import Navigation from "@/components/layout/navigation";
import AdminPanel from "@/components/admin/admin-panel";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function Admin() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-black-primary">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="w-full max-w-md mx-4 bg-black-secondary border-black-accent">
            <CardContent className="pt-6">
              <div className="flex mb-4 gap-2">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <h1 className="text-2xl font-bold text-white">Access Denied</h1>
              </div>
              <p className="mt-4 text-sm text-gray-400">
                You need admin privileges to access this page.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black-primary">
      <Navigation />
      <AdminPanel />
    </div>
  );
}
