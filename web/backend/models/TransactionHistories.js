const mongoose = require("mongoose");

const transactionHistorySchema = new mongoose.Schema(
  {
    wallet_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallets",
      required: true,
    },

    // Số tiền thay đổi (1 trong 2)
    amount_add: { type: Number, default: 0 },
    amount_subtract: { type: Number, default: 0 },

    description: { type: String, default: "" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Tối ưu query
transactionHistorySchema.index({ wallet_id: 1, created_at: -1 });

module.exports = mongoose.model(
  "TransactionHistories",
  transactionHistorySchema,
  "TransactionHistories"
);
