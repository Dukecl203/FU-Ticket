const Event = require("../models/Events");
const Product = require("../models/Products");
const Order = require("../models/Orders");
const OrderItem = require("../models/OrderItems");
const Payment = require("../models/Payment");
const Discount = require("../models/Discount");
const OrderDiscount = require("../models/OrderDiscount");
const User = require("../models/Users");
const Wallets = require("../models/Wallets");
const TransactionHistory = require("../models/TransactionHistories");
const { addNotification } = require("./notificationController");
const {
  sendPublishRequestNotification,
  sendEventRejectionNotification,
  sendEventApprovalNotification,
  sendEventUpdateNotificationToParticipants,
  sendEventReapprovalNotificationToParticipants,
  sendEventClosedNotification,
  testEmailSending,
} = require("../services/emailService");
const {
  uploadBase64Image,
  isBase64Image,
  isCloudinaryUrl,
  processHtmlImages,
} = require("../config/cloudinary");

const getDisplayStatus = (event) => {
  const now = new Date();
  if (event.status === "pending") return "Pending";
  if (event.status === "draft") return "Draft";
  if (event.status === "approved") {
    // For approved events, show more specific status based on time
    if (event.start_time && event.end_time) {
      if (new Date(event.start_time) > now) return "Upcoming";
      if (new Date(event.start_time) <= now && new Date(event.end_time) >= now)
        return "Ongoing";
      if (new Date(event.end_time) < now) return "Completed";
    }
    return "Approved";
  }
  if (event.status === "ongoing") return "Ongoing";
  if (event.status === "completed") return "Completed";
  if (event.status === "closed") return "Closed";
  return "Unknown";
};

