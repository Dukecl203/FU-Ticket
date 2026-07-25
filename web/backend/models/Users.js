const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, unique: true },
        password_hash: { type: String, required: true },
        full_name: { type: String, required: true },
        phone_number: { type: String },
        role: {
            type: String,
            enum: ["Participant", "Organizer", "Admin"],
            default: "Participant",
        },
        status: {
            type: String,
            enum: ["active", "inactive", "banned"],
            default: "active",
        },
        facebookTokens: {
            accessToken: String,
            pageAccessToken: String, // Page-specific token for posting
            tokenExpiry: Date,
            userId: String,
            pageId: String,
            pageName: String,
            connected: { type: Boolean, default: false }
        },
        isPasswordSet: { type: Boolean, default: false },
        avatar_url: { type: String },
        resetPasswordToken: { type: String },
        resetPasswordExpires: { type: Date },
        isFPT: { type: Boolean, default: false }, // FPT University student flag
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    }
);

// Pre-save hook to automatically set isFPT based on email domain
userSchema.pre('save', function (next) {
    if (this.isModified('email') || this.isNew) {
        // Check if email ends with @fpt.edu.vn
        this.isFPT = this.email && this.email.toLowerCase().endsWith('@fpt.edu.vn');
    }
    next();
});

const Users = mongoose.model("Users", userSchema, "Users");

module.exports = Users;
