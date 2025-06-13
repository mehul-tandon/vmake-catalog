import { Router } from "express";
import { db } from "../db";
import { feedback } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import type { Feedback, InsertFeedback } from "@shared/schema";

const router = Router();

// Mock data for development
let mockFeedback: Feedback[] = [
  {
    id: 1,
    userId: 1,
    productId: 1,
    customerName: "Priya Sharma",
    customerPhone: "+919876543210",
    rating: 5,
    title: "Absolutely Beautiful Brass Ganesha!",
    message: "The craftsmanship is exceptional. The intricate details on this brass Ganesha idol are stunning. It's become the centerpiece of our home temple. Highly recommend Vmake Finessee for authentic handcrafted pieces.",
    isApproved: true,
    isPublished: true,
    adminNotes: "Excellent feedback, customer very satisfied",
    createdAt: new Date("2024-05-15"),
    updatedAt: new Date("2024-05-15"),
  },
  {
    id: 2,
    userId: 2,
    productId: 2,
    customerName: "Rajesh Kumar",
    customerPhone: "+919123456789",
    rating: 4,
    title: "Great Quality Home Decor",
    message: "Ordered a decorative brass bowl for our living room. The quality is excellent and the finish is perfect. Delivery was prompt. Will definitely order more items.",
    isApproved: false,
    isPublished: false,
    adminNotes: null,
    createdAt: new Date("2024-05-20"),
    updatedAt: new Date("2024-05-20"),
  },
  {
    id: 3,
    userId: 3,
    productId: 1,
    customerName: "Meera Patel",
    customerPhone: "+919988776655",
    rating: 5,
    title: "Perfect for Diwali Decoration",
    message: "Bought this for Diwali and it was perfect! The brass work is authentic and the size is just right. My guests complimented the beautiful piece. Thank you Vmake Finessee!",
    isApproved: true,
    isPublished: true,
    adminNotes: "Good feedback, consider publishing",
    createdAt: new Date("2024-05-25"),
    updatedAt: new Date("2024-05-25"),
  },
  {
    id: 4,
    userId: 4,
    productId: 3,
    customerName: "Anita Singh",
    customerPhone: "+919876543211",
    rating: 4,
    title: "Beautiful Craftsmanship",
    message: "The attention to detail in this brass piece is remarkable. It adds such elegance to our home. The packaging was also excellent. Highly recommended!",
    isApproved: true,
    isPublished: true,
    adminNotes: "Great customer satisfaction",
    createdAt: new Date("2024-05-28"),
    updatedAt: new Date("2024-05-28"),
  },
  {
    id: 5,
    userId: 5,
    productId: 2,
    customerName: "Vikram Joshi",
    customerPhone: "+919123456788",
    rating: 5,
    title: "Exceeded Expectations",
    message: "The quality is outstanding! This brass artifact is even more beautiful in person. The finish is perfect and it arrived safely. Will definitely be a repeat customer.",
    isApproved: true,
    isPublished: true,
    adminNotes: "Excellent review",
    createdAt: new Date("2024-05-30"),
    updatedAt: new Date("2024-05-30"),
  },
];

// Get all feedback (admin only)
router.get("/", async (req, res) => {
  try {
    // For development, return mock data
    if (process.env.NODE_ENV === 'development') {
      return res.json(mockFeedback);
    }

    const allFeedback = await db.select().from(feedback).orderBy(desc(feedback.createdAt));
    res.json(allFeedback);
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

// Get published feedback (public)
router.get("/published", async (req, res) => {
  try {
    // For development, return mock data
    if (process.env.NODE_ENV === 'development') {
      const publishedFeedback = mockFeedback.filter(f => f.isPublished);
      return res.json(publishedFeedback);
    }

    const publishedFeedback = await db
      .select()
      .from(feedback)
      .where(and(eq(feedback.isApproved, true), eq(feedback.isPublished, true)))
      .orderBy(desc(feedback.createdAt));

    res.json(publishedFeedback);
  } catch (error) {
    console.error("Error fetching published feedback:", error);
    res.status(500).json({ error: "Failed to fetch published feedback" });
  }
});

// Create new feedback
router.post("/", async (req, res) => {
  try {
    const feedbackData: InsertFeedback = req.body;

    // For development, add to mock data
    if (process.env.NODE_ENV === 'development') {
      const newFeedback: Feedback = {
        ...feedbackData,
        id: mockFeedback.length + 1,
        isApproved: false,
        isPublished: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockFeedback.push(newFeedback);
      return res.status(201).json(newFeedback);
    }

    const [newFeedback] = await db
      .insert(feedback)
      .values(feedbackData)
      .returning();

    res.status(201).json(newFeedback);
  } catch (error) {
    console.error("Error creating feedback:", error);
    res.status(500).json({ error: "Failed to create feedback" });
  }
});

// Update feedback (admin only)
router.put("/:id", async (req, res) => {
  try {
    const feedbackId = parseInt(req.params.id);
    const updates = req.body;

    // For development, update mock data
    if (process.env.NODE_ENV === 'development') {
      const index = mockFeedback.findIndex(f => f.id === feedbackId);
      if (index === -1) {
        return res.status(404).json({ error: "Feedback not found" });
      }

      mockFeedback[index] = {
        ...mockFeedback[index],
        ...updates,
        updatedAt: new Date(),
      };

      return res.json(mockFeedback[index]);
    }

    const [updatedFeedback] = await db
      .update(feedback)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(feedback.id, feedbackId))
      .returning();

    if (!updatedFeedback) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    res.json(updatedFeedback);
  } catch (error) {
    console.error("Error updating feedback:", error);
    res.status(500).json({ error: "Failed to update feedback" });
  }
});

// Delete feedback (admin only)
router.delete("/:id", async (req, res) => {
  try {
    const feedbackId = parseInt(req.params.id);

    // For development, remove from mock data
    if (process.env.NODE_ENV === 'development') {
      const index = mockFeedback.findIndex(f => f.id === feedbackId);
      if (index === -1) {
        return res.status(404).json({ error: "Feedback not found" });
      }

      mockFeedback.splice(index, 1);
      return res.json({ message: "Feedback deleted successfully" });
    }

    const [deletedFeedback] = await db
      .delete(feedback)
      .where(eq(feedback.id, feedbackId))
      .returning();

    if (!deletedFeedback) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    res.json({ message: "Feedback deleted successfully" });
  } catch (error) {
    console.error("Error deleting feedback:", error);
    res.status(500).json({ error: "Failed to delete feedback" });
  }
});

export default router;
