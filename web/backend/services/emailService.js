const User = require("../models/Users");
const Event = require("../models/Events");
const Order = require("../models/Orders");
const OrderItem = require("../models/OrderItems");
const Product = require("../models/Products");
const nodemailer = require("nodemailer");

// EmailJS configuration (same as your frontend)
const EMAILJS_CONFIG = {
  serviceId: "service_vzz4ba6",
  templateId: "template_9he2vdi",
  publicKey: "N0sX7Ju3vZUPP9iX2",
};

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Send email notification to all admin users about publish request
const sendPublishRequestNotification = async (
  eventTitle,
  eventId,
  organizerName
) => {
  try {
    console.log(
      `📧 Starting to send publish request notification for event: ${eventTitle}`
    );

    const transporter = createTransporter();

    // Test transporter connection
    try {
      await transporter.verify();
      console.log("✅ SMTP connection verified successfully");
    } catch (verifyError) {
      console.error("❌ SMTP connection failed:", verifyError);
      return {
        success: false,
        message: "SMTP connection failed",
        error: verifyError.message,
      };
    }

    // Get all admin users
    const adminUsers = await User.find({
      role: "Admin",
      status: "active",
    }).select("email full_name");

    if (adminUsers.length === 0) {
      console.log("⚠️ No admin users found to notify");
      return { success: false, message: "No admin users found" };
    }

    console.log(`📋 Found ${adminUsers.length} admin users to notify`);

    // Email content in Vietnamese
    const emailSubject = `🎪 Yêu cầu phê duyệt sự kiện: ${eventTitle}`;
    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #fa8c16; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">🎪 Thông báo sự kiện</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333;">Yêu cầu phê duyệt sự kiện</h2>
          
          <p>Xin chào Admin,</p>
          
          <p>Một sự kiện mới đã được gửi yêu cầu phê duyệt:</p>
          
          <div style="background-color: white; padding: 15px; border-left: 4px solid #fa8c16; margin: 15px 0; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #fa8c16;">📅 ${eventTitle}</h3>
            <p style="margin: 5px 0;"><strong>Người tổ chức:</strong> ${organizerName}</p>
            <p style="margin: 5px 0;"><strong>Trạng thái:</strong> Đang chờ phê duyệt</p>
            <p style="margin: 5px 0;"><strong>ID sự kiện:</strong> ${eventId}</p>
            <p style="margin: 5px 0;"><strong>Thời gian gửi yêu cầu:</strong> ${new Date().toLocaleString(
      "vi-VN"
    )}</p>
          </div>
          
          <p>Vui lòng đăng nhập vào hệ thống quản trị để xem chi tiết và phê duyệt sự kiện này.</p>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="https://ticketfu-font-end.vercel.app/admin/events" 
               style="background-color: #fa8c16; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              🔗 Xem chi tiết sự kiện
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          
          <p style="font-size: 12px; color: #666;">
            Email này được gửi tự động từ hệ thống quản lý sự kiện.<br>
            Vui lòng không trả lời email này.
          </p>
        </div>
      </div>
    `;

    const emailText = `
Thông báo sự kiện mới

Xin chào Admin,

Một sự kiện mới đã được gửi yêu cầu phê duyệt:

📅 ${eventTitle}
Người tổ chức: ${organizerName}
Trạng thái: Đang chờ phê duyệt
ID sự kiện: ${eventId}
Thời gian gửi yêu cầu: ${new Date().toLocaleString("vi-VN")}

Vui lòng đăng nhập vào hệ thống quản trị để xem chi tiết và phê duyệt sự kiện này.

Link: https://ticketfu-font-end.vercel.app/admin/events

---
Email này được gửi tự động từ hệ thống quản lý sự kiện.
Vui lòng không trả lời email này.
    `;

    // Send email to each admin user
    const emailPromises = adminUsers.map(async (admin) => {
      try {
        const mailOptions = {
          from: `"${process.env.APP_NAME || "Event Management System"}" <${process.env.SMTP_USER
            }>`,
          to: admin.email,
          subject: emailSubject,
          text: emailText,
          html: emailHTML,
        };

        console.log(`📧 Attempting to send email to: ${admin.email}`);
        const result = await transporter.sendMail(mailOptions);
        console.log(
          `✅ Email sent successfully to admin: ${admin.full_name} (${admin.email}) - Message ID: ${result.messageId}`
        );
        return {
          success: true,
          email: admin.email,
          messageId: result.messageId,
        };
      } catch (error) {
        console.error(
          `❌ Failed to send email to admin: ${admin.full_name} (${admin.email})`,
          error
        );
        return { success: false, email: admin.email, error: error.message };
      }
    });

    // Wait for all emails to be sent
    const results = await Promise.allSettled(emailPromises);

    // Log results
    let successCount = 0;
    let failedEmails = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.success) {
        successCount++;
      } else {
        const admin = adminUsers[index];
        const error =
          result.status === "fulfilled" ? result.value.error : result.reason;
        failedEmails.push({ email: admin.email, error });
        console.error(
          `❌ Failed to send email to admin: ${admin.full_name} (${admin.email})`,
          error
        );
      }
    });

    console.log(
      `📧 Publish request notification sent to ${successCount}/${adminUsers.length} admin users`
    );

    return {
      success: successCount > 0,
      sentTo: successCount,
      total: adminUsers.length,
      failedEmails: failedEmails,
    };
  } catch (error) {
    console.error("❌ Error in sendPublishRequestNotification:", error);
    throw error;
  }
};

// Send rejection notification to event organizer with reason
const sendEventRejectionNotification = async (
  eventId,
  rejectionReason = "",
  statusType = "rejected"
) => {
  try {
    console.log(
      `📧 Starting to send ${statusType} notification for event: ${eventId}`
    );
    console.log(`📧 Rejection reason: ${rejectionReason}`);

    const transporter = createTransporter();

    // Test transporter connection
    try {
      await transporter.verify();
      console.log("✅ SMTP connection verified successfully");
    } catch (verifyError) {
      console.error("❌ SMTP connection failed:", verifyError);
      return {
        success: false,
        message: "SMTP connection failed",
        error: verifyError.message,
      };
    }

    // Get event details with organizer information
    const event = await Event.findById(eventId)
      .populate("seller_id", "email full_name")
      .populate("category_id", "name");

    if (!event) {
      console.log("❌ Event not found");
      return { success: false, message: "Event not found" };
    }

    if (!event.seller_id || !event.seller_id.email) {
      console.log("❌ Event organizer email not found");
      return { success: false, message: "Event organizer email not found" };
    }

    const organizerEmail = event.seller_id.email;
    const organizerName = event.seller_id.full_name || "Người tổ chức";
    const eventTitle = event.title;
    const eventCategory = event.category_id?.name || "Không có danh mục";
    const eventLocation = event.location;
    const eventStartTime = new Date(event.start_time).toLocaleString("vi-VN");
    const eventEndTime = new Date(event.end_time).toLocaleString("vi-VN");

    // Determine email content based on status type
    const isCancelled = statusType === "cancelled";
    const statusText = isCancelled ? "tạm hoãn" : "từ chối";
    const statusColor = isCancelled ? "#faad14" : "#ff4d4f";
    const statusTitle = isCancelled ? "tạm hoãn" : "từ chối";
    const actionText = isCancelled ? "tạm hoãn" : "từ chối";

    console.log(
      `📋 Sending ${statusType} notification to organizer: ${organizerName} (${organizerEmail})`
    );

    // Email content in Vietnamese
    const emailSubject = `❌ Sự kiện "${eventTitle}" đã bị ${statusText}`;
    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">❌ Thông báo ${statusTitle} sự kiện</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333;">Sự kiện của bạn đã bị ${statusText}</h2>
          
          <p>Xin chào <strong>${organizerName}</strong>,</p>
          
          <p>Chúng tôi rất tiếc phải thông báo rằng sự kiện của bạn đã bị ${statusText}:</p>
          
          <div style="background-color: white; padding: 15px; border-left: 4px solid ${statusColor}; margin: 15px 0; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: ${statusColor};">📅 ${eventTitle}</h3>
            <p style="margin: 5px 0;"><strong>Danh mục:</strong> ${eventCategory}</p>
            <p style="margin: 5px 0;"><strong>Địa điểm:</strong> ${eventLocation}</p>
            <p style="margin: 5px 0;"><strong>Thời gian:</strong> ${eventStartTime} - ${eventEndTime}</p>
            <p style="margin: 5px 0;"><strong>Trạng thái:</strong> <span style="color: ${statusColor}; font-weight: bold;">Đã bị ${statusText}</span></p>
            <p style="margin: 5px 0;"><strong>Thời gian xét duyệt:</strong> ${new Date().toLocaleString(
      "vi-VN"
    )}</p>
          </div>

          ${rejectionReason
        ? `
          <div style="background-color: #fff2f0; border: 1px solid #ffccc7; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <h4 style="margin: 0 0 10px 0; color: #a8071a;">📝 Lý do ${statusText}:</h4>
            <p style="margin: 0; color: #a8071a; white-space: pre-line;">${rejectionReason}</p>
          </div>
          `
        : `
          <div style="background-color: #fff2f0; border: 1px solid #ffccc7; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <h4 style="margin: 0 0 10px 0; color: #a8071a;">📝 Lý do ${statusText}:</h4>
            <p style="margin: 0; color: #a8071a;">Không có lý do cụ thể được cung cấp.</p>
          </div>
          `
      }
          
          <p>Bạn có thể:</p>
          <ul>
            <li>Chỉnh sửa thông tin sự kiện và gửi yêu cầu phê duyệt lại</li>
            <li>Liên hệ với quản trị viên nếu có thắc mắc về lý do ${statusText}</li>
            <li>Tạo sự kiện mới với thông tin phù hợp hơn</li>
          </ul>

          <div style="background-color: #f6ffed; border: 1px solid #b7eb8f; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <h4 style="margin: 0 0 10px 0; color: #389e0d;">💡 Gợi ý:</h4>
            <p style="margin: 0;">Để sự kiện được phê duyệt dễ dàng hơn, hãy đảm bảo:</p>
            <ul style="margin: 10px 0 0 0;">
              <li>Thông tin sự kiện đầy đủ và chính xác</li>
              <li>Không trùng lịch với sự kiện khác tại cùng địa điểm</li>
              <li>Nội dung phù hợp với chính sách của nền tảng</li>
              <li>Ảnh poster chất lượng tốt và phù hợp</li>
            </ul>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          
          <p style="font-size: 12px; color: #666;">
            Email này được gửi tự động từ hệ thống quản lý sự kiện.<br>
            Vui lòng không trả lời email này.
          </p>
        </div>
      </div>
    `;

    const emailText = `
Thông báo ${statusTitle} sự kiện

Xin chào ${organizerName},

Chúng tôi rất tiếc phải thông báo rằng sự kiện của bạn đã bị ${statusText}:

📅 ${eventTitle}
Danh mục: ${eventCategory}
Địa điểm: ${eventLocation}
Thời gian: ${eventStartTime} - ${eventEndTime}
Trạng thái: Đã bị ${statusText}
${rejectionReason
        ? `Lý do ${statusText}: ${rejectionReason}`
        : "Lý do: Không có lý do cụ thể được cung cấp."
      }
Thời gian xét duyệt: ${new Date().toLocaleString("vi-VN")}

Bạn có thể:
- Chỉnh sửa thông tin sự kiện và gửi yêu cầu phê duyệt lại
- Liên hệ với quản trị viên nếu có thắc mắc về lý do ${statusText}
- Tạo sự kiện mới với thông tin phù hợp hơn

---
Email này được gửi tự động từ hệ thống quản lý sự kiện.
Vui lòng không trả lời email này.
    `;

    // Send email to organizer
    const mailOptions = {
      from: `"${process.env.APP_NAME || "Event Management System"}" <${process.env.SMTP_USER
        }>`,
      to: organizerEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHTML,
    };

    console.log(
      `📧 Attempting to send ${statusType} email to organizer: ${organizerEmail}`
    );
    const result = await transporter.sendMail(mailOptions);
    console.log(
      `✅ ${statusType.charAt(0).toUpperCase() + statusType.slice(1)
      } email sent successfully to organizer: ${organizerName} (${organizerEmail}) - Message ID: ${result.messageId
      }`
    );

    return {
      success: true,
      messageId: result.messageId,
      organizerEmail: organizerEmail,
      organizerName: organizerName,
      eventTitle: eventTitle,
      statusType: statusType,
      rejectionReason: rejectionReason,
    };
  } catch (error) {
    console.error(
      `❌ Error in sendEventRejectionNotification (${statusType}):`,
      error
    );
    return {
      success: false,
      error: error.message,
      message: `Failed to send ${statusType} notification`,
    };
  }
};

