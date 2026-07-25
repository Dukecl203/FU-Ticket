// backend/routers/register.js
const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/hoangController');
const { verifyToken } = require('../middleware/auth');
const User = require('../models/Users');



// POST /api/register
router.post('/register', registerFormController);

// POST /api/login
router.post('/login', loginController);

// POST /api/login-google
router.post('/login-google', loginGoogleController);

// GET /api/users/:id
router.get('/users/:id', getUserByIdController);

// PUT /api/users/:id
router.put('/users/:id', updateUserByIdController);

// PUT /api/users/:id/password
router.put('/users/:id/password', changePasswordController);

// POST /api/forgot-password
router.post('/forgot-password', forgotPasswordController);

// POST /api/users/:id/admin-reset-password - Admin reset password
router.post('/users/:id/admin-reset-password', adminResetPasswordController);

// POST /api/reset-password
router.post('/reset-password', resetPasswordController);

// POST /api/users/:id/set-password
router.post('/users/:id/set-password', setPasswordController);

// GET /api/auth - Get current user info
router.get('/auth', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password_hash');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Encrypt user data for frontend (matching existing pattern)
        const CryptoJS = require('crypto-js');
        const secretKey = process.env.VITE_SECRET_CRYPTO || 'your-secret-key';
        const encryptedUser = CryptoJS.AES.encrypt(JSON.stringify(user), secretKey).toString();

        return res.status(200).json({
            success: true,
            metadata: {
                auth: encryptedUser
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// GET /api/logout - Logout user (clear token on client side)
router.get('/logout', (req, res) => {
    try {
        // Logout is handled on the client side by clearing tokens
        // This endpoint just confirms the logout request
        return res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

module.exports = router;
