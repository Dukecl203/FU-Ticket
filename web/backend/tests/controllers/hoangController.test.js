const {
  registerFormController,
  loginController,
  loginGoogleController,
  getUserByIdController,
  updateUserByIdController,
  changePasswordController,
  forgotPasswordController,
  resetPasswordController,
} = require("../../controllers/hoangController");
const User = require("../../models/Users");
const bcrypt = require("bcrypt");
const { sendWelcomeEmail, generateToken } = require("../../tests/OutsiderFunc");

jest.mock("bcrypt");
jest.mock("../../tests/OutsiderFunc");
const mockSave = jest.fn();
jest.mock("../../models/Users", () => {
  // 1. Mock constructor (new User())
  const mockConstructor = jest.fn((data) => ({
    ...data,
    save: mockSave,
  }));
  // 2. Mock các phương thức static (User.findOne())
  mockConstructor.findOne = jest.fn();
  return mockConstructor;
});

describe("Hoang Controller - registerFormController", () => {
  let req, res;
  let consoleErrorSpy, consoleLogSpy, mathRandomSpy;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
        full_name: "Test User",
        phone_number: "0987654321",
        role: "User",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Spy và tắt tiếng console
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Mock Math.random để tạo username đoán trước được
    // (0.1234 * 9000) + 1000 = 1110.96 + 1000 = 2110.96 => floor = 2110
    mathRandomSpy = jest.spyOn(Math, "random").mockReturnValue(0.123456789);

    // Mock các dependency bên ngoài
    bcrypt.hash.mockResolvedValue("hashed_password_abc");
    sendWelcomeEmail.mockResolvedValue(true);

    // Mock kết quả save (trả về 1 object đã được save)
    mockSave.mockImplementation(() =>
      Promise.resolve({
        _id: "newUserId",
        user_name: req.body.username || "generatedUser", // Sẽ được cập nhật
        email: req.body.email,
        full_name: req.body.full_name,
        phone_number: req.body.phone_number,
        role: req.body.role,
        status: "pending",
      })
    );
  });

  afterEach(() => {
    // Khôi phục lại các spy
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    mathRandomSpy.mockRestore();
  });

  // --- Test Case 1: Đăng ký thành công (với username) ---
  test("should register successfully with provided username (201)", async () => {
    // Arrange
    User.findOne.mockResolvedValue(null);
    // Act
    await registerFormController(req, res);
    // Assert
    // 1. Kiểm tra conflict check (chỉ gọi 1 lần, không vào vòng lặp)
    expect(User.findOne).toHaveBeenCalledTimes(1);
    expect(User.findOne).toHaveBeenCalledWith({
      $or: [{ email: "test@example.com" }, { user_name: "testuser" }],
    });
    // 2. Kiểm tra hashing
    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
    // 3. Kiểm tra constructor và save
    expect(User).toHaveBeenCalledWith({
      user_name: "testuser",
      email: "test@example.com",
      password_hash: "hashed_password_abc",
      full_name: "Test User",
      phone_number: "0987654321",
      role: "User",
    });
    expect(mockSave).toHaveBeenCalledTimes(1);
    // 4. Kiểm tra gửi mail
    expect(sendWelcomeEmail).toHaveBeenCalledWith(
      "test@example.com",
      "testuser"
    );
    // 5. Kiểm tra response
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Registration successful.",
        user: expect.objectContaining({
          id: "newUserId",
          username: "testuser",
        }),
      })
    );
  });

  // --- Test Case 2: Đăng ký thành công (tự tạo username) ---
  test("should register successfully and generate username if missing (201)", async () => {
    // Arrange
    req.body.username = "";
    req.body.email = "auto_user@mail.com";
    User.findOne.mockResolvedValue(null);
    // Act
    await registerFormController(req, res);
    // Assert
    // 1. Kiểm tra findOne (trong vòng lặp)
    expect(User.findOne).toHaveBeenCalledWith({ user_name: "auto_user2110" });
    // 2. Kiểm tra conflict check (sau vòng lặp)
    expect(User.findOne).toHaveBeenCalledWith({
      $or: [{ email: "auto_user@mail.com" }, { user_name: "auto_user2110" }],
    });

    // 3. Kiểm tra constructor
    expect(User).toHaveBeenCalledWith(
      expect.objectContaining({ user_name: "auto_user2110" })
    );
    // 4. Kiểm tra save
    expect(mockSave).toHaveBeenCalledTimes(1);
    // 5. Kiểm tra response
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // --- Test Case 3-6: Lỗi Validation (400) ---
  test("should return 400 if full_name is missing", async () => {
    req.body.full_name = "";
    await registerFormController(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Full name is required.",
    });
  });

  test("should return 400 if password is too short", async () => {
    req.body.password = "123";
    await registerFormController(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Password must be at least 6 characters long.",
    });
  });

  test("should return 400 if passwords do not match", async () => {
    req.body.confirmPassword = "wrongpassword";
    await registerFormController(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Passwords do not match.",
    });
  });

  // --- Test Case 7: Lỗi Conflict (409) ---
  test("should return 409 if email or username already registered", async () => {
    // Arrange
    User.findOne.mockResolvedValue({
      _id: "existingUser",
      email: "test@example.com",
    });
    // Act
    await registerFormController(req, res);
    // Assert
    expect(User.findOne).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: "Email or username already registered.",
    });
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });

  // --- Test Case 8: Lỗi 500 (Tạo username thất bại) ---
  test("should return 500 if unique username generation fails", async () => {
    // Arrange
    req.body.username = "";
    User.findOne.mockResolvedValue({ _id: "existingUser" });
    // Act
    await registerFormController(req, res);
    // Assert
    // 1. Đã cố gắng 5 lần
    expect(User.findOne).toHaveBeenCalledTimes(5);
    // 2. Trả về 500
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Could not generate unique username. Please try again.",
    });
    // 3. Không bao giờ save
    expect(mockSave).not.toHaveBeenCalled();
  });

  // --- Test Case 9: Lỗi 500 (Lỗi save) ---
  test("should return 500 if newUser.save() fails", async () => {
    // Arrange
    const dbError = new Error("Database save failed");
    User.findOne.mockResolvedValue(null);
    mockSave.mockRejectedValue(dbError);
    // Act
    await registerFormController(req, res);
    // Assert
    // 1. Vẫn gọi hash và save
    expect(bcrypt.hash).toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalled();
    // 2. Trả về 500
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Server error." });
    // 3. Không gửi mail
    expect(sendWelcomeEmail).not.toHaveBeenCalled();
  });

  // --- Test Case 10: Gửi mail thất bại (nhưng vẫn 201) ---
  test("should still return 201 if registration succeeds but email fails", async () => {
    // Arrange
    const emailError = new Error("SMTP Error");
    User.findOne.mockResolvedValue(null);
    mockSave.mockResolvedValue({ _id: "newUserId", ...req.body });
    sendWelcomeEmail.mockRejectedValue(emailError);
    // Act
    await registerFormMController(req, res);
    // Assert
    // 1. Đã gọi save
    expect(mockSave).toHaveBeenCalled();
    // 2. Đã gọi sendWelcomeEmail
    expect(sendWelcomeEmail).toHaveBeenCalled();
    // 3. Đã log lỗi email
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to send welcome email:",
      "SMTP Error"
    );
    // 4. VẪN trả về 201
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Registration successful." })
    );
  });
});