// Send approval notification to event organizer
const sendEventApprovalNotification = async (eventId) => {
  try {
    console.log(
      `📧 Starting to send approval notification for event: ${eventId}`
    );

    const transporter = createTransporter();

    // Test transporter connection
    try {
      await transporter.verify();
      console.log("✅ SMTP connection verified successfully");
    } catch (verifyError) {
      console.error("❌ SMTP connection failed:", verifyError);
      return {
        success: false,
        message: "SMTP connection failed",
        error: verifyError.message,
      };
    }

    // Get event details with organizer information
    const event = await Event.findById(eventId)
      .populate("seller_id", "email full_name")
      .populate("category_id", "name");

    if (!event) {
      console.log("❌ Event not found");
      return { success: false, message: "Event not found" };
    }

    if (!event.seller_id || !event.seller_id.email) {
      console.log("❌ Event organizer email not found");
      return { success: false, message: "Event organizer email not found" };
    }

    const organizerEmail = event.seller_id.email;
    const organizerName = event.seller_id.full_name || "Người tổ chức";
    const eventTitle = event.title;
    const eventCategory = event.category_id?.name || "Không có danh mục";

    console.log(
      `📋 Sending approval notification to organizer: ${organizerName} (${organizerEmail})`
    );

    // Email content in Vietnamese
    const emailSubject = `✅ Sự kiện "${eventTitle}" đã được phê duyệt`;
    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #52c41a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">✅ Thông báo phê duyệt sự kiện</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333;">Sự kiện của bạn đã được phê duyệt!</h2>
          
          <p>Xin chào <strong>${organizerName}</strong>,</p>
          
          <p>Chúng tôi vui mừng thông báo rằng sự kiện của bạn đã được phê duyệt thành công:</p>
          
          <div style="background-color: white; padding: 15px; border-left: 4px solid #52c41a; margin: 15px 0; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #52c41a;">📅 ${eventTitle}</h3>
            <p style="margin: 5px 0;"><strong>Danh mục:</strong> ${eventCategory}</p>
            <p style="margin: 5px 0;"><strong>Địa điểm:</strong> ${event.location
      }</p>
            <p style="margin: 5px 0;"><strong>Thời gian:</strong> ${new Date(
        event.start_time
      ).toLocaleString("vi-VN")} - ${new Date(
        event.end_time
      ).toLocaleString("vi-VN")}</p>
            <p style="margin: 5px 0;"><strong>Trạng thái:</strong> <span style="color: #52c41a; font-weight: bold;">Đã được phê duyệt</span></p>
            <p style="margin: 5px 0;"><strong>Thời gian phê duyệt:</strong> ${new Date().toLocaleString(
        "vi-VN"
      )}</p>
          </div>
          
          <p>Sự kiện của bạn hiện đã được hiển thị công khai và người dùng có thể đăng ký tham gia.</p>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="https://ticketfu-font-end.vercel.app/events/${eventId}" 
               style="background-color: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 5px;">
              👀 Xem sự kiện
            </a>
            <a href="https://ticketfu-font-end.vercel.app/organizer" 
               style="background-color: #fa8c16; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 5px;">
              📊 Quản lý sự kiện
            </a>
          </div>

          <div style="background-color: #f6ffed; border: 1px solid #b7eb8f; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <h4 style="margin: 0 0 10px 0; color: #389e0d;">🎉 Chúc mừng!</h4>
            <p style="margin: 0;">Sự kiện của bạn đã sẵn sàng để tiếp cận với cộng đồng. Hãy chia sẻ sự kiện để thu hút nhiều người tham gia hơn!</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          
          <p style="font-size: 12px; color: #666;">
            Email này được gửi tự động từ hệ thống quản lý sự kiện.<br>
            Vui lòng không trả lời email này.
          </p>
        </div>
      </div>
    `;

    const emailText = `
Thông báo phê duyệt sự kiện

Xin chào ${organizerName},

Chúng tôi vui mừng thông báo rằng sự kiện của bạn đã được phê duyệt thành công:

📅 ${eventTitle}
Danh mục: ${eventCategory}
Địa điểm: ${event.location}
Thời gian: ${new Date(event.start_time).toLocaleString("vi-VN")} - ${new Date(
      event.end_time
    ).toLocaleString("vi-VN")}
Trạng thái: Đã được phê duyệt
Thời gian phê duyệt: ${new Date().toLocaleString("vi-VN")}

Sự kiện của bạn hiện đã được hiển thị công khai và người dùng có thể đăng ký tham gia.

Link xem sự kiện: https://ticketfu-font-end.vercel.app/events/${eventId}
Link quản lý sự kiện: https://ticketfu-font-end.vercel.app/organizer

---
Email này được gửi tự động từ hệ thống quản lý sự kiện.
Vui lòng không trả lời email này.
    `;

    // Send email to organizer
    const mailOptions = {
      from: `"${process.env.APP_NAME || "Event Management System"}" <${process.env.SMTP_USER
        }>`,
      to: organizerEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHTML,
    };

    console.log(
      `📧 Attempting to send approval email to organizer: ${organizerEmail}`
    );
    const result = await transporter.sendMail(mailOptions);
    console.log(
      `✅ Approval email sent successfully to organizer: ${organizerName} (${organizerEmail}) - Message ID: ${result.messageId}`
    );

    return {
      success: true,
      messageId: result.messageId,
      organizerEmail: organizerEmail,
      organizerName: organizerName,
      eventTitle: eventTitle,
    };
  } catch (error) {
    console.error("❌ Error in sendEventApprovalNotification:", error);
    return {
      success: false,
      error: error.message,
      message: "Failed to send approval notification",
    };
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const transporter = createTransporter();

    const resetUrl = `${process.env.FRONTEND_URL || "https://ticketfu-font-end.vercel.app"
      }/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"${process.env.APP_NAME || "FuEvent"}" <${process.env.SMTP_USER
        }>`,
      to: email,
      subject: "🔐 Yêu cầu đặt lại mật khẩu",
      text: `
Yêu cầu đặt lại mật khẩu

Xin chào,

Bạn vừa gửi yêu cầu đặt lại mật khẩu cho tài khoản của mình. Nếu đó không phải là bạn, vui lòng bỏ qua email này.

Để đặt lại mật khẩu, vui lòng truy cập liên kết sau:
${resetUrl}

Liên kết này sẽ hết hạn trong 1 giờ.

Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng không làm gì cả. Tài khoản của bạn sẽ vẫn an toàn.

Nếu liên kết không hoạt động, hãy sao chép và dán URL này vào trình duyệt của bạn:
${resetUrl}

---
Email này được gửi tự động từ hệ thống ${process.env.APP_NAME || "FuEvent"}.
Vui lòng không trả lời email này.
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🔐 Đặt lại mật khẩu</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Yêu cầu đặt lại mật khẩu của bạn</p>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Xin chào,
            </p>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Bạn vừa gửi yêu cầu đặt lại mật khẩu cho tài khoản của mình. 
              Nhấp vào nút bên dưới để tạo mật khẩu mới:
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);">
                🔑 Đặt lại mật khẩu
              </a>
            </div>

            <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0; color: #856404;">⚠️ Lưu ý quan trọng:</h4>
              <p style="margin: 0; color: #856404; font-size: 14px;">
                Liên kết này sẽ hết hạn trong <strong>1 giờ</strong>. 
                Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
              </p>
            </div>

            <p style="color: #555; font-size: 14px; line-height: 1.6;">
              Nếu nút trên không hoạt động, hãy sao chép và dán liên kết sau vào trình duyệt của bạn:
            </p>
            <p style="word-break: break-all; color: #666; font-size: 12px; background-color: #f0f0f0; padding: 10px; border-radius: 4px;">
              ${resetUrl}
            </p>

            <div style="background-color: #f0f7ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0; color: #0050b3;">🛡️ Bảo mật:</h4>
              <p style="margin: 0; color: #0050b3; font-size: 14px;">
                Nếu bạn không yêu cầu đặt lại mật khẩu, tài khoản của bạn vẫn an toàn. 
                Không ai có thể truy cập tài khoản của bạn nếu không có mật khẩu của bạn.
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
            
            <p style="font-size: 12px; color: #666; line-height: 1.6;">
              <strong>Cần hỗ trợ?</strong> Nếu bạn gặp bất kỳ vấn đề nào, vui lòng liên hệ với đội hỗ trợ của chúng tôi.
            </p>
            
            <p style="font-size: 11px; color: #999; margin: 10px 0 0 0;">
              Email này được gửi tự động từ hệ thống ${process.env.APP_NAME || "FuEvent"}.<br>
              Vui lòng không trả lời email này.
            </p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Password reset email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error("Failed to send password reset email");
  }
};

