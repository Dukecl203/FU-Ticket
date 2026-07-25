const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Orders",
  },
  transaction_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TransactionHistories",
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["WALLET_TOPUP", "TICKET_PURCHASE", "WALLET_WITHDRAW", "ORDER", "GENERAL"],
    default: "GENERAL",
  },
  status: {
    type: String,
    enum: ["READ", "UNREAD"],
    default: "UNREAD",
  },
  title: {
    type: String,
    default: "Thông báo",
  },
  body: {
    type: String,
  },
  read: {
    type: Boolean,
    default: false,
  },
  href: {
    type: String,
    default: null,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Tối ưu query
notificationSchema.index({ user_id: 1, created_at: -1 });

const Notification = mongoose.model("Notification", notificationSchema, "Notifications");

module.exports = Notification;