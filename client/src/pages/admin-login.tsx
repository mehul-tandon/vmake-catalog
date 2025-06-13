import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Eye, EyeOff } from "lucide-react";
import vmakeLogo from "@assets/339076826_1147709369229224_1319750110613322317_n.jpg";

export default function AdminLogin() {
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const loginMutation = useMutation({
    mutationFn: async (data: { whatsappNumber: string, password: string }) => {
      try {
        const response = await apiRequest("POST", "/api/auth/admin-login", data);

        // Log response details for debugging
        console.log("Admin login response:", {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });

        // Get the raw response text first
        const rawResponse = await response.text();
        console.log("Raw response:", rawResponse.substring(0, 200) + "...");

        if (!response.ok) {
          // Try to parse as JSON, but handle non-JSON responses
          try {
            const errorData = JSON.parse(rawResponse);
            throw new Error(errorData.message || "Invalid admin credentials");
          } catch (parseError) {
            console.error("Error parsing response:", parseError);
            throw new Error("Login failed. Please try again.");
          }
        }

        // Try to parse the successful response as JSON
        try {
          return JSON.parse(rawResponse);
        } catch (parseError) {
          console.error("Error parsing success response:", parseError);
          throw new Error("Unexpected server response. Please try again.");
        }
      } catch (error: any) {
        console.error("Admin login error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Admin Login Successful",
        description: "Welcome to the admin dashboard!",
      });
      setLocation("/admin");
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid admin credentials",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsappNumber.trim() || !password) {
      toast({
        title: "Missing Fields",
        description: "Please enter both WhatsApp number and password.",
        variant: "destructive",
      });
      return;
    }

    const formattedNumber = whatsappNumber.startsWith("+91")
      ? whatsappNumber
      : `+91${whatsappNumber.replace(/^0+/, "")}`;

    loginMutation.mutate({
      whatsappNumber: formattedNumber,
      password
    });
  };

  return (
    <div className="min-h-screen bg-black-primary flex items-center justify-center">
      <Card className="w-full max-w-md mx-4 bg-black-secondary border-black-accent">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gold rounded-full flex items-center justify-center overflow-hidden">
              <img
                src={vmakeLogo}
                alt="Vmake Finessee Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Admin Login</h2>
            <p className="text-gray-400">Enter your admin credentials</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="block text-sm font-medium text-gray-300 mb-2">
                Admin WhatsApp Number
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  +91
                </span>
                <Input
                  type="tel"
                  placeholder="9876543210"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="pl-12 bg-black-primary border-black-accent text-white placeholder-gray-500 search-focus"
                  disabled={loginMutation.isPending}
                />
              </div>
            </div>

            <div>
              <Label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-black-primary border-black-accent text-white placeholder-gray-500 search-focus pr-12"
                  disabled={loginMutation.isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gold transition-colors"
                  disabled={loginMutation.isPending}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-gold hover:bg-gold-light text-black-primary font-semibold"
            >
              {loginMutation.isPending ? "Logging in..." : "Login as Admin"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Only authorized administrators can access this page
            </p>
            <button
              type="button"
              onClick={() => setLocation("/")}
              className="mt-2 text-gold text-sm hover:underline"
            >
              Back to Catalogue
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}