// Send welcome email
const sendWelcomeEmail = async (email, username) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.APP_NAME || "FuEvent"}" <${process.env.SMTP_USER
        }>`,
      to: email,
      subject: `🎉 Chào mừng bạn đến với ${process.env.APP_NAME || "FuEvent"}!`,
      text: `
Chào mừng bạn, ${username}!

Cảm ơn bạn đã tham gia cộng đồng của chúng tôi. Tài khoản của bạn đã được tạo thành công.

Tên tài khoản: ${username}
Email: ${email}
Thời gian đăng ký: ${new Date().toLocaleString("vi-VN")}

Bây giờ bạn có thể đăng nhập và bắt đầu sử dụng các tính năng của nền tảng:
- Tìm kiếm và đăng ký các sự kiện thú vị
- Quản lý vé và đặt chỗ của bạn
- Chia sẻ sự kiện với bạn bè
- Nhận thông báo về các sự kiện mà bạn quan tâm

Để đăng nhập, vui lòng truy cập: ${process.env.FRONTEND_URL || "https://ticketfu-font-end.vercel.app"
        }/signin

Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với đội hỗ trợ của chúng tôi.

---
Email này được gửi tự động từ hệ thống của FuEvent.
Vui lòng không trả lời email này.
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Chào mừng bạn!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Tham gia cộng đồng FuEvent ngay!</p>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333; margin-top: 0;">Xin chào <strong>${username}</strong>,</h2>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Cảm ơn bạn đã tham gia cộng đồng <strong>${process.env.APP_NAME || "FuEvent"}</strong>. 
              Tài khoản của bạn đã được tạo thành công và bây giờ bạn có thể bắt đầu khám phá thế giới sự kiện!
            </p>
            
            <div style="background-color: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 4px;">
              <h3 style="margin: 0 0 15px 0; color: #667eea;">📋 Thông tin tài khoản của bạn</h3>
              <p style="margin: 8px 0;"><strong>Tên tài khoản:</strong> ${username}</p>
              <p style="margin: 8px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 8px 0;"><strong>Thời gian đăng ký:</strong> ${new Date().toLocaleString(
        "vi-VN"
      )}</p>
            </div>

            <h3 style="color: #333; margin-top: 25px;">🚀 Bạn có thể làm gì tiếp theo?</h3>
            <ul style="color: #555; line-height: 2; padding-left: 20px;">
              <li>🔍 Tìm kiếm và khám phá các sự kiện thú vị trong khu vực của bạn</li>
              <li>🎟️ Đăng ký tham gia các sự kiện yêu thích</li>
              <li>📱 Quản lý vé và lịch sự kiện của bạn</li>
              <li>💬 Chia sẻ sự kiện với bạn bè</li>
              <li>🔔 Nhận thông báo về các sự kiện mới</li>
            </ul>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || "https://ticketfu-font-end.vercel.app"
        }/signin" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                🔐 Đăng nhập ngay
              </a>
            </div>

            <div style="background-color: #f0f7ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0; color: #0050b3;">💡 Mẹo:</h4>
              <p style="margin: 0; color: #0050b3; font-size: 14px;">
                Để có trải nghiệm tốt nhất, hãy hoàn thành hồ sơ của bạn và thêm ảnh đại diện. 
                Điều này sẽ giúp cộng đồng biết bạn hơn!
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
            
            <p style="font-size: 12px; color: #666; line-height: 1.6;">
              <strong>Cần hỗ trợ?</strong> Nếu bạn gặp bất kỳ sự cố nào trong quá trình đăng nhập hoặc sử dụng dịch vụ, 
              vui lòng liên hệ với đội hỗ trợ của chúng tôi.
            </p>
            
            <p style="font-size: 11px; color: #999; margin: 10px 0 0 0;">
              Email này được gửi tự động từ hệ thống ${process.env.APP_NAME || "FuEvent"}.<br>
              Vui lòng không trả lời email này.
            </p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Welcome email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending welcome email:", error);
    throw new Error("Failed to send welcome email");
  }
};

