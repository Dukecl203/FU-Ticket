const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    seller_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },

    title: { type: String, required: true },
    description: { type: String },
    detail: { type: String }, // nội dung chi tiết

    start_time: { type: Date, required: true },
    end_time: { type: Date, required: true },

    location: { type: String, required: true },

    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categories",
      required: true,
    },

    status: {
      type: String,
      enum: ["draft", "pending", "approved", "closed", "ongoing", "completed"],
      default: "draft",
    },

    poster_url: { type: String },

    // 🔹 Organizer object
    organizer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },

    // 🔥 isFPT tách riêng
    isFPT: { type: Boolean, default: false },

    // 📱 Social media posts for this event
    socialMediaPosts: [{
      id: { type: String, required: true }, // Unique ID for the post
      platform: { type: String, default: "facebook" },
      content: { type: String, default: "" },
      image: { type: String, default: null },
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      views: { type: Number, default: 0 },
      postedAt: { type: Date, default: Date.now },
      status: { type: String, default: "pending" }, // pending, published
      shareUrl: { type: String },
      eventUrl: { type: String },
      facebookPostUrl: { type: String },
      realPostUrl: { type: String },
      postId: { type: String }, // Facebook post ID
      isMock: { type: Boolean, default: false },
    }],
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Index tối ưu hiệu suất
eventSchema.index({ seller_id: 1, created_at: -1 });
eventSchema.index({ status: 1, start_time: 1 });
eventSchema.index({ location: 1, start_time: 1, end_time: 1 });
eventSchema.index({ category_id: 1 });
eventSchema.index({ start_time: 1 });
eventSchema.index({ end_time: 1 });

// Pre-save hook to automatically update status based on event time
eventSchema.pre('save', function (next) {
  const now = new Date();

  // Only auto-update if event is approved and times are set
  if (this.status === 'approved' && this.start_time && this.end_time) {
    const startTime = new Date(this.start_time);
    const endTime = new Date(this.end_time);

    // If end_time has passed, set to completed
    if (endTime <= now) {
      this.status = 'completed';
    }
    // If start_time has passed but end_time hasn't, set to ongoing
    else if (startTime <= now) {
      this.status = 'ongoing';
    }
  }

  // If event is ongoing and end_time has passed, set to completed
  if (this.status === 'ongoing' && this.end_time) {
    if (new Date(this.end_time) <= now) {
      this.status = 'completed';
    }
  }

  next();
});

// Helper method to check if event is locked (cannot be edited)
eventSchema.methods.isLocked = function () {
  const now = new Date();
  // Event is locked if:
  // 1. Status is pending (waiting for approval - cannot edit)
  // 2. Status is ongoing (event has started - cannot edit)
  // 3. Status is completed (event has ended - cannot edit)
  if (this.status === 'pending' || this.status === 'ongoing' || this.status === 'completed') {
    return true;
  }
  // If approved but start_time has passed, it should be ongoing (handled by pre-save hook)
  // But we check here as a safety measure
  if (this.status === 'approved' && this.start_time && new Date(this.start_time) <= now) {
    return true;
  }
  return false;
};

module.exports = mongoose.model("Events", eventSchema, "Events");