describe("Hoang Controller - loginController", () => {
  let req, res;

  // Dữ liệu giả cho user tồn tại trong DB
  const mockUser = {
    _id: "user123",
    user_name: "testuser",
    email: "test@example.com",
    full_name: "Test User",
    phone_number: "0987654321",
    role: "User",
    status: "active",
    password_hash: "hashed_password_abc",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: {
        email: "test@example.com",
        password: "password123",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  // --- Test Case 1: Đăng nhập thành công (200) ---
  test("should return 200 with user data and token on successful login", async () => {
    // Arrange
    // 1. User.findOne tìm thấy user
    User.findOne.mockResolvedValue(mockUser);
    // 2. bcrypt.compare trả về true (mật khẩu đúng)
    bcrypt.compare.mockResolvedValue(true);
    // 3. generateToken trả về token giả
    generateToken.mockReturnValue("mock_jwt_token_123");
    // Act
    await loginController(req, res);
    // Assert
    // 1. Kiểm tra tìm user
    expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
    // 2. Kiểm tra so sánh mật khẩu
    expect(bcrypt.compare).toHaveBeenCalledWith(
      "password123",
      "hashed_password_abc"
    );
    // 3. Kiểm tra tạo token
    expect(generateToken).toHaveBeenCalledWith(mockUser);
    // 4. Kiểm tra response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Login successful.",
      user: {
        id: "user123",
        username: "testuser",
        email: "test@example.com",
        full_name: "Test User",
        phone_number: "0987654321",
        role: "User",
        status: "active",
      },
      accessToken: "mock_jwt_token_123",
    });
  });

  // --- Test Case 2: Lỗi 400 - Thiếu email ---
  test("should return 400 if email is missing", async () => {
    // Arrange
    req.body = { password: "password123" }; // Thiếu email
    // Act
    await loginController(req, res);
    // Assert
    // 1. Kiểm tra response
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Email and password are required.",
    });
    // 2. Không gọi DB
    expect(User.findOne).not.toHaveBeenCalled();
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  // --- Test Case 3: Lỗi 400 - Thiếu mật khẩu ---
  test("should return 400 if password is missing", async () => {
    // Arrange
    req.body = { email: "test@example.com" };
    // Act
    await loginController(req, res);
    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Email and password are required.",
    });
  });

  // --- Test Case 4: Lỗi 401 - Không tìm thấy user ---
  test("should return 401 if user is not found", async () => {
    // Arrange
    User.findOne.mockResolvedValue(null);
    // Act
    await loginController(req, res);
    // Assert
    // 1. Vẫn gọi findOne
    expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
    // 2. Trả về 401
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid email or password.",
    });
    // 3. Không gọi bcrypt
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  // --- Test Case 5: Lỗi 401 - Sai mật khẩu ---
  test("should return 401 if password is incorrect", async () => {
    // Arrange
    // 1. User.findOne tìm thấy user
    User.findOne.mockResolvedValue(mockUser);
    // 2. bcrypt.compare trả về false (mật khẩu sai)
    bcrypt.compare.mockResolvedValue(false);
    // Act
    await loginController(req, res);
    // Assert
    // 1. Vẫn gọi findOne và compare
    expect(User.findOne).toHaveBeenCalled();
    expect(bcrypt.compare).toHaveBeenCalled();
    // 2. Trả về 401
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid email or password.",
    });
    // 3. Không tạo token
    expect(generateToken).not.toHaveBeenCalled();
  });

  // --- Test Case 6: Lỗi 500 - Lỗi server ---
  test("should return 500 if database query fails", async () => {
    // Arrange
    const dbError = new Error("Database error");
    User.findOne.mockRejectedValue(dbError);
    // Act
    await loginController(req, res);
    // Assert
    // 1. Vẫn gọi findOne
    expect(User.findOne).toHaveBeenCalled();
    // 2. Trả về 500
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Server error." });
  });
});

describe("Hoang Controller - loginGoogleController", () => {});

describe("Hoang Controller - getUserByIdController", () => {});

describe("Hoang Controller - updateUserByIdController", () => {});

describe("Hoang Controller - changePasswordController", () => {});

describe("Hoang Controller - forgotPasswordController", () => {});

describe("Hoang Controller - resetPasswordController", () => {});