// Test email sending function
const testEmailSending = async (testEmail = "ducbmhe176457@fpt.edu.vn") => {
  try {
    console.log("🧪 Testing email sending...");
    const transporter = createTransporter();

    // Test transporter connection
    try {
      await transporter.verify();
      console.log("✅ SMTP connection verified successfully");
    } catch (verifyError) {
      console.error("❌ SMTP connection failed:", verifyError);
      return {
        success: false,
        message: "SMTP connection failed",
        error: verifyError.message,
      };
    }

    const mailOptions = {
      from: `"${process.env.APP_NAME || "Event Management System"}" <${process.env.SMTP_USER
        }>`,
      to: testEmail,
      subject: "🧪 Test Email - Email Service Verification",
      text: "This is a test email to verify that the email service is working correctly.",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">🧪 Test Email</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333;">Email Service Verification</h2>
            
            <p>This is a test email to verify that the email service is working correctly.</p>
            
            <div style="background-color: white; padding: 15px; border-left: 4px solid #4CAF50; margin: 15px 0; border-radius: 4px;">
              <h3 style="margin: 0 0 10px 0; color: #4CAF50;">✅ Email Service Status</h3>
              <p style="margin: 5px 0;"><strong>SMTP Host:</strong> ${process.env.SMTP_HOST
        }</p>
              <p style="margin: 5px 0;"><strong>SMTP Port:</strong> ${process.env.SMTP_PORT
        }</p>
              <p style="margin: 5px 0;"><strong>From Email:</strong> ${process.env.SMTP_USER
        }</p>
              <p style="margin: 5px 0;"><strong>Test Time:</strong> ${new Date().toLocaleString(
          "vi-VN"
        )}</p>
            </div>
            
            <p>If you received this email, the email service is working correctly!</p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            
            <p style="font-size: 12px; color: #666;">
              This is a test email from the Event Management System.<br>
              Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    };

    console.log(`📧 Attempting to send test email to: ${testEmail}`);
    const result = await transporter.sendMail(mailOptions);
    console.log(
      `✅ Test email sent successfully - Message ID: ${result.messageId}`
    );

    return {
      success: true,
      messageId: result.messageId,
      message: "Test email sent successfully",
    };
  } catch (error) {
    console.error("❌ Test email failed:", error);
    return {
      success: false,
      error: error.message,
      message: "Test email failed",
    };
  }
};

// Helper function to send notification emails to participants (shared logic)
const sendNotificationToParticipants = async (eventId, emailSubject, emailHTML, emailText) => {
  try {
    const transporter = createTransporter();

    // Test transporter connection
    try {
      await transporter.verify();
      console.log("✅ SMTP connection verified successfully");
    } catch (verifyError) {
      console.error("❌ SMTP connection failed:", verifyError);
      return {
        success: false,
        message: "SMTP connection failed",
        error: verifyError.message,
      };
    }

    // Get event details
    const event = await Event.findById(eventId)
      .populate("category_id", "name");

    if (!event) {
      console.log("❌ Event not found");
      return { success: false, message: "Event not found" };
    }

    // Get all participants who bought tickets/merch
    const participants = await getEventParticipants(eventId);

    if (participants.length === 0) {
      console.log("⚠️ No participants found for this event");
      return { success: true, message: "No participants to notify", sentTo: 0, total: 0 };
    }

    console.log(`📋 Found ${participants.length} participants to notify`);

    // Send email to each participant
    const emailPromises = participants.map(async (participant) => {
      try {
        const mailOptions = {
          from: `"${process.env.APP_NAME || "Event Management System"}" <${process.env.SMTP_USER
            }>`,
          to: participant.email,
          subject: emailSubject,
          text: emailText,
          html: emailHTML,
        };

        console.log(`📧 Attempting to send email to participant: ${participant.email}`);
        const result = await transporter.sendMail(mailOptions);
        console.log(
          `✅ Email sent successfully to participant: ${participant.full_name || participant.email} (${participant.email}) - Message ID: ${result.messageId}`
        );
        return {
          success: true,
          email: participant.email,
          messageId: result.messageId,
        };
      } catch (error) {
        console.error(
          `❌ Failed to send email to participant: ${participant.email}`,
          error
        );
        return { success: false, email: participant.email, error: error.message };
      }
    });

    // Wait for all emails to be sent
    const results = await Promise.allSettled(emailPromises);

    // Log results
    let successCount = 0;
    let failedEmails = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.success) {
        successCount++;
      } else {
        const participant = participants[index];
        const error =
          result.status === "fulfilled" ? result.value.error : result.reason;
        failedEmails.push({ email: participant.email, error });
        console.error(
          `❌ Failed to send email to participant: ${participant.email}`,
          error
        );
      }
    });

    return {
      success: successCount > 0,
      sentTo: successCount,
      total: participants.length,
      failedEmails: failedEmails,
    };
  } catch (error) {
    console.error("❌ Error in sendNotificationToParticipants:", error);
    return {
      success: false,
      error: error.message,
      message: "Failed to send notification to participants",
    };
  }
};