const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find({ status: { $ne: "draft" } })
      .populate("category_id", "name description")
      .populate("seller_id", "full_name email -_id");
    const mapped = events.map((e) => ({
      ...e.toObject(),
      display_status: getDisplayStatus(e),
    }));
    return res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id)
      .populate("category_id", "name description")
      .populate("seller_id", "full_name email");
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }
    return res.status(200).json({
      success: true,
      data: { ...event.toObject(), display_status: getDisplayStatus(event) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      detail,
      start_time,
      end_time,
      location,
      category_id,
      status,
      poster_url,
      seller_id,
      organizer,
      isFPT,
    } = req.body;

    // ✅ Validate: End time must be after start time
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message:
          "Thời gian kết thúc phải sau thời gian bắt đầu / End time must be after start time",
      });
    }

    // Validate that event has at least 1 minute duration
    const durationMinutes = (endDate - startDate) / (1000 * 60);
    if (durationMinutes < 1) {
      return res.status(400).json({
        success: false,
        message:
          "Sự kiện phải có thời lượng ít nhất 1 phút / Event must have at least 1 minute duration",
      });
    }

    // ✅ Validate: Check database for conflicting events at same time and location
    // CHỈ kiểm tra với sự kiện đã approved (không kiểm tra pending)
    console.log(
      `🔍 Checking for conflicts at "${location}" from ${new Date(
        start_time
      ).toLocaleString()} to ${new Date(end_time).toLocaleString()}`
    );

    const conflictingEvent = await Event.findOne({
      location: location,
      $or: [
        // Case 1: New event starts during existing event
        {
          start_time: { $lte: new Date(start_time) },
          end_time: { $gte: new Date(start_time) },
        },
        // Case 2: New event ends during existing event
        {
          start_time: { $lte: new Date(end_time) },
          end_time: { $gte: new Date(end_time) },
        },
        // Case 3: New event completely contains existing event
        {
          start_time: { $gte: new Date(start_time) },
          end_time: { $lte: new Date(end_time) },
        },
      ],
      status: { $in: ["approved"] }, // CHỈ kiểm tra sự kiện đã approved
    });

    if (conflictingEvent) {
      console.log(
        `❌ Conflict found: ${conflictingEvent.title} (${conflictingEvent.status})`
      );
      return res.status(400).json({
        success: false,
        message: `Địa điểm "${location}" đã có sự kiện khác vào thời gian này: "${
          conflictingEvent.title
        }" (${new Date(
          conflictingEvent.start_time
        ).toLocaleString()} - ${new Date(
          conflictingEvent.end_time
        ).toLocaleString()})`,
      });
    }

    console.log(`✅ No conflicts found - creating event`);

    // 🖼️ Auto-upload base64 images to Cloudinary
    let finalPosterUrl = poster_url;
    if (poster_url && isBase64Image(poster_url)) {
      console.log(`📤 Uploading base64 image to Cloudinary...`);
      try {
        finalPosterUrl = await uploadBase64Image(poster_url, "events");
        console.log(`✅ Image uploaded: ${finalPosterUrl}`);
      } catch (error) {
        console.error(
          `⚠️  Cloudinary upload failed, using base64 fallback:`,
          error.message
        );
        // Keep base64 if Cloudinary fails (graceful degradation)
      }
    }

    // 🖼️ Process detail HTML and convert base64 images to Cloudinary URLs
    let processedDetail = detail || "";
    if (processedDetail) {
      try {
        processedDetail = await processHtmlImages(
          processedDetail,
          "events/detail"
        );
        console.log(`✅ Processed detail HTML images`);
      } catch (error) {
        console.error(`⚠️  Failed to process detail images:`, error.message);
        // Keep original detail if processing fails
      }
    }

    const newEvent = new Event({
      title,
      description,
      detail: processedDetail,
      start_time,
      end_time,
      location,
      category_id,
      status: status || "draft",
      poster_url: finalPosterUrl,
      seller_id,
      organizer: organizer || {},
      isFPT: isFPT || false,
    });
    await newEvent.save();

    // No email notification for new events - they are created as draft
    console.log(
      `📝 New event created with draft status: ${newEvent.title} (ID: ${newEvent._id})`
    );

    return res.status(201).json({
      success: true,
      data: {
        ...newEvent.toObject(),
        display_status: getDisplayStatus(newEvent),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, location, start_time, end_time, rejection_reason } =
      req.body;

    // Get the current event to check previous status
    const currentEvent = await Event.findById(id).populate(
      "seller_id",
      "full_name email"
    );

    if (!currentEvent) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    const previousStatus = currentEvent.status;

    // 📊 Store original event data for change tracking (before any updates)
    // This is needed to track changes from the original approved version to final approved version
    const originalEventData = JSON.parse(
      JSON.stringify({
        title: currentEvent.title,
        description: currentEvent.description,
        location: currentEvent.location,
        start_time: currentEvent.start_time,
        end_time: currentEvent.end_time,
        organizer: currentEvent.organizer
          ? {
              name: currentEvent.organizer.name,
              email: currentEvent.organizer.email,
              phone: currentEvent.organizer.phone,
            }
          : null,
      })
    );

    // 🚫 Force close restriction: Admin can only force close events with "approved" status
    if (status === "closed") {
      if (previousStatus !== "approved") {
        return res.status(400).json({
          success: false,
          message: `Không thể đóng sự kiện. Chỉ có thể đóng sự kiện có trạng thái "approved" (đã duyệt). Trạng thái hiện tại: ${previousStatus}`,
        });
      }
    }

    // 🔒 Check if event is locked (cannot be edited)
    // Event is locked if status is pending, ongoing, or completed
    const now = new Date();
    const isLocked =
      currentEvent.status === "closed" ||
      currentEvent.status === "ongoing" ||
      currentEvent.status === "completed" ||
      (currentEvent.status === "approved" &&
        currentEvent.start_time &&
        new Date(currentEvent.start_time) <= now);

    if (isLocked) {
      return res.status(403).json({
        success: false,
        message:
          "Sự kiện này đã bị khóa và không thể chỉnh sửa. Trạng thái: " +
          (currentEvent.status === "closed"
            ? "Đã đóng"
            : currentEvent.status === "ongoing"
            ? "Đang diễn ra"
            : currentEvent.status === "completed"
            ? "Đã kết thúc"
            : currentEvent.status === "approved"
            ? "Đã bắt đầu"
            : currentEvent.status),
      });
    }

    // ✅ Validate: End time must be after start time (if times are being updated)
    if (start_time || end_time) {
      const startDate = new Date(start_time || currentEvent.start_time);
      const endDate = new Date(end_time || currentEvent.end_time);

      if (endDate <= startDate) {
        return res.status(400).json({
          success: false,
          message:
            "Thời gian kết thúc phải sau thời gian bắt đầu / End time must be after start time",
        });
      }

      // Validate that event has at least 1 minute duration
      const durationMinutes = (endDate - startDate) / (1000 * 60);
      if (durationMinutes < 1) {
        return res.status(400).json({
          success: false,
          message:
            "Sự kiện phải có thời lượng ít nhất 1 phút / Event must have at least 1 minute duration",
        });
      }
    }

    // 📊 Track changes for notification purposes
    const trackChanges = (oldEvent, newData) => {
      const changes = [];

      if (newData.title && newData.title !== oldEvent.title) {
        changes.push({
          field: "Tiêu đề",
          description: `Từ "${oldEvent.title}" thành "${newData.title}"`,
        });
      }

      if (newData.description && newData.description !== oldEvent.description) {
        changes.push({
          field: "Mô tả",
          description: "Đã được cập nhật",
        });
      }

      if (newData.location && newData.location !== oldEvent.location) {
        changes.push({
          field: "Địa điểm",
          description: `Từ "${oldEvent.location}" thành "${newData.location}"`,
        });
      }

      if (
        newData.start_time &&
        new Date(newData.start_time).getTime() !==
          new Date(oldEvent.start_time).getTime()
      ) {
        changes.push({
          field: "Thời gian bắt đầu",
          description: `Từ "${new Date(oldEvent.start_time).toLocaleString(
            "vi-VN"
          )}" thành "${new Date(newData.start_time).toLocaleString("vi-VN")}"`,
        });
      }

      if (
        newData.end_time &&
        new Date(newData.end_time).getTime() !==
          new Date(oldEvent.end_time).getTime()
      ) {
        changes.push({
          field: "Thời gian kết thúc",
          description: `Từ "${new Date(oldEvent.end_time).toLocaleString(
            "vi-VN"
          )}" thành "${new Date(newData.end_time).toLocaleString("vi-VN")}"`,
        });
      }

      if (newData.organizer) {
        if (
          newData.organizer.name &&
          newData.organizer.name !== oldEvent.organizer?.name
        ) {
          changes.push({
            field: "Tên người tổ chức",
            description: `Từ "${oldEvent.organizer?.name || "N/A"}" thành "${
              newData.organizer.name
            }"`,
          });
        }
        if (
          newData.organizer.email &&
          newData.organizer.email !== oldEvent.organizer?.email
        ) {
          changes.push({
            field: "Email người tổ chức",
            description: `Từ "${oldEvent.organizer?.email || "N/A"}" thành "${
              newData.organizer.email
            }"`,
          });
        }
        if (
          newData.organizer.phone &&
          newData.organizer.phone !== oldEvent.organizer?.phone
        ) {
          changes.push({
            field: "Số điện thoại người tổ chức",
            description: `Từ "${oldEvent.organizer?.phone || "N/A"}" thành "${
              newData.organizer.phone
            }"`,
          });
        }
      }

      return changes;
    };

    const updateData = { ...req.body };
    const trackedChanges = trackChanges(currentEvent, updateData);

    // 🔄 Rejection action: Admin rejects event, set status back to draft
    if (status === "rejected") {
      updateData.status = "draft";
      console.log(
        `🔄 Rejection action: Setting status to draft for event ${id}`
      );
    }

    // 🚫 Prevent status changes to ongoing or completed (these are auto-set by pre-save hook)
    if (status === "ongoing" || status === "completed") {
      delete updateData.status;
      console.log(
        `⚠️ Cannot manually set status to ${status}, it's auto-managed`
      );
    }

    // 📝 If organizer edits an approved event (before it starts), set back to pending for re-approval
    // Only if status is not being explicitly set by admin
    let shouldNotifyParticipantsOnUpdate = false;
    if (!status && previousStatus === "approved" && currentEvent.start_time) {
      const now = new Date();
      const startTime = new Date(currentEvent.start_time);
      // If event hasn't started yet and organizer is making changes, require re-approval
      if (startTime > now) {
        updateData.status = "pending";
        shouldNotifyParticipantsOnUpdate = true; // Set flag to notify participants
        console.log(
          `📝 Approved event edited before start time, setting to pending for re-approval`
        );
      }
    }

    // Kiểm tra xung đột khi admin duyệt sự kiện (status = "approved")
    if (status === "approved") {
      const checkLocation = location || currentEvent.location;
      const checkStartTime = start_time || currentEvent.start_time;
      const checkEndTime = end_time || currentEvent.end_time;

      // Nếu không phải sự kiện online, kiểm tra xung đột
      if (
        !checkLocation.toLowerCase().includes("online") &&
        !checkLocation.toLowerCase().includes("trực tuyến")
      ) {
        console.log(
          `🔍 Checking for conflicts during approval at "${checkLocation}"`
        );

        const conflictingEvent = await Event.findOne({
          _id: { $ne: id }, // Exclude current event
          location: checkLocation,
          $or: [
            {
              start_time: { $lte: new Date(checkStartTime) },
              end_time: { $gte: new Date(checkStartTime) },
            },
            {
              start_time: { $lte: new Date(checkEndTime) },
              end_time: { $gte: new Date(checkEndTime) },
            },
            {
              start_time: { $gte: new Date(checkStartTime) },
              end_time: { $lte: new Date(checkEndTime) },
            },
          ],
          status: { $in: ["approved"] }, // CHỈ kiểm tra với sự kiện đã approved
        });

        if (conflictingEvent) {
          console.log(
            `❌ Conflict found during approval: ${conflictingEvent.title} (${conflictingEvent.status})`
          );
          return res.status(400).json({
            success: false,
            message: `Không thể duyệt sự kiện: Địa điểm "${checkLocation}" đã có sự kiện khác vào thời gian này: "${
              conflictingEvent.title
            }" (${new Date(
              conflictingEvent.start_time
            ).toLocaleString()} - ${new Date(
              conflictingEvent.end_time
            ).toLocaleString()})`,
          });
        }
      }
    }

    // 🖼️ Auto-upload base64 images to Cloudinary if poster_url is being updated
    if (updateData.poster_url && isBase64Image(updateData.poster_url)) {
      console.log(`📤 Uploading base64 image to Cloudinary...`);
      try {
        updateData.poster_url = await uploadBase64Image(
          updateData.poster_url,
          "events"
        );
        console.log(`✅ Image uploaded: ${updateData.poster_url}`);
      } catch (error) {
        console.error(
          `⚠️  Cloudinary upload failed, using base64 fallback:`,
          error.message
        );
        // Keep base64 if Cloudinary fails
      }
    }

    // 🖼️ Process detail HTML and convert base64 images to Cloudinary URLs if detail is being updated
    if (updateData.detail) {
      try {
        updateData.detail = await processHtmlImages(
          updateData.detail,
          "events/detail"
        );
        console.log(`✅ Processed detail HTML images`);
      } catch (error) {
        console.error(`⚠️  Failed to process detail images:`, error.message);
        // Keep original detail if processing fails
      }
    }

    // Rest of the update logic...
    const updatedEvent = await Event.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .populate("category_id", "name description")
      .populate("seller_id", "full_name email");

    if (!updatedEvent) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    // 📊 Calculate final changes from original event version to updated version
    // This captures all changes made during this update cycle
    const finalChanges = trackChanges(
      originalEventData,
      updatedEvent.toObject()
    );

    // 🔔 Emit socket event if status changed
    if (updatedEvent.status !== previousStatus) {
      try {
        const io = req.app.get("io");
        if (io) {
          io.emit("event_status_changed", {
            eventId: updatedEvent._id.toString(),
            eventTitle: updatedEvent.title,
            oldStatus: previousStatus,
            newStatus: updatedEvent.status,
            timestamp: new Date().toISOString(),
            message: `Sự kiện "${updatedEvent.title}" đã thay đổi trạng thái từ ${previousStatus} sang ${updatedEvent.status}`,
          });

          // Also emit to specific event room
          io.to(`event_${updatedEvent._id}`).emit("event_status_update", {
            eventId: updatedEvent._id.toString(),
            status: updatedEvent.status,
            message: `Trạng thái đã thay đổi: ${updatedEvent.status}`,
          });

          console.log(
            `📡 Socket event emitted: ${updatedEvent.title} - ${previousStatus} -> ${updatedEvent.status}`
          );
        }
      } catch (socketError) {
        console.error("Failed to emit socket event:", socketError);
        // Don't fail the request if socket emit fails
      }
    }

    // Email notification logic...
    if (status === "pending" && previousStatus !== "pending") {
      try {
        const organizerName =
          currentEvent.seller_id?.full_name || "Người tổ chức";
        console.log(
          `📧 Event status set to pending for: ${currentEvent.title} (ID: ${currentEvent._id})`
        );

        const emailResult = await sendPublishRequestNotification(
          currentEvent.title,
          currentEvent._id,
          organizerName
        );

        if (emailResult.success) {
          console.log(
            `📧 Email notification sent for event: ${currentEvent.title}`
          );
        } else {
          console.log(`⚠️ Email notification failed: ${emailResult.message}`);
        }
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
      }
    }

    // Send approval notification
    if (status === "approved" && previousStatus !== "approved") {
      try {
        console.log(
          `📧 Sending approval email for event: ${currentEvent.title}`
        );
        const emailResult = await sendEventApprovalNotification(id);
        if (emailResult.success) {
          console.log(
            `✅ Approval email sent for event: ${currentEvent.title}`
          );
        } else {
          console.log(`❌ Approval email failed: ${emailResult.message}`);
        }

        // 📧 If this is a re-approval (was pending, now approved) and event has participants, notify them
        // This happens when admin approves an event that was previously approved but organizer edited it
        if (previousStatus === "pending") {
          const { getEventParticipants } = require("../services/emailService");
          const participants = await getEventParticipants(id);

          // Send re-approval notification if event has participants
          if (participants.length > 0) {
            // Use finalChanges if available, otherwise use trackedChanges, or empty array for generic update
            const changesToNotify =
              finalChanges.length > 0 ? finalChanges : trackedChanges;

            console.log(
              `📧 Event has ${participants.length} participants, sending re-approval notification`
            );
            try {
              const reapprovalResult =
                await sendEventReapprovalNotificationToParticipants(
                  id,
                  changesToNotify
                );
              if (reapprovalResult.success) {
                console.log(
                  `✅ Re-approval notification sent to ${reapprovalResult.sentTo}/${reapprovalResult.total} participants`
                );
              } else {
                console.log(
                  `❌ Re-approval notification failed: ${reapprovalResult.message}`
                );
              }
            } catch (reapprovalError) {
              console.error(
                "Failed to send re-approval notification to participants:",
                reapprovalError
              );
            }
          }
        }

        // 🔄 If event start_time has already passed, immediately check and update status
        const now = new Date();
        if (
          updatedEvent.start_time &&
          new Date(updatedEvent.start_time) <= now
        ) {
          const {
            checkAndUpdateEventStatuses,
          } = require("../services/eventStatusMonitor");
          const io = req.app.get("io");
          if (io) {
            // Trigger immediate status check for this specific event
            setTimeout(() => {
              checkAndUpdateEventStatuses(io);
            }, 1000); // Check after 1 second to ensure event is saved
          }
        }
      } catch (emailError) {
        console.error("Failed to send approval email:", emailError);
      }
    }

    // 📧 Notify participants when organizer updates approved event (before it starts)
    // This happens when organizer edits an approved event and it gets set to pending
    if (shouldNotifyParticipantsOnUpdate) {
      try {
        // Check if event has participants before sending notification
        const { getEventParticipants } = require("../services/emailService");
        const participants = await getEventParticipants(id);

        if (participants.length > 0) {
          // Use trackedChanges if available, otherwise send generic update
          const changesToNotify =
            trackedChanges.length > 0 ? trackedChanges : [];
          console.log(
            `📧 Sending update notification to ${participants.length} participants for event: ${currentEvent.title}`
          );
          const updateResult = await sendEventUpdateNotificationToParticipants(
            id,
            changesToNotify
          );
          if (updateResult.success) {
            console.log(
              `✅ Update notification sent to ${updateResult.sentTo}/${updateResult.total} participants`
            );
          } else {
            console.log(
              `❌ Update notification failed: ${updateResult.message}`
            );
          }
        } else {
          console.log(
            `⚠️ No participants found for event, skipping update notification`
          );
        }
      } catch (updateError) {
        console.error(
          "Failed to send update notification to participants:",
          updateError
        );
      }
    }

    // 🆕 Gửi thông báo REJECTION với thông tin sự kiện đã được chuyển về draft
    if (status === "rejected" && previousStatus !== "rejected") {
      try {
        console.log(
          `📧 Sending rejection email for event: ${currentEvent.title}`
        );
        const emailResult = await sendEventRejectionNotification(
          id,
          rejection_reason,
          "rejected",
          true // Flag để biết sự kiện đã được chuyển về draft
        );
        if (emailResult.success) {
          console.log(
            `✅ Rejection email sent for event: ${currentEvent.title}`
          );
        } else {
          console.log(`❌ Rejection email failed: ${emailResult.message}`);
        }
      } catch (emailError) {
        console.error("Failed to send rejection email:", emailError);
      }
    }

    if (status === "closed" && previousStatus !== "closed") {
      try {
        console.log(`📧 Sending closed email for event: ${currentEvent.title}`);
        const emailResult = await sendEventClosedNotification(
          id,
          rejection_reason // Sử dụng rejection_reason làm lý do đóng
        );
        if (emailResult.success) {
          console.log(`✅ Closed email sent for event: ${currentEvent.title}`);
        } else {
          console.log(`❌ Closed email failed: ${emailResult.message}`);
        }

        // 🆕 GỬI EMAIL CHO NGƯỜI ĐÃ MUA HÀNG KHI SỰ KIỆN BỊ CLOSED
        try {
          const {
            sendEventClosedNotificationToParticipants,
          } = require("../services/emailService");
          console.log(
            `📧 Sending closed notification to participants for event: ${currentEvent.title}`
          );

          const participantResult =
            await sendEventClosedNotificationToParticipants(
              id,
              rejection_reason
            );

          if (participantResult.success) {
            console.log(
              `✅ Closed notification sent to ${participantResult.sentTo}/${participantResult.total} participants`
            );
          } else {
            console.log(
              `❌ Closed notification to participants failed: ${participantResult.message}`
            );
          }
        } catch (participantError) {
          console.error(
            "Failed to send closed notification to participants:",
            participantError
          );
          // Không fail request nếu gửi email cho participants thất bại
        }

        // 🆕 HOÀN TIỀN TỰ ĐỘNG CHO NGƯỜI MUA HÀNG
        try {
          console.log(
            `💰 Starting automatic refund for event: ${currentEvent.title}`
          );
          const refundResult = await processAutomaticRefundForEvent(id, req);
          if (refundResult.success) {
            console.log(
              `✅ Automatic refund completed: ${refundResult.refundedCount}/${refundResult.totalCount} orders refunded`
            );

            // Gửi thông báo cho admin về kết quả hoàn tiền
            if (refundResult.refundedCount > 0) {
              console.log(
                `📊 Refund summary: Total amount refunded: ${refundResult.totalAmount.toLocaleString()} VNĐ`
              );
            }
          } else {
            console.log(`❌ Automatic refund failed: ${refundResult.message}`);
          }
        } catch (refundError) {
          console.error("Failed to process automatic refund:", refundError);
          // Không fail request nếu hoàn tiền thất bại, nhưng log lỗi để theo dõi
        }
      } catch (emailError) {
        console.error("Failed to send closed email:", emailError);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        ...updatedEvent.toObject(),
        display_status: getDisplayStatus(updatedEvent),
      },
      message:
        status === "rejected"
          ? "Sự kiện đã bị từ chối và chuyển về bản nháp. Người tổ chức có thể cập nhật thông tin và gửi lại yêu cầu phê duyệt."
          : updateData.status === "pending" && previousStatus === "approved"
          ? "Sự kiện đã được chỉnh sửa và cần được phê duyệt lại."
          : "Cập nhật sự kiện thành công",
    });
  } catch (error) {
    console.error("Error in updateEvent:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedEvent = await Event.findByIdAndDelete(id);
    if (!deletedEvent) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }
    return res
      .status(200)
      .json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getEventsByMode = async (req, res) => {
  try {
    const { mode } = req.query;
    const now = new Date();
    let startPeriod, endPeriod;
    if (mode === "week") {
      startPeriod = new Date(now);
      startPeriod.setHours(0, 0, 0, 0);
      endPeriod = new Date(startPeriod);
      endPeriod.setDate(startPeriod.getDate() + 7);
      endPeriod.setHours(23, 59, 59, 999);
    } else if (mode === "month") {
      startPeriod = new Date(now.getFullYear(), now.getMonth(), 1);
      endPeriod = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid mode. Use 'week' or 'month'.",
      });
    }
    const events = await Event.find({
      start_time: { $gte: startPeriod, $lte: endPeriod },
    })
      .populate("category_id", "name")
      .populate("seller_id", "full_name email");
    const mapped = events.map((e) => ({
      ...e.toObject(),
      display_status: getDisplayStatus(e),
    }));
    res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    console.error("Error in getEventsByMode:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getEventsByCategory = async (req, res) => {
  try {
    const { category } = req.query;
    if (!category) {
      return res
        .status(400)
        .json({ success: false, message: "Missing category parameter" });
    }
    const events = await Event.find()
      .populate("category_id", "name")
      .populate("seller_id", "full_name email");
    let filtered = events;
    if (category !== "All") {
      filtered = events.filter(
        (e) =>
          e.category_id?.name &&
          e.category_id.name.toLowerCase() === category.toLowerCase()
      );
    }
    const mapped = filtered.map((e) => ({
      ...e.toObject(),
      display_status: getDisplayStatus(e),
    }));
    res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    console.error("Error in getEventsByCategory:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getEventsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50, status, excludeStatus } = req.query; // Add pagination params and excludeStatus

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing userId parameter" });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = { seller_id: userId };
    if (status) {
      query.status = status;
    } else if (excludeStatus) {
      // Exclude specific status (e.g., draft events for report management)
      query.status = { $ne: excludeStatus };
    }

    console.log(
      `📊 getEventsByUserId - Page ${page}, Limit ${limit}, Query:`,
      JSON.stringify(query)
    );

    // Execute paginated query - ONLY fetch what's needed!
    // ✅ After Cloudinary migration, poster_url is now lightweight (just URLs, not base64)
    const [events, totalCount] = await Promise.all([
      Event.find(query)
        .select(
          "title start_time end_time location category_id status poster_url created_at"
        )
        .populate("category_id", "name")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Event.countDocuments(query),
    ]);

    const mapped = events.map((e) => ({
      ...e,
      display_status: getDisplayStatus(e),
    }));

    console.log(
      `📊 getEventsByUserId - Returning ${events.length} events, Total count: ${totalCount}`
    );

    return res.status(200).json({
      success: true,
      data: mapped,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error in getEventsByUserId:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Event report with comprehensive data including payments and discounts
const getEventReport = async (req, res) => {
  try {
    const eventId = req.params.id;

    // Get event details
    const event = await Event.findById(eventId)
      .populate("seller_id", "full_name email")
      .populate("category_id", "name");

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    // Get all products for this event
    const products = await Product.find({ event_id: eventId }).select(
      "_id name price type quantity_total quantity_sold"
    );
    const productIdList = products.map((p) => p._id);

    if (productIdList.length === 0) {
      return res.json({
        success: true,
        event,
        products,
        orders: [],
        payments: [],
        discounts: [],
        stats: {
          totalOrders: 0,
          totalItems: 0,
          totalRevenuePaid: 0,
          totalRevenuePending: 0,
          quantityByType: { ticket: 0, merchandise: 0 },
          paymentMethods: {},
          discountUsage: 0,
          discountSavings: 0,
          totalDiscounts: 0,
        },
      });
    }

    // Get all payments for orders that contain products from this event
    // First, get all order items for this event's products
    const orderItems = await OrderItem.find({
      product_id: { $in: productIdList },
    })
      .populate({ path: "product_id", select: "name type price" })
      .lean();

    if (orderItems.length === 0) {
      return res.json({
        success: true,
        event,
        products,
        orders: [],
        payments: [],
        discounts: [],
        stats: {
          totalOrders: 0,
          totalItems: 0,
          totalRevenuePaid: 0,
          totalRevenuePending: 0,
          quantityByType: { ticket: 0, merchandise: 0 },
          paymentMethods: {},
          discountUsage: 0,
          discountSavings: 0,
          totalDiscounts: 0,
        },
      });
    }

    // Get unique order IDs from order items
    const orderIds = [
      ...new Set(orderItems.map((item) => String(item.order_id))),
    ];

    // Get payments for these orders (this is the primary revenue data)
    const payments = await Payment.find({ order_id: { $in: orderIds } }).lean();

    if (payments.length === 0) {
      return res.json({
        success: true,
        event,
        products,
        orders: [],
        payments: [],
        discounts: [],
        stats: {
          totalOrders: 0,
          totalItems: 0,
          totalRevenuePaid: 0,
          totalRevenuePending: 0,
          quantityByType: { ticket: 0, merchandise: 0 },
          paymentMethods: {},
          discountUsage: 0,
          discountSavings: 0,
          totalDiscounts: 0,
        },
      });
    }

    // Get orders and users for context
    const orders = await Order.find({ _id: { $in: orderIds } }).lean();
    const userIds = [
      ...new Set(orders.map((o) => String(o.user_id)).filter(Boolean)),
    ];
    let users = [];
    if (userIds.length > 0) {
      users = await User.find({ _id: { $in: userIds } })
        .select("full_name email")
        .lean();
    }

    // Create lookup maps
    const orderMap = new Map(orders.map((o) => [String(o._id), o]));
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    // Group order items by order ID for detailed breakdown
    const orderItemsMap = new Map();
    orderItems.forEach((item) => {
      const orderId = String(item.order_id);
      if (!orderItemsMap.has(orderId)) {
        orderItemsMap.set(orderId, []);
      }
      orderItemsMap.get(orderId).push(item);
    });

    // Get discounts for this event (simplified)
    const discounts = await Discount.find({ event_id: eventId }).select(
      "code percentage description"
    );

    // Calculate statistics based on PAYMENTS (actual revenue data)
    let totalRevenuePaid = 0;
    let totalRevenuePending = 0;
    let totalItems = 0;
    let ticketQty = 0;
    let merchQty = 0;
    let totalPayments = 0;
    const paymentMethods = {};
    const detailedPayments = [];

    // Process each payment (this is the actual revenue)
    for (const payment of payments) {
      const order = orderMap.get(String(payment.order_id));
      const user = userMap.get(String(order?.user_id));
      const items = orderItemsMap.get(String(payment.order_id)) || [];

      if (!order) continue;

      // Only count quantities and revenue for successful payments (SUCCESS or paid)
      const isPaid = payment.status === "SUCCESS" || payment.status === "paid";

      if (isPaid) {
        // Calculate quantities from order items for this payment
        let paymentItems = 0;
        let paymentTicketQty = 0;
        let paymentMerchQty = 0;

        for (const item of items) {
          const itemQuantity = 1; // Each order item is 1 unit
          paymentItems += itemQuantity;

          const type = item.product_id?.type;
          if (type === "ticket") paymentTicketQty += itemQuantity;
          else if (type === "merchandise") paymentMerchQty += itemQuantity;
        }

        totalItems += paymentItems;
        ticketQty += paymentTicketQty;
        merchQty += paymentMerchQty;
        totalRevenuePaid += payment.amount || 0;
        totalPayments++;

        // Track payment methods for successful payments only
        paymentMethods[payment.payment_method] =
          (paymentMethods[payment.payment_method] || 0) + 1;
      } else {
        // Only track pending revenue for failed/pending payments
        totalRevenuePending += payment.amount || 0;
      }

      // Create payment structure (this represents actual transactions)
      detailedPayments.push({
        payment: {
          ...payment,
          user_id: user,
        },
        order: {
          ...order,
          user_id: user,
        },
        items: items.map((item) => {
          // OrderItems only has order_id and product_id, no price/quantity
          // We get price from the populated product, quantity is always 1 per order item
          const itemPrice = item.product_id?.price || 0;
          const itemQuantity = 1; // Each order item represents 1 unit
          return {
            _id: item._id,
            product: {
              _id: item.product_id?._id,
              name: item.product_id?.name,
              type: item.product_id?.type,
              price: item.product_id?.price,
            },
            price: itemPrice,
            quantity: itemQuantity,
            total_price: itemPrice * itemQuantity,
            scanStatus: item.status || "Pending", // Pending or Scanned
          };
        }),
        paymentAmount: payment.amount || 0,
        discountSavings: 0, // Simplified for now
        finalAmount: items.reduce((total, item) => {
          const itemPrice = item.product_id?.price || 0;
          const itemQuantity = 1; // Each order item is 1 unit
          return total + itemPrice * itemQuantity;
        }, 0),
      });
    }

    // Sort payments by creation date (newest first)
    detailedPayments.sort(
      (a, b) => new Date(b.payment.created_at) - new Date(a.payment.created_at)
    );

    return res.json({
      success: true,
      event,
      products,
      orders: detailedPayments, // These are actually payment transactions with order context
      payments: payments, // Raw payment data
      discounts,
      stats: {
        totalOrders: totalPayments, // Number of successful payment transactions
        totalItems,
        totalRevenuePaid,
        totalRevenuePending,
        quantityByType: { ticket: ticketQty, merchandise: merchQty },
        paymentMethods,
        discountUsage: 0, // Simplified
        discountSavings: 0, // Simplified
        totalDiscounts: discounts.length,
      },
    });
  } catch (error) {
    console.error("Error in getEventReport:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

const requestEventPublish = async (req, res) => {
  try {
    const { id } = req.params;

    // Get the event details
    const event = await Event.findById(id).populate(
      "seller_id",
      "full_name email"
    );
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    // 🔒 Check if event is locked (cannot request publish if locked)
    // Event is locked if status is pending, ongoing, or completed
    const now = new Date();
    const isLocked =
      event.status === "pending" ||
      event.status === "ongoing" ||
      event.status === "completed" ||
      (event.status === "approved" &&
        event.start_time &&
        new Date(event.start_time) <= now);

    if (isLocked) {
      return res.status(403).json({
        success: false,
        message:
          "Không thể gửi yêu cầu phê duyệt. Sự kiện đã bị khóa (đang chờ duyệt, đang diễn ra hoặc đã kết thúc).",
      });
    }

    // Only allow request publish from draft status
    if (event.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: `Chỉ có thể gửi yêu cầu phê duyệt từ trạng thái bản nháp. Trạng thái hiện tại: ${event.status}`,
      });
    }

    // Update event status to pending
    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      { status: "pending" },
      { new: true }
    ).populate("seller_id", "full_name email");

    // Get admin emails for notification
    const emailResult = await sendPublishRequestNotification(
      event.title,
      event._id,
      event.seller_id?.full_name || "Người tổ chức"
    );

    return res.status(200).json({
      success: true,
      message: "Yêu cầu phê duyệt đã được gửi",
      data: {
        ...updatedEvent.toObject(),
        display_status: getDisplayStatus(updatedEvent),
        adminEmails: emailResult.adminEmails || [],
        eventData: emailResult.eventData || {},
      },
    });
  } catch (error) {
    console.error("Error in requestEventPublish:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getFinancialReport = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const { format = "json" } = req.query;

    if (!eventId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing eventId parameter" });
    }

    // Get event details
    const event = await Event.findById(eventId)
      .populate({ path: "category_id", select: "name description" })
      .populate({ path: "seller_id", select: "full_name email" });

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    // Get all products for this event
    const products = await Product.find({ event_id: eventId }).select(
      "_id name price type quantity_total quantity_sold"
    );

    // Get all order items for products in this event
    const orderItems = await OrderItem.find({
      product_id: { $in: products.map((p) => p._id) },
    })
      .populate({ path: "product_id", select: "name type price event_id" })
      .populate({
        path: "order_id",
        select: "total_amount status created_at user_id",
      });

    // Get orders and payments
    const orderIds = [
      ...new Set(
        orderItems.map((item) => {
          if (typeof item.order_id === "object" && item.order_id._id) {
            return String(item.order_id._id);
          }
          return String(item.order_id);
        })
      ),
    ];
    const orders = await Order.find({ _id: { $in: orderIds } }).populate({
      path: "user_id",
      select: "full_name email",
    });
    const payments = await Payment.find({ order_id: { $in: orderIds } });

    // Calculate financial metrics
    const totalRevenue = payments
      .filter((p) => p.status === "SUCCESS" || p.status === "paid")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const pendingRevenue = payments
      .filter((p) => p.status === "PENDING" || p.status === "pending")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const totalTicketsSold = products
      .filter((p) => p.type === "ticket")
      .reduce((sum, p) => sum + (p.quantity_sold || 0), 0);

    const totalMerchSold = products
      .filter((p) => p.type === "merchandise")
      .reduce((sum, p) => sum + (p.quantity_sold || 0), 0);

    const averageOrderValue =
      orders.length > 0 ? totalRevenue / orders.length : 0;

    // Payment method breakdown
    const paymentMethods = {};
    payments.forEach((payment) => {
      if (payment.status === "SUCCESS" || payment.status === "paid") {
        paymentMethods[payment.payment_method] =
          (paymentMethods[payment.payment_method] || 0) + payment.amount;
      }
    });

    // Daily revenue breakdown
    const dailyRevenue = {};
    payments.forEach((payment) => {
      if (payment.status === "SUCCESS" || payment.status === "paid") {
        const date = new Date(payment.created_at).toISOString().split("T")[0];
        dailyRevenue[date] = (dailyRevenue[date] || 0) + payment.amount;
      }
    });

    const financialReport = {
      event: {
        _id: event._id,
        title: event.title,
        category: event.category_id?.name,
        start_date: event.start_time,
        end_date: event.end_time,
        location: event.location,
        status: event.status,
        seller: event.seller_id?.full_name,
      },
      summary: {
        total_orders: orders.length,
        total_revenue: totalRevenue,
        pending_revenue: pendingRevenue,
        total_tickets_sold: totalTicketsSold,
        total_merch_sold: totalMerchSold,
        average_order_value: Math.round(averageOrderValue),
        total_products: products.length,
      },
      revenue_breakdown: {
        by_payment_method: paymentMethods,
        by_day: dailyRevenue,
      },
      products: products.map((p) => ({
        name: p.name,
        type: p.type,
        price: p.price,
        total_quantity: p.quantity_total,
        sold_quantity: p.quantity_sold,
        revenue: p.price * (p.quantity_sold || 0),
        sell_through_rate:
          p.quantity_total > 0
            ? (((p.quantity_sold || 0) / p.quantity_total) * 100).toFixed(2)
            : 0,
      })),
      orders: orders.map((order) => {
        const payment = payments.find(
          (p) => String(p.order_id) === String(order._id)
        );
        const orderItemsForOrder = orderItems.filter(
          (item) => String(item.order_id) === String(order._id)
        );

        return {
          order_id: order._id,
          customer: order.user_id?.full_name || "Anonymous",
          customer_email: order.user_id?.email || "",
          created_at: order.created_at,
          total_amount: order.total_amount,
          payment_status: payment?.status || "PENDING",
          payment_method: payment?.payment_method || "N/A",
          items: orderItemsForOrder.map((item) => ({
            product_name: item.product_id?.name,
            product_type: item.product_id?.type,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.total_price,
          })),
        };
      }),
      generated_at: new Date().toISOString(),
      generated_by: "System",
    };

    if (format === "csv") {
      // Generate CSV format
      const csvRows = [];

      // Event info
      csvRows.push(["FINANCIAL REPORT", ""]);
      csvRows.push(["Event Title", financialReport.event.title]);
      csvRows.push(["Category", financialReport.event.category]);
      csvRows.push([
        "Start Date",
        new Date(financialReport.event.start_date).toLocaleString(),
      ]);
      csvRows.push([
        "End Date",
        new Date(financialReport.event.end_date).toLocaleString(),
      ]);
      csvRows.push(["Location", financialReport.event.location]);
      csvRows.push(["Status", financialReport.event.status]);
      csvRows.push(["Seller", financialReport.event.seller]);
      csvRows.push(["", ""]);

      // Summary
      csvRows.push(["SUMMARY", ""]);
      csvRows.push(["Total Orders", financialReport.summary.total_orders]);
      csvRows.push(["Total Revenue", financialReport.summary.total_revenue]);
      csvRows.push([
        "Pending Revenue",
        financialReport.summary.pending_revenue,
      ]);
      csvRows.push([
        "Total Tickets Sold",
        financialReport.summary.total_tickets_sold,
      ]);
      csvRows.push([
        "Total Merch Sold",
        financialReport.summary.total_merch_sold,
      ]);
      csvRows.push([
        "Average Order Value",
        financialReport.summary.average_order_value,
      ]);
      csvRows.push(["Total Products", financialReport.summary.total_products]);
      csvRows.push(["", ""]);

      // Products
      csvRows.push(["PRODUCTS", "", "", "", "", ""]);
      csvRows.push([
        "Name",
        "Type",
        "Price",
        "Total Qty",
        "Sold Qty",
        "Revenue",
        "Sell Through Rate",
      ]);
      financialReport.products.forEach((p) => {
        csvRows.push([
          p.name,
          p.type,
          p.price,
          p.total_quantity,
          p.sold_quantity,
          p.revenue,
          p.sell_through_rate + "%",
        ]);
      });
      csvRows.push(["", "", "", "", "", "", ""]);

      // Orders
      csvRows.push(["ORDERS", "", "", "", "", "", "", ""]);
      csvRows.push([
        "Order ID",
        "Customer",
        "Email",
        "Created At",
        "Total Amount",
        "Payment Status",
        "Payment Method",
        "Items Count",
      ]);
      financialReport.orders.forEach((order) => {
        csvRows.push([
          order.order_id,
          order.customer,
          order.customer_email,
          new Date(order.created_at).toLocaleString(),
          order.total_amount,
          order.payment_status,
          order.payment_method,
          order.items.length,
        ]);
      });

      const csvContent = csvRows
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="financial-report-${event.title.replace(
          /[^a-zA-Z0-9]/g,
          "-"
        )}-${new Date().toISOString().split("T")[0]}.csv"`
      );
      res.send("\uFEFF" + csvContent);
    } else {
      // Return JSON format
      res.json({
        success: true,
        data: financialReport,
      });
    }
  } catch (error) {
    console.error("Error in getFinancialReport:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Test email functionality
const testEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const testEmailAddress = email || "ducbmhe176457@fpt.edu.vn";

    console.log("🧪 Testing email service...");
    const result = await testEmailSending(testEmailAddress);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "Test email sent successfully",
        data: {
          messageId: result.messageId,
          testEmail: testEmailAddress,
        },
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Test email failed",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("❌ Test email error:", error);
    return res.status(500).json({
      success: false,
      message: "Test email failed",
      error: error.message,
    });
  }
};

// Get admin users for debugging
const getAdminUsers = async (req, res) => {
  try {
    const User = require("../models/Users");
    const adminUsers = await User.find({
      role: "Admin",
      status: "active",
    }).select("email full_name role status");

    return res.status(200).json({
      success: true,
      message: "Admin users retrieved successfully",
      data: {
        count: adminUsers.length,
        admins: adminUsers,
      },
    });
  } catch (error) {
    console.error("❌ Error getting admin users:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get admin users",
      error: error.message,
    });
  }
};

// Kiểm tra xung đột sự kiện
const checkEventConflict = async (req, res) => {
  try {
    const { location, start_time, end_time, excludeEventId } = req.body;

    // Nếu là sự kiện online, luôn cho phép
    if (
      location.toLowerCase().includes("online") ||
      location.toLowerCase().includes("trực tuyến")
    ) {
      return res.status(200).json({
        success: true,
        data: {
          hasConflict: false,
          message: "Sự kiện online được phép trùng thời gian",
        },
      });
    }

    console.log(
      `🔍 Checking for conflicts at "${location}" from ${new Date(
        start_time
      ).toLocaleString()} to ${new Date(end_time).toLocaleString()}`
    );

    // Build query để tìm sự kiện trùng
    const conflictQuery = {
      location: location,
      $or: [
        // Case 1: New event starts during existing event
        {
          start_time: { $lte: new Date(start_time) },
          end_time: { $gte: new Date(start_time) },
        },
        // Case 2: New event ends during existing event
        {
          start_time: { $lte: new Date(end_time) },
          end_time: { $gte: new Date(end_time) },
        },
        // Case 3: New event completely contains existing event
        {
          start_time: { $gte: new Date(start_time) },
          end_time: { $lte: new Date(end_time) },
        },
      ],
      status: { $in: ["approved"] }, // CHỈ kiểm tra với sự kiện đã approved
    };

    // Exclude current event khi update
    if (excludeEventId) {
      conflictQuery._id = { $ne: excludeEventId };
    }

    const conflictingEvent = await Event.findOne(conflictQuery).populate(
      "seller_id",
      "full_name email"
    );

    if (conflictingEvent) {
      console.log(
        `❌ Conflict found: ${conflictingEvent.title} (${conflictingEvent.status})`
      );
      return res.status(200).json({
        success: true,
        data: {
          hasConflict: true,
          message: `Địa điểm "${location}" đã có sự kiện khác vào thời gian này: "${
            conflictingEvent.title
          }" (${new Date(
            conflictingEvent.start_time
          ).toLocaleString()} - ${new Date(
            conflictingEvent.end_time
          ).toLocaleString()})`,
          conflictingEvent: {
            title: conflictingEvent.title,
            start_time: conflictingEvent.start_time,
            end_time: conflictingEvent.end_time,
            organizer: conflictingEvent.seller_id?.full_name,
          },
        },
      });
    }

    console.log(`✅ No conflicts found`);
    return res.status(200).json({
      success: true,
      data: {
        hasConflict: false,
        message: "Không có xung đột sự kiện",
      },
    });
  } catch (error) {
    console.error("Error in checkEventConflict:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// Simple recommendation endpoint: returns events similar by category or keywords in title
const recommendEvents = async (req, res) => {
  try {
    const { userId, limit = 6 } = req.query;
    // Very basic recommender: prefer upcoming approved events and match user's past orders or categories
    const now = new Date();
    const candidates = await Event.find({
      status: "approved",
      end_time: { $gte: now },
    })
      .populate("category_id", "name")
      .populate("seller_id", "full_name");

    // If userId provided, try to use Orders to infer categories (best-effort)
    let preferredCategoryIds = new Set();
    if (userId) {
      try {
        const userOrders = await Order.find({ user_id: userId }).populate({
          path: "items",
          populate: { path: "product_id" },
        });
        for (const o of userOrders) {
          // best-effort: if order contains products with event_id, collect category
          for (const it of o.items || []) {
            if (it.product_id && it.product_id.event_id)
              preferredCategoryIds.add(String(it.product_id.event_id));
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // Score candidates
    const scored = candidates.map((e) => {
      let score = 0;
      // prefer nearer start time
      const startsIn = (new Date(e.start_time) - now) / (1000 * 60 * 60 * 24);
      if (startsIn >= 0 && startsIn <= 7) score += 3;
      if (startsIn > 7 && startsIn <= 30) score += 1;
      // category match
      if (
        preferredCategoryIds.size > 0 &&
        preferredCategoryIds.has(String(e._id))
      )
        score += 5;
      // length of title/description
      if (e.title && e.title.length > 10) score += 0.5;
      return { event: e, score };
    });
  } catch (error) {
    console.error("Error in recommendEvents:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get event transactions with filters and stats
const getEventTransactions = async (req, res) => {
  try {
    const {
      eventName = "",
      buyerName = "",
      organizerName = "",
      startDate = "",
      endDate = "",
      status = "",
    } = req.query;

    console.log("Received query params:", {
      eventName,
      buyerName,
      organizerName,
      startDate,
      endDate,
      status,
    });

    // Build aggregation pipeline for FAST queries
    const pipeline = [
      // Match payments by status and date
      {
        $match: {
          ...(status && {
            status:
              status === "success" || status === "paid"
                ? { $in: ["paid", "SUCCESS"] }
                : status === "refunded"
                ? "refunded"
                : { $in: ["cancelled", "FAILED", "PENDING"] },
          }),
          ...(startDate || endDate
            ? {
                created_at: {
                  ...(startDate && { $gte: new Date(startDate) }),
                  ...(endDate && {
                    $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
                  }),
                },
              }
            : {}),
        },
      },

      // Lookup Order and User in one go
      {
        $lookup: {
          from: "Orders",
          localField: "order_id",
          foreignField: "_id",
          as: "order",
        },
      },
      { $unwind: { path: "$order", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "Users",
          localField: "order.user_id",
          foreignField: "_id",
          as: "buyer",
        },
      },
      { $unwind: { path: "$buyer", preserveNullAndEmptyArrays: true } },

      // Lookup OrderItems
      {
        $lookup: {
          from: "OrderItems",
          localField: "order._id",
          foreignField: "order_id",
          as: "orderItems",
        },
      },

      // Lookup Products (batch)
      {
        $lookup: {
          from: "Products",
          localField: "orderItems.product_id",
          foreignField: "_id",
          as: "products",
        },
      },

      // Lookup Events (batch)
      {
        $lookup: {
          from: "Events",
          localField: "products.event_id",
          foreignField: "_id",
          as: "events",
        },
      },

      // Lookup Categories (batch)
      {
        $lookup: {
          from: "Categories",
          localField: "events.category_id",
          foreignField: "_id",
          as: "categories",
        },
      },

      // Lookup Sellers (batch)
      {
        $lookup: {
          from: "Users",
          localField: "events.seller_id",
          foreignField: "_id",
          as: "sellers",
        },
      },

      // Project final shape
      {
        $project: {
          _id: 1,
          amount: 1,
          payment_method: 1,
          // Normalize status: SUCCESS/paid → paid, refunded → refunded, anything else → cancelled
          status: {
            $cond: {
              if: { $eq: ["$status", "refunded"] },
              then: "refunded",
              else: {
                $cond: {
                  if: { $in: ["$status", ["SUCCESS", "paid"]] },
                  then: "paid",
                  else: "cancelled",
                },
              },
            },
          },
          created_at: 1,
          buyerName: { $ifNull: ["$buyer.full_name", "Khách hàng ẩn danh"] },
          eventName: {
            $ifNull: [
              { $arrayElemAt: ["$events.title", 0] },
              "Sự kiện không xác định",
            ],
          },
          category: {
            $ifNull: [
              { $arrayElemAt: ["$categories.name", 0] },
              "Không phân loại",
            ],
          },
          organizer: {
            $ifNull: [
              { $arrayElemAt: ["$sellers.full_name", 0] },
              "Người tổ chức không xác định",
            ],
          },
          quantity: { $size: { $ifNull: ["$orderItems", []] } },
        },
      },

      // Apply text filters if provided
      ...(eventName
        ? [
            {
              $match: {
                eventName: { $regex: eventName, $options: "i" },
              },
            },
          ]
        : []),

      ...(buyerName
        ? [
            {
              $match: {
                buyerName: { $regex: buyerName, $options: "i" },
              },
            },
          ]
        : []),

      ...(organizerName
        ? [
            {
              $match: {
                organizer: { $regex: organizerName, $options: "i" },
              },
            },
          ]
        : []),

      // Sort by date
      { $sort: { created_at: -1 } },
    ];

    const transactions = await Payment.aggregate(pipeline);

    // Calculate stats - CHỈ tính paid transactions, không tính refunded
    const paidTransactions = transactions.filter((t) => t.status === "paid");
    const refundedTransactions = transactions.filter(
      (t) => t.status === "refunded"
    );
    const totalRevenue = paidTransactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0
    );
    const totalRefunded = refundedTransactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0
    );
    const totalTicketsSold =
      paidTransactions.reduce((sum, t) => sum + (t.quantity || 0), 0) +
      refundedTransactions.reduce((sum, t) => sum + (t.quantity || 0), 0);

    console.log(
      `✅ Found ${transactions.length} transactions in ONE aggregation query`
    );
    console.log(
      `💰 Total revenue: ${totalRevenue} VNĐ | 💸 Total refunded: ${totalRefunded} VNĐ | 🎫 Tickets sold: ${totalTicketsSold}`
    );
    // Add cache headers for 2 minutes
    res.set("Cache-Control", "public, max-age=120");

   return res.status(200).json({
      success: true,
      data: {
        totalPayments: transactions.length,
        totalTransactions: transactions.length,
        totalRevenue,
        totalRefunded,
        totalTicketsSold, 
        transactions: transactions.map((t) => ({
          _id: t._id,
          eventName: t.eventName,
          category: t.category,
          organizer: t.organizer,
          buyer: t.buyerName,
          amount: t.amount,
          paymentMethod: t.payment_method,
          status: t.status,
          createdAt: t.created_at,
          quantity: t.quantity,
        })),
      },
    });
  } catch (error) {
    console.error("❌ Error in getEventTransactions:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get social media posts for an event
const getEventSocialMediaPosts = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id).select("socialMediaPosts");

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: event.socialMediaPosts || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Add or update social media post for an event
const saveEventSocialMediaPost = async (req, res) => {
  try {
    const { id } = req.params;
    const postData = req.body;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Initialize socialMediaPosts if it doesn't exist
    if (!event.socialMediaPosts) {
      event.socialMediaPosts = [];
    }

    // Check if post with this ID already exists
    const existingPostIndex = event.socialMediaPosts.findIndex(
      (p) => p.id === postData.id
    );

    if (existingPostIndex >= 0) {
      // Update existing post
      event.socialMediaPosts[existingPostIndex] = {
        ...event.socialMediaPosts[existingPostIndex],
        ...postData,
      };
    } else {
      // Add new post
      event.socialMediaPosts.push(postData);
    }

    await event.save();

    return res.status(200).json({
      success: true,
      data:
        existingPostIndex >= 0
          ? event.socialMediaPosts[existingPostIndex]
          : event.socialMediaPosts[event.socialMediaPosts.length - 1],
      message: existingPostIndex >= 0 ? "Post updated" : "Post added",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete social media post from an event
const deleteEventSocialMediaPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { postId } = req.body;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (!event.socialMediaPosts) {
      return res.status(404).json({
        success: false,
        message: "No posts found",
      });
    }

    const initialLength = event.socialMediaPosts.length;
    event.socialMediaPosts = event.socialMediaPosts.filter(
      (p) => p.id !== postId
    );

    if (event.socialMediaPosts.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    await event.save();

    return res.status(200).json({
      success: true,
      message: "Post deleted",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Upload image from TinyMCE editor to Cloudinary
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const uploadEditorImage = async (req, res) => {
  try {
    const { image } = req.body; // Base64 image data

    if (!image) {
      return res.status(400).json({
        success: false,
        message: "Image data is required",
      });
    }

    if (!isBase64Image(image)) {
      return res.status(400).json({
        success: false,
        message: "Invalid image format. Expected base64 image data.",
      });
    }

    // Upload to Cloudinary
    const cloudinaryUrl = await uploadBase64Image(image, "events/detail");

    return res.status(200).json({
      success: true,
      location: cloudinaryUrl, // TinyMCE expects 'location' field
    });
  } catch (error) {
    console.error("❌ Editor image upload error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Xử lý hoàn tiền tự động khi sự kiện bị closed - FIXED VERSION
 */
const processAutomaticRefundForEvent = async (eventId, req = null) => {
  try {
    console.log(`🔄 Starting automatic refund process for event: ${eventId}`);

    const io = req ? req.app.get("io") : null;

    // 1. Lấy thông tin sự kiện và người tổ chức
    const event = await Event.findById(eventId).populate("seller_id");
    if (!event) {
      return {
        success: false,
        message: "Event not found",
        refundedCount: 0,
        totalCount: 0,
        totalAmount: 0,
      };
    }

    const sellerId = event.seller_id._id;
    console.log(`👤 Event organizer: ${sellerId}`);

    // 2. Lấy tất cả sản phẩm của sự kiện
    const products = await Product.find({ event_id: eventId }).select(
      "_id name price"
    );
    if (products.length === 0) {
      return {
        success: true,
        message: "No products found for this event",
        refundedCount: 0,
        totalCount: 0,
        totalAmount: 0,
      };
    }

    const productIds = products.map((p) => p._id);
    console.log(`📦 Found ${products.length} products for refund processing`);

    // 3. Lấy tất cả OrderItem cho các sản phẩm này
    const orderItems = await OrderItem.find({
      product_id: { $in: productIds },
      status: { $ne: "Refunded" },
    })
      .populate("order_id")
      .populate("product_id");

    if (orderItems.length === 0) {
      return {
        success: true,
        message: "No orders found for this event",
        refundedCount: 0,
        totalCount: 0,
        totalAmount: 0,
      };
    }

    console.log(`📋 Found ${orderItems.length} order items to process`);

    // 4. Nhóm OrderItem theo order_id
    const orderRefundMap = new Map();

    orderItems.forEach((item) => {
      const orderId = item.order_id._id.toString();
      const orderDisplayId = item.order_id.order_id; // Lấy order_id để hiển thị
      
      if (!orderRefundMap.has(orderId)) {
        orderRefundMap.set(orderId, {
          order: item.order_id,
          orderDisplayId: orderDisplayId, // Lưu order_id để hiển thị
          items: [],
          totalRefundAmount: 0,
        });
      }

      const refundEntry = orderRefundMap.get(orderId);
      refundEntry.items.push(item);

      const quantity = item.quantity || 1;
      const itemRefundAmount = item.product_id.price * quantity;
      refundEntry.totalRefundAmount += itemRefundAmount;
    });

    console.log(
      `💳 Processing refund for ${orderRefundMap.size} unique orders`
    );

    let refundedCount = 0;
    let totalAmount = 0;
    const refundResults = [];

    // 5. LẤY VÍ NGƯỜI TỔ CHỨC
    let sellerWallet = await Wallets.findOne({ user_id: sellerId });
    if (!sellerWallet) {
      sellerWallet = await Wallets.create({
        user_id: sellerId,
        balance: 0,
      });
      console.log(`👛 Created new wallet for organizer: ${sellerId}`);
    }

    console.log(
      `💰 Organizer wallet balance: ${sellerWallet.balance.toLocaleString()} VNĐ`
    );

    // 6. Xử lý hoàn tiền cho từng đơn hàng
    for (const [orderId, refundData] of orderRefundMap) {
      try {
        const order = refundData.order;
        const orderDisplayId = refundData.orderDisplayId; // order_id để hiển thị
        const refundAmount = refundData.totalRefundAmount;

        if (order.status !== "paid" && order.status !== "paid") {
          console.log(`⏭️ Skipping order ${orderDisplayId} - status: ${order.status}`);
          continue;
        }

        console.log(
          `💰 Processing refund for order ${orderDisplayId}: ${refundAmount.toLocaleString()} VNĐ`
        );

        // 7. TRỪ TIỀN TỪ VÍ NGƯỜI TỔ CHỨC
        if (sellerWallet.balance < refundAmount) {
          console.log(
            `⚠️ Organizer wallet insufficient balance: ${sellerWallet.balance.toLocaleString()} VNĐ, required: ${refundAmount.toLocaleString()} VNĐ`
          );

          // Use GENERAL type for warning
          try {
            await addNotification(
              sellerId,
              orderId,
              `⚠️ CẢNH BÁO: Số dư ví không đủ để hoàn tiền cho đơn hàng ${orderDisplayId}. Vui lòng nạp thêm tiền.`,
              "GENERAL",
              sellerWallet._id,
              "Cảnh báo hoàn tiền",
              "/profile?tab=wallet"
            );
          } catch (notifError) {
            console.warn(`⚠️ Warning notification failed, but continuing...`);
          }

          continue;
        }

        // TRỪ TIỀN TỪ VÍ NGƯỜI TỔ CHỨC
        const oldSellerBalance = sellerWallet.balance;
        sellerWallet.balance -= refundAmount;
        await sellerWallet.save();

        // Ghi lịch sử giao dịch TRỪ TIỀN
        await TransactionHistory.create({
          wallet_id: sellerWallet._id,
          amount_subtract: refundAmount,
          description: `Hoàn tiền tự động cho đơn hàng ${orderDisplayId} - Sự kiện bị hủy: ${event.title}`,
          created_at: new Date(),
        });

        console.log(
          `➖ Deducted ${refundAmount.toLocaleString()} VNĐ from organizer wallet. Balance: ${oldSellerBalance.toLocaleString()} → ${sellerWallet.balance.toLocaleString()} VNĐ`
        );

        // 8. Cập nhật trạng thái đơn hàng thành "refunded"
        await Order.findByIdAndUpdate(orderId, {
          status: "refunded",
          refund_amount: refundAmount,
          refunded_at: new Date(),
          refund_reason: `Sự kiện bị hủy - Automatic refund`,
        });

        // 9. Cập nhật trạng thái payment thành "refunded"
        await Payment.findOneAndUpdate(
          { order_id: orderId, status: { $in: ["paid", "SUCCESS"] } },
          {
            status: "refunded",
            refund_amount: refundAmount,
            refunded_at: new Date(),
          }
        );

        // 10. Cập nhật trạng thái OrderItem thành "Refunded"
        await OrderItem.updateMany(
          { order_id: orderId, product_id: { $in: productIds } },
          {
            status: "Refunded",
            refunded_at: new Date(),
          }
        );

        // 11. HOÀN TIỀN VÀO VÍ NGƯỜI MUA
        try {
          const userWallet = await Wallets.findOne({ user_id: order.user_id });
          if (userWallet) {
            const oldBalance = userWallet.balance;
            userWallet.balance += refundAmount;
            await userWallet.save();

            // Ghi lịch sử giao dịch CỘNG TIỀN
            await TransactionHistory.create({
              wallet_id: userWallet._id,
              amount_add: refundAmount,
              description: `Hoàn tiền tự động do sự kiện "${event.title}" bị hủy - Order: ${orderDisplayId}`,
              created_at: new Date(),
            });

            console.log(
              `✅ Refunded ${refundAmount.toLocaleString()} VNĐ to user ${
                order.user_id
              } wallet. Balance: ${oldBalance.toLocaleString()} → ${userWallet.balance.toLocaleString()} VNĐ`
            );

            // Gửi thông báo cho người mua - SỬ DỤNG WALLET_TOPUP
            try {
              await addNotification(
                order.user_id,
                orderId,
                `💰 Bạn đã được hoàn tiền ${refundAmount.toLocaleString()} VNĐ vào ví do sự kiện "${
                  event.title
                }" bị hủy. Mã đơn hàng: ${orderDisplayId}. Số dư ví hiện tại: ${userWallet.balance.toLocaleString()} VNĐ`,
                "WALLET_TOPUP",
                userWallet._id,
                "Hoàn tiền thành công",
                "/profile?tab=transactions"
              );
            } catch (notifError) {
              console.warn(
                `⚠️ Buyer notification failed, but refund succeeded`
              );
            }

            // 🔔 Gửi socket notification realtime
            if (io) {
              io.to(order.user_id.toString()).emit("wallet_updated", {
                newBalance: userWallet.balance,
                message: `💰 Bạn đã được hoàn tiền ${refundAmount.toLocaleString()} VNĐ do sự kiện bị hủy`,
              });
            }
          } else {
            console.log(
              `⚠️ User ${order.user_id} doesn't have wallet, creating one...`
            );

            // Tạo ví mới cho người dùng nếu chưa có
            const newUserWallet = await Wallets.create({
              user_id: order.user_id,
              balance: refundAmount,
            });

            await TransactionHistory.create({
              wallet_id: newUserWallet._id,
              amount_add: refundAmount,
              description: `Hoàn tiền tự động do sự kiện "${event.title}" bị hủy - Order: ${orderDisplayId}`,
              created_at: new Date(),
            });

            console.log(
              `✅ Created wallet and refunded ${refundAmount.toLocaleString()} VNĐ to user ${
                order.user_id
              }`
            );

            try {
              await addNotification(
                order.user_id,
                orderId,
                `💰 Bạn đã được hoàn tiền ${refundAmount.toLocaleString()} VNĐ do sự kiện "${
                  event.title
                }" bị hủy. Mã đơn hàng: ${orderDisplayId}. Số dư ví hiện tại: ${refundAmount.toLocaleString()} VNĐ`,
                "WALLET_TOPUP",
                newUserWallet._id,
                "Hoàn tiền thành công",
                "/profile?tab=transactions"
              );
            } catch (notifError) {
              console.warn(
                `⚠️ New user notification failed, but wallet created`
              );
            }
          }
        } catch (walletError) {
          console.error(
            `❌ CRITICAL: Wallet refund failed for user ${order.user_id}:`,
            walletError
          );
          // Only reverse for critical wallet errors, not notification errors
          if (
            !walletError.message.includes("notification") &&
            !walletError.message.includes("Notification")
          ) {
            sellerWallet.balance += refundAmount;
            await sellerWallet.save();
            console.log(`🔄 Refund reversed due to critical wallet error`);
            continue;
          } else {
            console.log(
              `ℹ️ Notification error ignored, refund completed successfully`
            );
          }
        }

        // Gửi thông báo cho người tổ chức - SỬ DỤNG WALLET_WITHDRAW
        try {
          await addNotification(
            sellerId,
            orderId,
            `➖ Đã trừ ${refundAmount.toLocaleString()} VNĐ từ ví để hoàn tiền cho đơn hàng ${orderDisplayId} (Sự kiện bị hủy: ${
              event.title
            })`,
            "WALLET_WITHDRAW",
            sellerWallet._id,
            "Trừ tiền hoàn trả",
            "/profile?tab=transactions"
          );
        } catch (notifError) {
          console.warn(
            `⚠️ Organizer notification failed, but deduction succeeded`
          );
        }

        // 🔔 Gửi socket notification cho người tổ chức
        if (io) {
          io.to(sellerId.toString()).emit("wallet_updated", {
            newBalance: sellerWallet.balance,
            message: `➖ Đã trừ ${refundAmount.toLocaleString()} VNĐ để hoàn tiền cho sự kiện bị hủy`,
          });
        }

        refundedCount++;
        totalAmount += refundAmount;
        refundResults.push({
          orderId: orderDisplayId, // Sử dụng orderDisplayId thay vì ObjectId
          userId: order.user_id,
          refundAmount,
          success: true,
        });

        console.log(`✅ Successfully refunded order ${orderDisplayId}`);
      } catch (orderError) {
        console.error(`❌ Failed to refund order ${orderDisplayId}:`, orderError);
        refundResults.push({
          orderId: orderDisplayId, // Sử dụng orderDisplayId thay vì ObjectId
          error: orderError.message,
          success: false,
        });
      }
    }

    // 12. Cập nhật số lượng sản phẩm đã bán
    for (const product of products) {
      const refundedItemsCount = orderItems
        .filter(
          (item) => item.product_id._id.toString() === product._id.toString()
        )
        .reduce((sum, item) => sum + (item.quantity || 1), 0);

      if (refundedItemsCount > 0) {
        await Product.findByIdAndUpdate(product._id, {
          $inc: { quantity_sold: -refundedItemsCount },
        });
        console.log(
          `📊 Updated product ${product.name}: reduced quantity_sold by ${refundedItemsCount}`
        );
      }
    }

    // 13. Gửi thông báo tổng kết - SỬ DỤNG GENERAL
    if (refundedCount > 0) {
      try {
        await addNotification(
          sellerId,
          eventId,
          `📊 Tổng kết hoàn tiền: Đã hoàn ${totalAmount.toLocaleString()} VNĐ cho ${refundedCount} đơn hàng do sự kiện "${
            event.title
          }" bị hủy. Số dư ví hiện tại: ${sellerWallet.balance.toLocaleString()} VNĐ`,
          "GENERAL",
          sellerWallet._id,
          "Tổng kết hoàn tiền",
          "/profile?tab=transactions"
        );
      } catch (notifError) {
        console.warn(`⚠️ Summary notification failed`);
      }
    }

    return {
      success: true,
      refundedCount,
      totalCount: orderRefundMap.size,
      totalAmount,
      refundResults,
      sellerBalance: sellerWallet.balance,
      message: `Automatic refund completed: ${refundedCount}/${
        orderRefundMap.size
      } orders refunded, total amount: ${totalAmount.toLocaleString()} VNĐ, organizer balance: ${sellerWallet.balance.toLocaleString()} VNĐ`,
    };
  } catch (error) {
    console.error("❌ Error in processAutomaticRefundForEvent:", error);
    return {
      success: false,
      message: error.message,
      refundedCount: 0,
      totalCount: 0,
      totalAmount: 0,
    };
  }
};

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventsByMode,
  getEventsByCategory,
  getEventsByUserId,
  getEventReport,
  recommendEvents,
  getFinancialReport,
  requestEventPublish,
  testEmail,
  getAdminUsers,
  getEventTransactions,
  checkEventConflict,
  getEventSocialMediaPosts,
  saveEventSocialMediaPost,
  deleteEventSocialMediaPost,
  uploadEditorImage,
  processAutomaticRefundForEvent,
};
