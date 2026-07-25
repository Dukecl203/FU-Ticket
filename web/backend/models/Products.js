const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    event_id: { type: mongoose.Schema.Types.ObjectId, ref: "Events", required: true },
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true, default: 0 },
    quantity_total: { type: Number, required: true, default: 0 },
    quantity_sold: { type: Number, required: true, default: 0 },
    type: {
      type: String,
      enum: ["ticket", "merchandise"],
      default: "ticket",
    },
    image_url: {
      type: String,
      default: "/images/img_default.png", // Default product/ticket image
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// ✅ Thêm index cho các trường thường được truy vấn hoặc join
productSchema.index({ type: 1 }); // để lọc nhanh theo "ticket"
productSchema.index({ event_id: 1 }); // để join nhanh sang bảng Events
productSchema.index({ price: 1 }); // nếu bạn có lọc hoặc sort theo giá

const Products = mongoose.model("Products", productSchema, "Products");
module.exports = Products;
