const mongoose = require("mongoose");
const { Schema } = mongoose;
const OrderDiscountSchema = new Schema({
  order_id: { type: Schema.Types.ObjectId, required: true, ref: "Order" },
  discount_id: { type: Schema.Types.ObjectId, ref: "Discount" }, // optional: không required nữa
  applied_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("OrderDiscount", OrderDiscountSchema,"OrderDiscounts");
