import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import vmakeLogo from "@assets/339076826_1147709369229224_1319750110613322317_n.jpg";

export default function WhatsAppVerification() {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const { toast } = useToast();

  const submitMutation = useMutation({
    mutationFn: async (data: { name: string; whatsappNumber: string }) => {
      const MAX_RETRIES = 2;
      let lastError;
      
      for (let i = 0; i < MAX_RETRIES; i++) {
        try {
          const response = await apiRequest("POST", "/api/auth/register", data);
          const rawResponse = await response.text();
          
          if (rawResponse.includes("require is not defined") && i < MAX_RETRIES - 1) {
            continue; // Retry
          }
          
          const clonedResponse = new Response(new Blob([rawResponse]), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });

          if (!response.ok) throw new Error(`Server error: ${response.status}`);
          return await clonedResponse.json();
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Welcome to Vmake Finessee!",
        description: "Your details have been recorded. Enjoy browsing our catalogue.",
      });
    },
    onError: (error: any) => {
      console.error("Registration error details:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name.",
        variant: "destructive",
      });
      return;
    }
    
    if (!phoneNumber.trim()) {
      toast({
        title: "Invalid Number",
        description: "Please enter a valid WhatsApp number.",
        variant: "destructive",
      });
      return;
    }

    const formattedNumber = phoneNumber.startsWith("+91") 
      ? phoneNumber 
      : `+91${phoneNumber.replace(/^0+/, "")}`;
    
    submitMutation.mutate({ 
      name: name.trim(), 
      whatsappNumber: formattedNumber 
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
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
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to Vmake Finessee</h2>
            <p className="text-gray-400">Please provide your details to continue</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="block text-sm font-medium text-gray-300 mb-2">
                Your Name
              </Label>
              <Input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-black-primary border-black-accent text-white placeholder-gray-500 search-focus"
                disabled={submitMutation.isPending}
              />
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-gray-300 mb-2">
                WhatsApp Number
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  +91
                </span>
                <Input
                  type="tel"
                  placeholder="9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="pl-12 bg-black-primary border-black-accent text-white placeholder-gray-500 search-focus"
                  disabled={submitMutation.isPending}
                />
              </div>
            </div>
            
            <Button
              type="submit"
              disabled={submitMutation.isPending}
              className="w-full bg-gold hover:bg-gold-light text-black-primary font-semibold"
            >
              {submitMutation.isPending ? "Submitting..." : "Continue to Catalogue"}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Your details are saved for our records only
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
