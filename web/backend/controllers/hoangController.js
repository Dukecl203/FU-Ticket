const User = require("../models/Users");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../lib/jwt");
const {
  sendPasswordResetEmail,
  sendWelcomeEmail,
} = require("../services/emailService");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// === HELPER: Generate unique username ===
async function generateUniqueUsername(email) {
  const base = (email?.split("@")[0] || "user")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, 12) || "user";
  let attempt = 0;
  while (attempt < 5) {
    const candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    const exists = await User.findOne({ username: candidate });
    if (!exists) return candidate;
    attempt++;
  }
  throw new Error("Could not generate unique username");
}

// === REGISTER CONTROLLER ===
async function registerFormController(req, res) {
  const {
    username: inputUsername,
    email,
    password,
    confirmPassword,
    full_name,
    phone_number,
    role,
  } = req.body;

  // === VALIDATION ===
  if (!full_name) return res.status(400).json({ message: "Full name is required." });
  if (!email) return res.status(400).json({ message: "Email is required." });
  if (!password || password.length < 6)
    return res.status(400).json({ message: "Password must be at least 6 characters long." });
  if (password !== confirmPassword)
    return res.status(400).json({ message: "Passwords do not match." });

  // Validate role
  const allowedRoles = ["Participant", "Organizer"];
  if (role && !allowedRoles.includes(role))
    return res.status(400).json({ message: "Invalid role." });

  try {
    // === GENERATE USERNAME ===
    let finalUsername = inputUsername && inputUsername.length >= 3 ? inputUsername.trim() : "";
    if (!finalUsername) {
      finalUsername = await generateUniqueUsername(email);
    }

    // === CHECK EXISTING USER ===
    const existingUser = await User.findOne({
      $or: [{ email }, { username: finalUsername }],
    });
    if (existingUser)
      return res.status(409).json({ message: "Email or username already registered." });

    // === CREATE USER ===
    const hashedPassword = await bcrypt.hash(password, 10);
    // Automatically set isFPT based on email domain
    const isFPT = email && email.toLowerCase().endsWith('@fpt.edu.vn');
    const newUser = new User({
      username: finalUsername,
      email,
      password_hash: hashedPassword,
      full_name,
      phone_number,
      role: role || "Participant",
      isPasswordSet: true,
      isFPT: isFPT,
    });
    await newUser.save();

    // === SEND WELCOME EMAIL (non-blocking) ===
    sendWelcomeEmail(email, finalUsername).catch((err) =>
      console.error("Welcome email failed:", err.message)
    );

    // === RESPONSE ===
    return res.status(201).json({
      message: "Registration successful.",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        full_name: newUser.full_name,
        phone_number: newUser.phone_number,
        role: newUser.role,
        status: newUser.status,
      },
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

// === LOGIN CONTROLLER ===
async function loginController(req, res) {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password are required." });

  try {
    const user = await User.findOne({ email }).select("+password_hash");
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ message: "Invalid email or password." });

    if (user.status?.toLowerCase() === "inactive")
      return res.status(403).json({
        message: "Your account has been deactivated. Please contact support.",
        redirect: "/access-denied",
      });

    const token = generateToken(user);
    return res.status(200).json({
      message: "Login successful.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        phone_number: user.phone_number,
        role: user.role,
        status: user.status,
      },
      accessToken: token,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

// === GOOGLE LOGIN CONTROLLER ===
async function loginGoogleController(req, res) {
  const { credential } = req.body || {};
  if (!credential) return res.status(400).json({ message: "Missing Google credential." });
  if (!googleClient) return res.status(500).json({ message: "Google OAuth not configured." });

  try {
    // === DEBUG: Log token info ===
    try {
      const parts = String(credential).split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
        console.log("[Google Login] CLIENT_ID:", GOOGLE_CLIENT_ID);
        console.log("[Google Login] aud:", payload.aud, "azp:", payload.azp);
      }
    } catch (e) {
      console.warn("Failed to decode JWT for logging:", e.message);
    }

    // === VERIFY TOKEN ===
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) return res.status(400).json({ message: "Invalid Google token." });

    const { email, name, given_name, picture } = payload;
    const fullName = name || given_name || "";
    const avatarUrl = picture || "";

    // === FIND OR CREATE USER ===
    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      const randomPass = crypto.randomBytes(12).toString("hex");
      const hashed = await bcrypt.hash(randomPass, 10);
      const username = await generateUniqueUsername(email);
      // Automatically set isFPT based on email domain
      const isFPT = email && email.toLowerCase().endsWith('@fpt.edu.vn');
      user = new User({
        username,
        email,
        password_hash: hashed,
        full_name: fullName,
        avatar_url: avatarUrl,
        role: "Participant",
        isPasswordSet: false,
        isFPT: isFPT,
      });
      await user.save();
      isNewUser = true;
    } else {
      // Update avatar if changed
      if (avatarUrl && user.avatar_url !== avatarUrl) {
        user.avatar_url = avatarUrl;
      }
      // Migrate old users
      if (user.isPasswordSet === undefined) {
        user.isPasswordSet = !user.avatar_url?.includes("googleusercontent.com");
      }
      // Update isFPT if email changed or if it's not set
      if (user.email && (user.isFPT === undefined || user.isModified('email'))) {
        user.isFPT = user.email.toLowerCase().endsWith('@fpt.edu.vn');
      }
      await user.save();
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: "Login successful.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        phone_number: user.phone_number,
        role: user.role,
        status: user.status,
        isPasswordSet: !!user.isPasswordSet,
      },
      accessToken: token,
    });
  } catch (err) {
    console.error("Google login error:", err.message);
    return res.status(500).json({ message: "Server error during Google login." });
  }
}

