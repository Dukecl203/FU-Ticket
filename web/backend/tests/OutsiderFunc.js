const jwt = require("jsonwebtoken");

const getDisplayStatus = (event) => {
  const now = new Date();
  if (event.status === "pending") return "Pending";
  if (event.status === "rejected") return "Rejected";
  if (event.status === "cancelled") return "Cancelled";
  if (event.status === "approved") {
    if (event.start_time > now) return "Upcoming";
    if (event.start_time <= now && event.end_time >= now) return "Ongoing";
    if (event.end_time < now) return "Completed";
  }
  return "Unknown";
};

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

const sendWelcomeEmail = async (email, username) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.APP_NAME || "Your App"}" <${
        process.env.SMTP_USER
      }>`,
      to: email,
      subject: "Welcome to Our Platform!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome, ${username}!</h2>
          <p>Thank you for joining our platform. Your account has been successfully created.</p>
          <p>You can now sign in and start using all our features.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${
              process.env.FRONTEND_URL || "http://localhost:5173"
            }/signin" 
               style="background-color: #FF9900; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Sign In Now
            </a>
          </div>
          <p>If you have any questions, feel free to contact our support team.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message. Please do not reply to this email.
          </p>
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

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function generateToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}
