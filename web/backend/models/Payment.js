const mongoose = require("mongoose");
const { Schema } = mongoose;
const PaymentSchema = new Schema({
  order_id: { type: Schema.Types.ObjectId, required: true, ref: "Orders" },
  amount: { type: Number, required: true },
  payment_method: {
    type: String,
    enum: ["MOMO", "STRIPE", "VNPAY", "FREE", "WALLET"],
    required: true,
  },
  transaction_id: { type: String }, // từ cổng thanh toán trả về
  status: {
    type: String,
    enum: ["paid", "cancelled", "refunded", "SUCCESS", "PENDING", "FAILED"],
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Payment", PaymentSchema, "Payments");
