const mongoose = require("mongoose");
const { Schema } = mongoose;
const OrderItemSchema = new Schema({
  order_id: { type: Schema.Types.ObjectId, required: true, ref: "Orders" },
  product_id: { type: Schema.Types.ObjectId, required: true, ref: "Products" },
  quantity: { type: Number, required: true, default: 1 },
  status: {
    type: String,
    enum: ["Pending", "Scanned", "Refunded"],
    default: "Pending",
  },
  refunded_at: { type: Date }, // Added for tracking
});

module.exports = mongoose.model("OrderItem", OrderItemSchema, "OrderItems");