// === GET USER BY ID ===
async function getUserByIdController(req, res) {
  const { id } = req.params;
  try {
    const user = await User.findById(id).select("-password_hash");
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.status(200).json({ user });
  } catch (err) {
    return res.status(400).json({ message: "Invalid user ID." });
  }
}

// === UPDATE USER ===
async function updateUserByIdController(req, res) {
  const { id } = req.params;
  const { phone_number, full_name } = req.body;
  const update = { updated_at: new Date() };
  if (typeof phone_number === "string") update.phone_number = phone_number;
  if (typeof full_name === "string") update.full_name = full_name;

  try {
    const user = await User.findByIdAndUpdate(id, update, { new: true }).select("-password_hash");
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.status(200).json({ message: "User updated.", user });
  } catch (err) {
    return res.status(400).json({ message: "Invalid user ID." });
  }
}

// === CHANGE PASSWORD ===
async function changePasswordController(req, res) {
  const { id } = req.params;
  const { currentPassword, newPassword, confirmNewPassword } = req.body || {};

  if (!currentPassword || !newPassword || !confirmNewPassword)
    return res.status(400).json({ message: "All password fields are required." });
  if (newPassword.length < 6)
    return res.status(400).json({ message: "New password must be at least 6 characters." });
  if (newPassword !== confirmNewPassword)
    return res.status(400).json({ message: "New passwords do not match." });

  try {
    const user = await User.findById(id).select("+password_hash");
    if (!user) return res.status(404).json({ message: "User not found." });

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) return res.status(401).json({ message: "Current password is incorrect." });

    user.password_hash = await bcrypt.hash(newPassword, 10);
    user.updated_at = new Date();
    await user.save();

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

// === FORGOT PASSWORD ===
async function forgotPasswordController(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found." });

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    await sendPasswordResetEmail(email, resetToken);
    return res.status(200).json({ message: "Password reset email sent." });
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

// === RESET PASSWORD ===
async function resetPasswordController(req, res) {
  const { token, newPassword } = req.body;
  if (!token || !newPassword)
    return res.status(400).json({ message: "Token and new password are required." });
  if (newPassword.length < 6)
    return res.status(400).json({ message: "Password must be at least 6 characters." });

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: "Invalid or expired reset token." });

    user.password_hash = await bcrypt.hash(newPassword, 10);
    user.isPasswordSet = true;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.updated_at = new Date();
    await user.save();

    return res.status(200).json({ message: "Password reset successfully." });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

// === ADMIN RESET PASSWORD ===
async function adminResetPasswordController(req, res) {
  const { id } = req.params;
  
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found." 
      });
    }

    // Tạo mật khẩu mặc định
    const defaultPassword = "12345678"; // Mật khẩu mặc định
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    // Cập nhật mật khẩu
    user.password_hash = hashedPassword;
    user.isPasswordSet = false; 
    user.updated_at = new Date();
    await user.save();

    // Gửi email thông báo mật khẩu mới (non-blocking)
    const { sendAdminPasswordResetEmail } = require("../services/emailService");
    sendAdminPasswordResetEmail(user.email, user.username || user.full_name, defaultPassword)
      .then(result => {
        console.log("✅ Admin password reset email sent:", result.messageId);
      })
      .catch(error => {
        console.error("❌ Failed to send admin password reset email:", error);
      });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. New password has been sent to user's email.",
      data: {
        userId: user._id,
        email: user.email,
        username: user.username || user.full_name
        // Không trả về password trong response
      }
    });
  } catch (err) {
    console.error("Admin reset password error:", err);
    return res.status(500).json({ 
      success: false,
      message: "Server error." 
    });
  }
}

// === SET PASSWORD (for Google users) ===
async function setPasswordController(req, res) {
  const { id } = req.params;
  const { password, confirmPassword } = req.body || {};

  if (!password || !confirmPassword)
    return res.status(400).json({ message: "Password and confirm password are required." });
  if (password.length < 6)
    return res.status(400).json({ message: "Password must be at least 6 characters long." });
  if (password !== confirmPassword)
    return res.status(400).json({ message: "Passwords do not match." });

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found." });

    user.password_hash = await bcrypt.hash(password, 10);
    user.isPasswordSet = true;
    user.updated_at = new Date();
    await user.save();

    return res.status(200).json({
      message: "Password set successfully.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        isPasswordSet: user.isPasswordSet,
      },
    });
  } catch (err) {
    console.error("Set password error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

module.exports = {
  registerFormController,
  loginController,
  loginGoogleController,
  getUserByIdController,
  updateUserByIdController,
  changePasswordController,
  forgotPasswordController,
  resetPasswordController,
  setPasswordController,
  adminResetPasswordController,
};