import { MessageCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContactSection() {
  const handleWhatsAppClick = () => {
    window.open("https://api.whatsapp.com/send?phone=918882636296", "_blank");
  };

  const handleFeedbackClick = () => {
    window.open("https://g.co/kgs/evVbwcC", "_blank");
  };

  return (
    <div className="mt-16 pt-16 border-t border-black-accent">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">Get in Touch</h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Have questions about our products or want to share your experience? We'd love to hear from you!
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 justify-center items-center max-w-2xl mx-auto">
        {/* WhatsApp Button */}
        <Button
          onClick={handleWhatsAppClick}
          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-8 rounded-lg transition-all duration-300 hover:scale-105 shadow-lg"
          size="lg"
        >
          <MessageCircle className="w-6 h-6 mr-3" />
          Chat on WhatsApp
        </Button>

        {/* Feedback Button */}
        <Button
          onClick={handleFeedbackClick}
          className="w-full sm:w-auto bg-gold hover:bg-gold-light text-black-primary font-semibold py-4 px-8 rounded-lg transition-all duration-300 hover:scale-105 shadow-lg"
          size="lg"
        >
          <Star className="w-6 h-6 mr-3" />
          Share Your Experience
        </Button>
      </div>

      <div className="text-center mt-8">
        <p className="text-gray-500 text-sm">
          We typically respond within a few hours during business hours
        </p>
      </div>
    </div>
  );
}
