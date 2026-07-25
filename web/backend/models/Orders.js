const mongoose = require("mongoose");
const { type } = require("os");

const orderSchema = new mongoose.Schema(
    {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
        total_amount: { type: Number, required: true, default: 0 },
        status: {
            type: String,
            enum: ["pending", "paid", "cancelled", "refunded"],
            default: "pending",
        },
        order_id:{type:String},
        created_at: { type: Date, default: Date.now },
        updated_at: { type: Date, default: Date.now },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    }
);

const Orders = mongoose.model("Orders", orderSchema, "Orders");

module.exports = Orders;
