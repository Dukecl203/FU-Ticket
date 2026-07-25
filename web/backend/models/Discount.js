const mongoose = require("mongoose");
const discountSchema = new mongoose.Schema(
    {
        event_id: { type: mongoose.Schema.Types.ObjectId, ref: "Events", required: true, },
        user_id: [{ type: mongoose.Schema.Types.ObjectId, ref: "Users", },],
        code: { type: String, required: true, trim: true, },
        description: { type: String, default: "", },
        percentage: { type: Number, required: true, min: 0, max: 100, },
        max_users: { type: Number, default: 0, },
        valid_from: { type: Date, required: true, },
        valid_to: { type: Date, required: true, },
        type: {
            type: String,
            enum: ["All", "Ticket", "Merch"],
            default: "All",
        },
    },
    {
        timestamps: true,
    }
);

// Create compound unique index: code must be unique within an event
// Different events can have the same discount code
discountSchema.index({ event_id: 1, code: 1 }, { unique: true });

const Discount = mongoose.model("Discount", discountSchema, "Discounts");


module.exports = Discount;