// Helper function to get all participants who bought tickets/merch for an event
const getEventParticipants = async (eventId) => {
  try {
    // Get all products (tickets/merch) for this event
    const products = await Product.find({ event_id: eventId }).select("_id");
    const productIds = products.map(p => p._id);

    if (productIds.length === 0) {
      return [];
    }

    // Get all order items for these products
    const orderItems = await OrderItem.find({
      product_id: { $in: productIds }
    }).select("order_id");

    const orderIds = [...new Set(orderItems.map(oi => oi.order_id.toString()))];

    if (orderIds.length === 0) {
      return [];
    }

    // Get all paid orders
    const orders = await Order.find({
      _id: { $in: orderIds },
      status: "paid"
    }).select("user_id").populate("user_id", "email full_name");

    // Get unique users
    const uniqueUsers = [];
    const seenUserIds = new Set();

    orders.forEach(order => {
      if (order.user_id && !seenUserIds.has(order.user_id._id.toString())) {
        seenUserIds.add(order.user_id._id.toString());
        uniqueUsers.push({
          _id: order.user_id._id,
          email: order.user_id.email,
          full_name: order.user_id.full_name
        });
      }
    });

    return uniqueUsers;
  } catch (error) {
    console.error("Error getting event participants:", error);
    return [];
  }
};

// Send notification to participants when organizer updates approved event
const sendEventUpdateNotificationToParticipants = async (eventId, changes) => {
  try {
    console.log(`📧 Starting to send event update notification to participants for event: ${eventId}`);

    // Get event details for email content
    const event = await Event.findById(eventId)
      .populate("category_id", "name");

    if (!event) {
      console.log("❌ Event not found");
      return { success: false, message: "Event not found" };
    }

    const eventTitle = event.title;
    const eventCategory = event.category_id?.name || "Không có danh mục";
    const eventLocation = event.location;
    const eventStartTime = new Date(event.start_time).toLocaleString("vi-VN");
    const eventEndTime = new Date(event.end_time).toLocaleString("vi-VN");

    // Format changes list
    const changesList = (changes && Array.isArray(changes) && changes.length > 0)
      ? changes.map(change => `<li><strong>${change.field}:</strong> ${change.description}</li>`).join("")
      : "<li>Thông tin sự kiện đã được cập nhật</li>";

    // Email content in Vietnamese
    const emailSubject = `📝 Cập nhật sự kiện: ${eventTitle}`;
    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1890ff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">📝 Thông báo cập nhật sự kiện</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333;">Sự kiện bạn đã đăng ký đã được cập nhật</h2>
          
          <p>Xin chào,</p>
          
          <p>Chúng tôi thông báo rằng sự kiện bạn đã mua vé/merchandise đã được người tổ chức cập nhật:</p>
          
          <div style="background-color: white; padding: 15px; border-left: 4px solid #1890ff; margin: 15px 0; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #1890ff;">📅 ${eventTitle}</h3>
            <p style="margin: 5px 0;"><strong>Danh mục:</strong> ${eventCategory}</p>
            <p style="margin: 5px 0;"><strong>Địa điểm:</strong> ${eventLocation}</p>
            <p style="margin: 5px 0;"><strong>Thời gian:</strong> ${eventStartTime} - ${eventEndTime}</p>
          </div>

          <div style="background-color: #fff7e6; border: 1px solid #ffd591; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <h4 style="margin: 0 0 10px 0; color: #d46b08;">📋 Các thay đổi:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #d46b08;">
              ${changesList}
            </ul>
          </div>

          <div style="background-color: #f0f7ff; border: 1px solid #91d5ff; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <h4 style="margin: 0 0 10px 0; color: #0050b3;">ℹ️ Lưu ý:</h4>
            <p style="margin: 0; color: #0050b3;">
              Sự kiện đã được cập nhật và đang chờ quản trị viên phê duyệt lại. 
              Sau khi được phê duyệt, bạn sẽ nhận được thông báo về các thay đổi cụ thể.
            </p>
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="https://ticketfu-font-end.vercel.app/events/${eventId}" 
               style="background-color: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              👀 Xem chi tiết sự kiện
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          
          <p style="font-size: 12px; color: #666;">
            Email này được gửi tự động từ hệ thống quản lý sự kiện.<br>
            Vui lòng không trả lời email này.
          </p>
        </div>
      </div>
    `;

    const emailText = `
Thông báo cập nhật sự kiện

Xin chào,

Chúng tôi thông báo rằng sự kiện bạn đã mua vé/merchandise đã được người tổ chức cập nhật:

📅 ${eventTitle}
Danh mục: ${eventCategory}
Địa điểm: ${eventLocation}
Thời gian: ${eventStartTime} - ${eventEndTime}

Các thay đổi:
${(changes && Array.isArray(changes) && changes.length > 0) ? changes.map(change => `- ${change.field}: ${change.description}`).join("\n") : "- Thông tin sự kiện đã được cập nhật"}

Lưu ý: Sự kiện đã được cập nhật và đang chờ quản trị viên phê duyệt lại. Sau khi được phê duyệt, bạn sẽ nhận được thông báo về các thay đổi cụ thể.

Link xem sự kiện: https://ticketfu-font-end.vercel.app/events/${eventId}

---
Email này được gửi tự động từ hệ thống quản lý sự kiện.
Vui lòng không trả lời email này.
    `;

    // Use helper function to send emails
    const result = await sendNotificationToParticipants(eventId, emailSubject, emailHTML, emailText);

    if (result.success) {
      console.log(
        `📧 Event update notification sent to ${result.sentTo}/${result.total} participants`
      );
    }

    return result;
  } catch (error) {
    console.error("❌ Error in sendEventUpdateNotificationToParticipants:", error);
    return {
      success: false,
      error: error.message,
      message: "Failed to send event update notification to participants",
    };
  }
};

// Send notification to participants when admin re-approves event with changes
const sendEventReapprovalNotificationToParticipants = async (eventId, changes) => {
  try {
    console.log(`📧 Starting to send event re-approval notification to participants for event: ${eventId}`);

    // Get event details for email content
    const event = await Event.findById(eventId)
      .populate("category_id", "name");

    if (!event) {
      console.log("❌ Event not found");
      return { success: false, message: "Event not found" };
    }

    const eventTitle = event.title;
    const eventCategory = event.category_id?.name || "Không có danh mục";
    const eventLocation = event.location;
    const eventStartTime = new Date(event.start_time).toLocaleString("vi-VN");
    const eventEndTime = new Date(event.end_time).toLocaleString("vi-VN");

    // Format changes list
    const changesList = (changes && Array.isArray(changes) && changes.length > 0)
      ? changes.map(change => `<li><strong>${change.field}:</strong> ${change.description}</li>`).join("")
      : "<li>Thông tin sự kiện đã được cập nhật</li>";

    // Email content in Vietnamese
    const emailSubject = `✅ Sự kiện "${eventTitle}" đã được phê duyệt lại`;
    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #52c41a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">✅ Thông báo phê duyệt lại sự kiện</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333;">Sự kiện bạn đã đăng ký đã được phê duyệt lại</h2>
          
          <p>Xin chào,</p>
          
          <p>Chúng tôi thông báo rằng sự kiện bạn đã mua vé/merchandise đã được quản trị viên phê duyệt lại sau khi được cập nhật:</p>
          
          <div style="background-color: white; padding: 15px; border-left: 4px solid #52c41a; margin: 15px 0; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #52c41a;">📅 ${eventTitle}</h3>
            <p style="margin: 5px 0;"><strong>Danh mục:</strong> ${eventCategory}</p>
            <p style="margin: 5px 0;"><strong>Địa điểm:</strong> ${eventLocation}</p>
            <p style="margin: 5px 0;"><strong>Thời gian:</strong> ${eventStartTime} - ${eventEndTime}</p>
            <p style="margin: 5px 0;"><strong>Trạng thái:</strong> <span style="color: #52c41a; font-weight: bold;">Đã được phê duyệt</span></p>
          </div>

          <div style="background-color: #f6ffed; border: 1px solid #b7eb8f; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <h4 style="margin: 0 0 10px 0; color: #389e0d;">📋 Các thay đổi đã được phê duyệt:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #389e0d;">
              ${changesList}
            </ul>
          </div>

          <div style="background-color: #f0f7ff; border: 1px solid #91d5ff; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <h4 style="margin: 0 0 10px 0; color: #0050b3;">💡 Lưu ý:</h4>
            <p style="margin: 0; color: #0050b3;">
              Vui lòng kiểm tra lại thông tin sự kiện để đảm bảo bạn nắm được các thay đổi mới nhất. 
              Vé/merchandise của bạn vẫn hợp lệ và có thể sử dụng cho sự kiện này.
            </p>
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="https://ticketfu-font-end.vercel.app/events/${eventId}" 
               style="background-color: #52c41a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              👀 Xem chi tiết sự kiện
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          
          <p style="font-size: 12px; color: #666;">
            Email này được gửi tự động từ hệ thống quản lý sự kiện.<br>
            Vui lòng không trả lời email này.
          </p>
        </div>
      </div>
    `;

    const emailText = `
Thông báo phê duyệt lại sự kiện

Xin chào,

Chúng tôi thông báo rằng sự kiện bạn đã mua vé/merchandise đã được quản trị viên phê duyệt lại sau khi được cập nhật:

📅 ${eventTitle}
Danh mục: ${eventCategory}
Địa điểm: ${eventLocation}
Thời gian: ${eventStartTime} - ${eventEndTime}
Trạng thái: Đã được phê duyệt

Các thay đổi đã được phê duyệt:
${(changes && Array.isArray(changes) && changes.length > 0) ? changes.map(change => `- ${change.field}: ${change.description}`).join("\n") : "- Thông tin sự kiện đã được cập nhật"}

Lưu ý: Vui lòng kiểm tra lại thông tin sự kiện để đảm bảo bạn nắm được các thay đổi mới nhất. Vé/merchandise của bạn vẫn hợp lệ và có thể sử dụng cho sự kiện này.

Link xem sự kiện: https://ticketfu-font-end.vercel.app/events/${eventId}

---
Email này được gửi tự động từ hệ thống quản lý sự kiện.
Vui lòng không trả lời email này.
    `;

    // Use helper function to send emails
    const result = await sendNotificationToParticipants(eventId, emailSubject, emailHTML, emailText);

    if (result.success) {
      console.log(
        `📧 Event re-approval notification sent to ${result.sentTo}/${result.total} participants`
      );
    }

    return result;
  } catch (error) {
    console.error("❌ Error in sendEventReapprovalNotificationToParticipants:", error);
    return {
      success: false,
      error: error.message,
      message: "Failed to send event re-approval notification to participants",
    };
  }
};

