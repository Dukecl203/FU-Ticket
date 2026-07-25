const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      unique: true, // 1 user có 1 ví
    },
    balance: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);


module.exports = mongoose.model("Wallets", walletSchema, "Wallets");
