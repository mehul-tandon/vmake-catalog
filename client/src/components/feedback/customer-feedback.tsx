import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Star, MessageSquare, Plus, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FeedbackFormData {
  customerName: string;
  customerPhone: string;
  title: string;
  message: string;
  rating: number;
}

export default function CustomerFeedback() {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [formData, setFormData] = useState<FeedbackFormData>({
    customerName: "",
    customerPhone: "",
    title: "",
    message: "",
    rating: 0
  });

  // Fetch published feedback only
  const { data: feedbackData, isLoading } = useQuery({
    queryKey: ["/api/feedback/published"],
    queryFn: () => apiRequest("GET", "/api/feedback/published")
  });

  // Ensure feedback is always an array
  const feedback = Array.isArray(feedbackData) ? feedbackData : [];

  // Submit feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: FeedbackFormData) => {
      return await apiRequest("POST", "/api/feedback", data);
    },
    onSuccess: () => {
      toast({
        title: "Thank You!",
        description: "Your feedback has been submitted successfully. It will be reviewed and published soon.",
      });
      setIsModalOpen(false);
      resetForm();
      // Don't invalidate the published query since new feedback won't be published immediately
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit feedback",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      customerName: "",
      customerPhone: "",
      title: "",
      message: "",
      rating: 0
    });
    setHoveredRating(0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a rating before submitting",
        variant: "destructive",
      });
      return;
    }
    submitFeedbackMutation.mutate(formData);
  };

  const renderStars = (rating: number, interactive = false, size = "w-5 h-5") => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`${size} cursor-pointer transition-colors ${
          i < (interactive ? (hoveredRating || formData.rating) : rating)
            ? "text-gold fill-current"
            : "text-gray-400"
        }`}
        onClick={interactive ? () => setFormData(prev => ({ ...prev, rating: i + 1 })) : undefined}
        onMouseEnter={interactive ? () => setHoveredRating(i + 1) : undefined}
        onMouseLeave={interactive ? () => setHoveredRating(0) : undefined}
      />
    ));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Customer Reviews</h2>
        <p className="text-gray-400 mb-6">
          See what our customers say about our handcrafted brass artifacts
        </p>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-gold hover:bg-gold-light text-black-primary font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Share Your Experience
        </Button>
      </div>

      {/* Feedback Display */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-black-secondary border-black-accent animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-black-accent rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-black-accent rounded w-full mb-2"></div>
                <div className="h-3 bg-black-accent rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : feedback.length === 0 ? (
        <Card className="bg-black-secondary border-black-accent">
          <CardContent className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Reviews Yet</h3>
            <p className="text-gray-400 mb-4">Be the first to share your experience!</p>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-gold hover:bg-gold-light text-black-primary font-semibold"
            >
              Write a Review
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {feedback.map((item: any) => (
            <Card key={item.id} className="bg-black-secondary border-black-accent">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gold rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-black-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{item.customerName}</h4>
                      <div className="flex items-center space-x-1">
                        {renderStars(item.rating)}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h5 className="font-semibold text-white mb-2">{item.title}</h5>
                <p className="text-gray-300 text-sm leading-relaxed">{item.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Feedback Submission Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-black-secondary border-black-accent text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Your Experience</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="customerName">Your Name</Label>
              <Input
                id="customerName"
                name="customerName"
                value={formData.customerName}
                onChange={handleInputChange}
                placeholder="Enter your name"
                className="bg-black-primary border-black-accent"
                required
              />
            </div>

            <div>
              <Label htmlFor="customerPhone">Phone Number (Optional)</Label>
              <Input
                id="customerPhone"
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleInputChange}
                placeholder="Enter your phone number"
                className="bg-black-primary border-black-accent"
              />
            </div>

            <div>
              <Label htmlFor="title">Review Title</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Give your review a title"
                className="bg-black-primary border-black-accent"
                required
              />
            </div>

            <div>
              <Label>Rating</Label>
              <div className="flex items-center space-x-1 mt-2">
                {renderStars(formData.rating, true)}
                <span className="ml-2 text-sm text-gray-400">
                  {formData.rating > 0 ? `${formData.rating}/5` : "Select rating"}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="message">Your Review</Label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Tell us about your experience..."
                className="w-full min-h-[100px] px-3 py-2 bg-black-primary border border-black-accent rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent resize-vertical"
                rows={4}
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="bg-black-primary border-black-accent text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitFeedbackMutation.isPending}
                className="bg-gold hover:bg-gold-light text-black-primary font-semibold"
              >
                {submitFeedbackMutation.isPending ? "Submitting..." : "Submit Review"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
