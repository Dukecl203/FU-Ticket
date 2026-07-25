const User = require("../models/Users");

// Lấy tất cả người dùng
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password_hash'); // Loại bỏ password_hash
    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Lấy người dùng theo ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password_hash');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Tạo người dùng mới
const createUser = async (req, res) => {
  try {
    const { email, password_hash, full_name, phone_number, role, status } = req.body;
    // Automatically set isFPT based on email domain
    const isFPT = email && email.toLowerCase().endsWith('@fpt.edu.vn');
    const newUser = new User({
      email,
      password_hash, // Lưu ý: Nên dùng bcrypt để hash password thực tế
      full_name,
      phone_number,
      role: role || "User",
      status: status || "active",
      isFPT: isFPT,
    });
    await newUser.save();
    const userResponse = await User.findById(newUser._id).select('-password_hash');
    return res.status(201).json({
      success: true,
      data: userResponse,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Cập nhật người dùng
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // If email is being updated, automatically set isFPT based on email domain
    if (updateData.email) {
      updateData.isFPT = updateData.email.toLowerCase().endsWith('@fpt.edu.vn');
    }
    
    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password_hash');
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    return res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Xóa người dùng
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get current user profile
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password_hash');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getCurrentUser,
};