// Send admin password reset notification
const sendAdminPasswordResetEmail = async (email, username, defaultPassword) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.APP_NAME || "FuEvent"}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "🔐 Mật khẩu mới của bạn đã được thiết lập",
      text: `
Thông báo mật khẩu mới

Xin chào ${username},

Quản trị viên đã thiết lập lại mật khẩu cho tài khoản của bạn.

Thông tin tài khoản:
- Email: ${email}
- Tên người dùng: ${username}
- Mật khẩu mới: ${defaultPassword}

Vui lòng đăng nhập và đổi mật khẩu ngay sau khi đăng nhập để bảo mật tài khoản.

Đăng nhập tại: ${process.env.FRONTEND_URL || "https://ticketfu-font-end.vercel.app"}/signin

Lưu ý quan trọng:
- Mật khẩu này chỉ là tạm thời
- Vui lòng đổi mật khẩu ngay sau khi đăng nhập
- Không chia sẻ mật khẩu với bất kỳ ai

Nếu bạn không yêu cầu reset mật khẩu, vui lòng liên hệ ngay với quản trị viên.

---
Email này được gửi tự động từ hệ thống ${process.env.APP_NAME || "FuEvent"}.
Vui lòng không trả lời email này.
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🔐 Mật khẩu mới</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Quản trị viên đã thiết lập lại mật khẩu của bạn</p>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Xin chào <strong>${username}</strong>,
            </p>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Quản trị viên đã thiết lập lại mật khẩu cho tài khoản của bạn. 
              Dưới đây là thông tin mật khẩu mới:
            </p>

            <div style="background-color: white; padding: 20px; border-left: 4px solid #ff6b6b; margin: 20px 0; border-radius: 4px;">
              <h3 style="margin: 0 0 15px 0; color: #ff6b6b;">📋 Thông tin tài khoản</h3>
              <p style="margin: 8px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 8px 0;"><strong>Tên người dùng:</strong> ${username}</p>
              <p style="margin: 8px 0;"><strong>Mật khẩu mới:</strong> 
                <span style="background-color: #fff3cd; padding: 4px 8px; border-radius: 3px; font-family: monospace; font-weight: bold;">
                  ${defaultPassword}
                </span>
              </p>
              <p style="margin: 8px 0;"><strong>Thời gian reset:</strong> ${new Date().toLocaleString("vi-VN")}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || "https://ticketfu-font-end.vercel.app"}/signin" 
                 style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);">
                🔐 Đăng nhập ngay
              </a>
            </div>

            <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0; color: #856404;">⚠️ Lưu ý bảo mật quan trọng:</h4>
              <ul style="margin: 0; color: #856404; font-size: 14px; padding-left: 20px;">
                <li>Mật khẩu này chỉ là tạm thời</li>
                <li>Vui lòng đổi mật khẩu ngay sau khi đăng nhập</li>
                <li>Không chia sẻ mật khẩu với bất kỳ ai</li>
                <li>Nếu bạn không yêu cầu reset mật khẩu, hãy liên hệ quản trị viên ngay</li>
              </ul>
            </div>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
            
            <p style="font-size: 12px; color: #666; line-height: 1.6;">
              <strong>Cần hỗ trợ?</strong> Nếu bạn có bất kỳ câu hỏi nào hoặc không yêu cầu reset mật khẩu này, 
              vui lòng liên hệ ngay với đội hỗ trợ của chúng tôi.
            </p>
            
            <p style="font-size: 11px; color: #999; margin: 10px 0 0 0;">
              Email này được gửi tự động từ hệ thống ${process.env.APP_NAME || "FuEvent"}.<br>
              Vui lòng không trả lời email này.
            </p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Admin password reset email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending admin password reset email:", error);
    throw new Error("Failed to send admin password reset email");
  }
};

// Send event closed notification to event organizer
const sendEventClosedNotification = async (eventId, closureReason = "") => {
  try {
    console.log(`📧 Starting to send closed notification for event: ${eventId}`);
    console.log(`📧 Closure reason: ${closureReason}`);

    const transporter = createTransporter();

    // Test transporter connection
    try {
      await transporter.verify();
      console.log("✅ SMTP connection verified successfully");
    } catch (verifyError) {
      console.error("❌ SMTP connection failed:", verifyError);
      return {
        success: false,
        message: "SMTP connection failed",
        error: verifyError.message,
      };
    }

    // Get event details with organizer information
    const event = await Event.findById(eventId)
      .populate("seller_id", "email full_name")
      .populate("category_id", "name");

    if (!event) {
      console.log("❌ Event not found");
      return { success: false, message: "Event not found" };
    }

    if (!event.seller_id || !event.seller_id.email) {
      console.log("❌ Event organizer email not found");
      return { success: false, message: "Event organizer email not found" };
    }

    const organizerEmail = event.seller_id.email;
    const organizerName = event.seller_id.full_name || "Người tổ chức";
    const eventTitle = event.title;
    const eventCategory = event.category_id?.name || "Không có danh mục";
    const eventLocation = event.location;
    const eventStartTime = new Date(event.start_time).toLocaleString("vi-VN");
    const eventEndTime = new Date(event.end_time).toLocaleString("vi-VN");

    console.log(`📋 Sending closed notification to organizer: ${organizerName} (${organizerEmail})`);

    // Email content in Vietnamese
    const emailSubject = `🚫 Sự kiện "${eventTitle}" đã bị đóng bắt buộc`;
    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ff4d4f; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">🚫 Thông báo đóng sự kiện</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333;">Sự kiện của bạn đã bị đóng bắt buộc</h2>
          
          <p>Xin chào <strong>${organizerName}</strong>,</p>
          
          <p>Chúng tôi rất tiếc phải thông báo rằng sự kiện của bạn đã bị đóng bắt buộc bởi quản trị viên:</p>
          
          <div style="background-color: white; padding: 15px; border-left: 4px solid #ff4d4f; margin: 15px 0; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #ff4d4f;">📅 ${eventTitle}</h3>
            <p style="margin: 5px 0;"><strong>Danh mục:</strong> ${eventCategory}</p>
            <p style="margin: 5px 0;"><strong>Địa điểm:</strong> ${eventLocation}</p>
            <p style="margin: 5px 0;"><strong>Thời gian:</strong> ${eventStartTime} - ${eventEndTime}</p>
            <p style="margin: 5px 0;"><strong>Trạng thái:</strong> <span style="color: #ff4d4f; font-weight: bold;">Đã bị đóng bắt buộc</span></p>
            <p style="margin: 5px 0;"><strong>Thời gian đóng:</strong> ${new Date().toLocaleString("vi-VN")}</p>
          </div>

          ${closureReason
        ? `
          <div style="background-color: #fff2f0; border: 1px solid #ffccc7; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <h4 style="margin: 0 0 10px 0; color: #a8071a;">📝 Lý do đóng sự kiện:</h4>
            <p style="margin: 0; color: #a8071a; white-space: pre-line;">${closureReason}</p>
          </div>
          `
        : `
          <div style="background-color: #fff2f0; border: 1px solid #ffccc7; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <h4 style="margin: 0 0 10px 0; color: #a8071a;">📝 Lý do đóng sự kiện:</h4>
            <p style="margin: 0; color: #a8071a;">Không có lý do cụ thể được cung cấp.</p>
          </div>
          `
      }
          
          <div style="background-color: #f6ffed; border: 1px solid #b7eb8f; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <h4 style="margin: 0 0 10px 0; color: #389e0d;">ℹ️ Thông tin quan trọng:</h4>
            <ul style="margin: 0; color: #389e0d;">
              <li>Sự kiện này sẽ không còn hiển thị công khai</li>
              <li>Người tham gia sẽ nhận được thông báo về việc hủy sự kiện</li>
              <li>Vé đã mua sẽ được hoàn tiền theo chính sách của nền tảng</li>
              <li>Bạn có thể liên hệ với quản trị viên để biết thêm chi tiết</li>
            </ul>
          </div>

          <p>Nếu bạn có bất kỳ thắc mắc nào về quyết định này, vui lòng liên hệ với đội ngũ quản trị viên.</p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          
          <p style="font-size: 12px; color: #666;">
            Email này được gửi tự động từ hệ thống quản lý sự kiện.<br>
            Vui lòng không trả lời email này.
          </p>
        </div>
      </div>
    `;

    const emailText = `
Thông báo đóng sự kiện

Xin chào ${organizerName},

Chúng tôi rất tiếc phải thông báo rằng sự kiện của bạn đã bị đóng bắt buộc bởi quản trị viên:

📅 ${eventTitle}
Danh mục: ${eventCategory}
Địa điểm: ${eventLocation}
Thời gian: ${eventStartTime} - ${eventEndTime}
Trạng thái: Đã bị đóng bắt buộc
${closureReason
        ? `Lý do đóng: ${closureReason}`
        : "Lý do: Không có lý do cụ thể được cung cấp."
      }
Thời gian đóng: ${new Date().toLocaleString("vi-VN")}

Thông tin quan trọng:
- Sự kiện này sẽ không còn hiển thị công khai
- Người tham gia sẽ nhận được thông báo về việc hủy sự kiện
- Vé đã mua sẽ được hoàn tiền theo chính sách của nền tảng
- Bạn có thể liên hệ với quản trị viên để biết thêm chi tiết

Nếu bạn có bất kỳ thắc mắc nào về quyết định này, vui lòng liên hệ với đội ngũ quản trị viên.

---
Email này được gửi tự động từ hệ thống quản lý sự kiện.
Vui lòng không trả lời email này.
    `;

    // Send email to organizer
    const mailOptions = {
      from: `"${process.env.APP_NAME || "Event Management System"}" <${process.env.SMTP_USER
        }>`,
      to: organizerEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHTML,
    };

    console.log(`📧 Attempting to send closed email to organizer: ${organizerEmail}`);
    const result = await transporter.sendMail(mailOptions);
    console.log(
      `✅ Closed email sent successfully to organizer: ${organizerName} (${organizerEmail}) - Message ID: ${result.messageId}`
    );

    return {
      success: true,
      messageId: result.messageId,
      organizerEmail: organizerEmail,
      organizerName: organizerName,
      eventTitle: eventTitle,
      closureReason: closureReason,
    };
  } catch (error) {
    console.error("❌ Error in sendEventClosedNotification:", error);
    return {
      success: false,
      error: error.message,
      message: "Failed to send closed notification",
    };
  }
};

