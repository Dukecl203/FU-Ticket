# MongoDB Authentication Setup Instructions

## ✅ Changes Made

The mobile app has been successfully integrated with the MongoDB backend for authentication. The following files were updated:

### 1. **API Configuration** (`src/config/api.js`)
- Created centralized API configuration file
- Default backend URL: `http://192.168.1.100:9999/api`

### 2. **SignIn.jsx** - Login with MongoDB
- Connects to `/api/login` endpoint
- Validates email and password
- Stores user token and data in AsyncStorage
- Shows loading indicator during authentication
- Displays appropriate error messages

### 3. **SignUp.jsx** - Registration with MongoDB
- Connects to `/api/register` endpoint
- Validates all input fields (name, email, password, confirm password)
- Email format validation
- Password length validation (minimum 6 characters)
- Shows loading indicator during registration
- Displays appropriate error messages

### 4. **ForgotPassword.jsx** - Password Reset
- Connects to `/api/forgot-password` endpoint
- Validates email format
- Sends password reset email
- Shows loading indicator
- Displays appropriate error messages

## 🚀 Setup Instructions

### Step 1: Configure Backend URL

1. Find your computer's IP address:
   - **Windows**: Open Command Prompt and run `ipconfig`
   - Look for "IPv4 Address" (e.g., 192.168.1.100)
   - **Mac/Linux**: Run `ifconfig` or `ip addr`

2. Update the API URL in `src/config/api.js`:
   ```javascript
   const API_BASE_URL = 'http://YOUR_IP_ADDRESS:9999/api';
   ```
   Replace `YOUR_IP_ADDRESS` with your actual IP address.

### Step 2: Start the Backend Server

1. Navigate to the backend directory:
   ```bash
   cd d:\FULearning\Fall2025\WDP301\backend
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

3. Make sure MongoDB connection is configured in `.env`:
   ```
   MONGO_URL=mongodb+srv://admin:LS9fnn8FnlRFObqi@fuevent.pifd634.mongodb.net/FuEvent?retryWrites=true&w=majority&appName=FuEvent
   PORT=9999
   ```

4. Start the backend server:
   ```bash
   npm start
   ```

   You should see:
   ```
   ✅ DB connected
   🚀 Server running on port 9999
   ```

### Step 3: Start the Mobile App

1. Navigate to the mobile app directory:
   ```bash
   cd d:\FULearning\Fall2025\WDP301\fu-ticket-mobie-main\fu-ticket-mobie
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

3. Start the Expo development server:
   ```bash
   npm start
   ```

4. Scan the QR code with:
   - **Android**: Expo Go app
   - **iOS**: Camera app (opens in Expo Go)

### Step 4: Test Authentication

1. **Register a new account**:
   - Click "Đăng ký ngay" on the login screen
   - Fill in all required fields
   - Password must be at least 6 characters
   - Click "Đăng ký"

2. **Login**:
   - Enter your registered email and password
   - Click "Đăng nhập"
   - You should be redirected to the main app

3. **Forgot Password**:
   - Click "Quên mật khẩu?" on the login screen
   - Enter your email
   - Check your email for the reset link

## 📝 API Endpoints Used

- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/forgot-password` - Password reset request

## 🔐 User Data Stored in AsyncStorage

After successful login, the following data is stored:
- `userToken` - JWT access token
- `userId` - User ID
- `userEmail` - User email
- `userName` - User full name
- `userRole` - User role (Participant, Organizer, Admin)

## ⚠️ Troubleshooting

### Cannot connect to server
- Make sure the backend server is running
- Verify your IP address is correct in `src/config/api.js`
- Ensure your phone and computer are on the same network
- Check if port 9999 is not blocked by firewall

### Email or password incorrect
- Verify the user is registered in MongoDB
- Check password is correct (case-sensitive)
- Ensure backend is connected to MongoDB

### Email already exists
- The email is already registered
- Try logging in instead or use a different email

## 📱 Features Implemented

✅ User registration with validation
✅ User login with JWT token
✅ Password reset via email
✅ Loading states during API calls
✅ Comprehensive error handling
✅ Input validation (email format, password length, etc.)
✅ Secure password storage (bcrypt hashing on backend)
✅ Token-based authentication
✅ User data persistence with AsyncStorage

## 🔧 Backend Technologies

- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **nodemailer** - Email service

## 📦 Mobile App Dependencies

- **axios** - HTTP client
- **@react-native-async-storage/async-storage** - Local storage
- **react-navigation** - Navigation
- **lucide-react-native** - Icons
