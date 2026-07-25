const Notification = require("../models/Notification");

const addNotification = async (userId, orderId, message, type = "GENERAL", transactionId = null, title = "Thông báo", href = null) => {
  try {
    const notification = new Notification({
      user_id: userId,
      order_id: orderId,
      transaction_id: transactionId,
      message: message,
      type: type,
      title: title,
      body: message,
      read: false,
      href: href,
    });
    await notification.save();
    console.log("✅ Notification added successfully:", {
      id: notification._id?.toString(),
      user_id: notification.user_id?.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
    });
    return notification;
  } catch (error) {
    console.error("Error adding notification:", error);
    throw error;
  }
};

module.exports = { addNotification };