// Send event closed notification to participants who bought tickets/merch
const sendEventClosedNotificationToParticipants = async (eventId, closureReason = "") => {
  try {
    console.log(`📧 Starting to send closed notification to participants for event: ${eventId}`);
    console.log(`📧 Closure reason: ${closureReason}`);

    const transporter = createTransporter();

    // Test transporter connection
    try {
      await transporter.verify();
      console.log("✅ SMTP connection verified successfully");
    } catch (verifyError) {
      console.error("❌ SMTP connection failed:", verifyError);
      return {
        success: false,
        message: "SMTP connection failed",
        error: verifyError.message,
      };
    }

    // Get event details
    const event = await Event.findById(eventId)
      .populate("category_id", "name")
      .populate("seller_id", "full_name");

    if (!event) {
      console.log("❌ Event not found");
      return { success: false, message: "Event not found" };
    }

    const eventTitle = event.title;
    const eventCategory = event.category_id?.name || "Không có danh mục";
    const eventLocation = event.location;
    const eventStartTime = new Date(event.start_time).toLocaleString("vi-VN");
    const eventEndTime = new Date(event.end_time).toLocaleString("vi-VN");
    const organizerName = event.seller_id?.full_name || "Người tổ chức";

    // Get all participants who bought tickets/merch
    const participants = await getEventParticipants(eventId);

    if (participants.length === 0) {
      console.log("⚠️ No participants found for this event");
      return { success: true, message: "No participants to notify", sentTo: 0, total: 0 };
    }

    console.log(`📋 Found ${participants.length} participants to notify`);

    // Email content in Vietnamese
    const emailSubject = `🚫 Sự kiện "${eventTitle}" đã bị hủy`;
    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ff4d4f; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">🚫 Thông báo hủy sự kiện</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333;">Sự kiện bạn đã đăng ký đã bị hủy</h2>
          
          <p>Xin chào,</p>
          
          <p>Chúng tôi rất tiếc phải thông báo rằng sự kiện bạn đã mua vé/merchandise đã bị hủy:</p>
          
          <div style="background-color: white; padding: 15px; border-left: 4px solid #ff4d4f; margin: 15px 0; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #ff4d4f;">📅 ${eventTitle}</h3>
            <p style="margin: 5px 0;"><strong>Người tổ chức:</strong> ${organizerName}</p>
            <p style="margin: 5px 0;"><strong>Danh mục:</strong> ${eventCategory}</p>
            <p style="margin: 5px 0;"><strong>Địa điểm:</strong> ${eventLocation}</p>
            <p style="margin: 5px 0;"><strong>Thời gian dự kiến:</strong> ${eventStartTime} - ${eventEndTime}</p>
            <p style="margin: 5px 0;"><strong>Trạng thái:</strong> <span style="color: #ff4d4f; font-weight: bold;">Đã bị hủy</span></p>
            <p style="margin: 5px 0;"><strong>Thời gian hủy:</strong> ${new Date().toLocaleString("vi-VN")}</p>
          </div>

          ${closureReason
            ? `
          <div style="background-color: #fff2f0; border: 1px solid #ffccc7; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <h4 style="margin: 0 0 10px 0; color: #a8071a;">📝 Lý do hủy sự kiện:</h4>
            <p style="margin: 0; color: #a8071a; white-space: pre-line;">${closureReason}</p>
          </div>
          `
            : `
          <div style="background-color: #fff2f0; border: 1px solid #ffccc7; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <h4 style="margin: 0 0 10px 0; color: #a8071a;">📝 Lý do hủy sự kiện:</h4>
            <p style="margin: 0; color: #a8071a;">Sự kiện đã bị hủy bởi người tổ chức hoặc quản trị viên.</p>
          </div>
          `
          }
          
          <div style="background-color: #f6ffed; border: 1px solid #b7eb8f; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <h4 style="margin: 0 0 10px 0; color: #389e0d;">💰 Thông tin hoàn tiền:</h4>
            <p style="margin: 0; color: #389e0d;">
              Tất cả vé và merchandise đã mua cho sự kiện này sẽ được hoàn tiền tự động. 
              Số tiền sẽ được chuyển về tài khoản/tài khoản ngân hàng của bạn trong vòng 5-7 ngày làm việc.
            </p>
          </div>

          <div style="background-color: #f0f7ff; border: 1px solid #91d5ff; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <h4 style="margin: 0 0 10px 0; color: #0050b3;">❓ Cần hỗ trợ?</h4>
            <p style="margin: 0; color: #0050b3;">
              Nếu bạn không nhận được hoàn tiền sau 7 ngày làm việc hoặc có bất kỳ câu hỏi nào, 
              vui lòng liên hệ với bộ phận hỗ trợ khách hàng của chúng tôi.
            </p>
          </div>

          <p>Chúng tôi chân thành xin lỗi vì sự bất tiện này và hy vọng được phục vụ bạn trong các sự kiện sắp tới.</p>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="https://ticketfu-font-end.vercel.app/events" 
               style="background-color: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              🔍 Khám phá sự kiện khác
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          
          <p style="font-size: 12px; color: #666;">
            Email này được gửi tự động từ hệ thống quản lý sự kiện.<br>
            Vui lòng không trả lời email này.
          </p>
        </div>
      </div>
    `;

    const emailText = `
Thông báo hủy sự kiện

Xin chào,

Chúng tôi rất tiếc phải thông báo rằng sự kiện bạn đã mua vé/merchandise đã bị hủy:

📅 ${eventTitle}
Người tổ chức: ${organizerName}
Danh mục: ${eventCategory}
Địa điểm: ${eventLocation}
Thời gian dự kiến: ${eventStartTime} - ${eventEndTime}
Trạng thái: Đã bị hủy
${closureReason
        ? `Lý do hủy: ${closureReason}`
        : "Lý do: Sự kiện đã bị hủy bởi người tổ chức hoặc quản trị viên."
      }
Thời gian hủy: ${new Date().toLocaleString("vi-VN")}

THÔNG TIN HOÀN TIỀN:
Tất cả vé và merchandise đã mua cho sự kiện này sẽ được hoàn tiền tự động. 
Số tiền sẽ được chuyển về tài khoản/tài khoản ngân hàng của bạn trong vòng 5-7 ngày làm việc.

CẦN HỖ TRỢ?
Nếu bạn không nhận được hoàn tiền sau 7 ngày làm việc hoặc có bất kỳ câu hỏi nào, 
vui lòng liên hệ với bộ phận hỗ trợ khách hàng của chúng tôi.

Chúng tôi chân thành xin lỗi vì sự bất tiện này và hy vọng được phục vụ bạn trong các sự kiện sắp tới.

Khám phá sự kiện khác: https://ticketfu-font-end.vercel.app/events

---
Email này được gửi tự động từ hệ thống quản lý sự kiện.
Vui lòng không trả lời email này.
    `;

    // Send email to each participant
    const emailPromises = participants.map(async (participant) => {
      try {
        const mailOptions = {
          from: `"${process.env.APP_NAME || "Event Management System"}" <${process.env.SMTP_USER
            }>`,
          to: participant.email,
          subject: emailSubject,
          text: emailText,
          html: emailHTML,
        };

        console.log(`📧 Attempting to send closed notification to participant: ${participant.email}`);
        const result = await transporter.sendMail(mailOptions);
        console.log(
          `✅ Closed notification sent successfully to participant: ${participant.full_name || participant.email} (${participant.email}) - Message ID: ${result.messageId}`
        );
        return {
          success: true,
          email: participant.email,
          messageId: result.messageId,
        };
      } catch (error) {
        console.error(
          `❌ Failed to send closed notification to participant: ${participant.email}`,
          error
        );
        return { success: false, email: participant.email, error: error.message };
      }
    });

    // Wait for all emails to be sent
    const results = await Promise.allSettled(emailPromises);

    // Log results
    let successCount = 0;
    let failedEmails = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.success) {
        successCount++;
      } else {
        const participant = participants[index];
        const error =
          result.status === "fulfilled" ? result.value.error : result.reason;
        failedEmails.push({ email: participant.email, error });
        console.error(
          `❌ Failed to send closed notification to participant: ${participant.email}`,
          error
        );
      }
    });

    console.log(
      `📧 Closed notification sent to ${successCount}/${participants.length} participants`
    );

    return {
      success: successCount > 0,
      sentTo: successCount,
      total: participants.length,
      failedEmails: failedEmails,
    };
  } catch (error) {
    console.error("❌ Error in sendEventClosedNotificationToParticipants:", error);
    return {
      success: false,
      error: error.message,
      message: "Failed to send closed notification to participants",
    };
  }
};

module.exports = {
  sendPublishRequestNotification,
  sendEventRejectionNotification,
  sendEventApprovalNotification,
  sendEventClosedNotification,
  sendEventClosedNotificationToParticipants,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendAdminPasswordResetEmail,
  testEmailSending,
  sendEventUpdateNotificationToParticipants,
  sendEventReapprovalNotificationToParticipants,
  getEventParticipants,
  EMAILJS_CONFIG,
};
