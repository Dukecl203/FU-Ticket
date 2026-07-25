const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getCurrentUser,
} = require("../../controllers/userController");
const User = require("../../model/User");
const mongoose = require("mongoose");

const mockSelect = jest.fn();
const mockSelectForFind = jest.fn();
const mockSelectForFindById = jest.fn();
const mockSave = jest.fn();
const mockSelectForFindByIdAndUpdate = jest.fn();
const mockFindByIdAndDelete = jest.fn();

jest.mock("../../model/User", () => {
  const mongoose = require("mongoose");
  const mockConstructor = jest.fn(function (data) {
    // `this` là instance mới
    Object.assign(this, data);
    this._id = new mongoose.Types.ObjectId();
    this.save = mockSave;
  });
  mockConstructor.find = jest.fn();
  mockConstructor.findById = jest.fn();
  mockConstructor.find = jest.fn(() => ({ select: mockSelectForFind }));
  mockConstructor.findById = jest.fn(() => ({ select: mockSelectForFindById }));
  mockConstructor.findByIdAndUpdate = jest.fn(() => ({
    select: mockSelectForFindByIdAndUpdate,
  }));
  mockConstructor.findByIdAndDelete = jest.fn((...args) =>
    mockFindByIdAndDelete(...args)
  );
  return mockConstructor;
});

describe("User Controller - getAllUsers", () => {
  let req, res;
  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
    mockSelect.mockClear();
  });

  test("Phải trả về status 200 và danh sách người dùng", async () => {
    // --- ARRANGE ---
    const mockUsers = [
      { _id: "1", full_name: "Alice" },
      { _id: "2", full_name: "Bob" },
    ];
    mockSelectForFind.mockResolvedValue(mockUsers);
    // --- ACT ---
    await getAllUsers(req, res);
    // --- ASSERT ---
    // 1. Kiểm tra xem User.find() đã được gọi
    expect(User.find).toHaveBeenCalledTimes(1);
    // 2. Kiểm tra xem .select() đã được gọi với đúng tham số
    expect(mockSelectForFind).toHaveBeenCalledWith("-password_hash");
    // 3. Kiểm tra status code
    expect(res.status).toHaveBeenCalledWith(200);
    // 4. Kiểm tra dữ liệu trả về
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockUsers,
    });
  });

  test("Phải trả về status 500 khi có lỗi database", async () => {
    // --- ARRANGE ---
    const errorMessage = "Lỗi kết nối database";
    const dbError = new Error(errorMessage);
    mockSelectForFind.mockRejectedValue(dbError);
    // --- ACT ---
    await getAllUsers(req, res);
    // --- ASSERT ---
    // 1. Kiểm tra xem chuỗi lệnh đã được gọi
    expect(User.find).toHaveBeenCalledTimes(1);
    expect(mockSelectForFind).toHaveBeenCalledWith("-password_hash");
    // 2. Kiểm tra status 500
    expect(res.status).toHaveBeenCalledWith(500);
    // 3. Kiểm tra message lỗi
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: errorMessage,
    });
  });
});

describe("User Controller - getUserById", () => {
  let req, res;
  const mockUserId = new mongoose.Types.ObjectId().toHexString();

  beforeEach(() => {
    // req bây giờ cần có params.id
    req = {
      params: { id: mockUserId },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
    // Reset cả hai bộ điều khiển
    mockSelectForFind.mockClear();
    mockSelectForFindById.mockClear();
  });

  test("Phải trả về status 200 và người dùng tìm thấy", async () => {
    // --- ARRANGE ---
    const mockUser = { _id: mockUserId, full_name: "Test User" };
    mockSelectForFindById.mockResolvedValue(mockUser);
    // --- ACT ---
    await getUserById(req, res);
    // --- ASSERT ---
    // 1. Kiểm tra User.findById đã được gọi với đúng ID
    expect(User.findById).toHaveBeenCalledWith(mockUserId);
    // 2. Kiểm tra .select() đã được gọi với đúng tham số
    expect(mockSelectForFindById).toHaveBeenCalledWith("-password_hash");
    // 3. Kiểm tra status 200
    expect(res.status).toHaveBeenCalledWith(200);
    // 4. Kiểm tra dữ liệu trả về
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockUser,
    });
  });

  test("Phải trả về status 404 khi không tìm thấy user", async () => {
    // --- ARRANGE ---
    mockSelectForFindById.mockResolvedValue(null);
    // --- ACT ---
    await getUserById(req, res);
    // --- ASSERT ---
    expect(User.findById).toHaveBeenCalledWith(mockUserId);
    expect(mockSelectForFindById).toHaveBeenCalledWith("-password_hash");
    // 1. Kiểm tra status 404
    expect(res.status).toHaveBeenCalledWith(404);
    // 2. Kiểm tra message lỗi
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "User not found",
    });
  });

  test("Phải trả về status 500 khi có lỗi database", async () => {
    // --- ARRANGE ---
    const errorMessage = "Lỗi kết nối database";
    const dbError = new Error(errorMessage);
    mockSelectForFindById.mockRejectedValue(dbError);
    // --- ACT ---
    await getUserById(req, res);
    // --- ASSERT ---
    expect(User.findById).toHaveBeenCalledWith(mockUserId);
    expect(mockSelectForFindById).toHaveBeenCalledWith("-password_hash");
    // 1. Kiểm tra status 500
    expect(res.status).toHaveBeenCalledWith(500);
    // 2. Kiểm tra message lỗi
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: errorMessage,
    });
  });
});

describe("User Controller - createUser", () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {
        email: "test@example.com",
        password_hash: "hashedpassword",
        full_name: "Test User",
        phone_number: "123456789",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
    mockSelectForFind.mockClear();
    mockSelectForFindById.mockClear();
    mockSave.mockClear();
    User.mockClear();
  });

  test("Phải trả về status 201 và user mới tạo", async () => {
    // --- ARRANGE ---
    const mockCreatedUser = {
      _id: "fake-id",
      email: "test@example.com",
      full_name: "Test User",
    };
    mockSave.mockResolvedValue(true);
    mockSelectForFindById.mockResolvedValue(mockCreatedUser);
    // --- ACT ---
    await createUser(req, res);
    // --- ASSERT ---
    // 1. Kiểm tra `new User()` đã được gọi với đúng data
    expect(User).toHaveBeenCalledWith(expect.objectContaining(req.body));
    // 2. Kiểm tra `.save()` đã được gọi
    expect(mockSave).toHaveBeenCalledTimes(1);
    // 3. Kiểm tra `User.findById().select()` đã được gọi
    expect(User.findById).toHaveBeenCalled(); // Bạn có thể kiểm tra ID nếu muốn
    expect(mockSelectForFindById).toHaveBeenCalledWith("-password_hash");
    // 4. Kiểm tra response
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockCreatedUser,
    });
  });

  test("Phải trả về status 500 nếu hàm .save() thất bại", async () => {
    // --- ARRANGE ---
    const errorMessage = "Lỗi validation (ví dụ: email trùng)";
    const dbError = new Error(errorMessage);
    mockSave.mockRejectedValue(dbError);
    // --- ACT ---
    await createUser(req, res);
    // --- ASSERT ---
    // 1. Kiểm tra `new User()` đã được gọi
    expect(User).toHaveBeenCalledWith(expect.objectContaining(req.body));
    // 2. Kiểm tra `.save()` đã được gọi
    expect(mockSave).toHaveBeenCalledTimes(1);
    // 3. Đảm bảo KHÔNG gọi `User.findById`
    expect(User.findById).not.toHaveBeenCalled();
    // 4. Kiểm tra response lỗi
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: errorMessage,
    });
  });
});

describe("User Controller - updateUser", () => {
  let req, res;
  const mockUserId = new mongoose.Types.ObjectId().toHexString();
  const mockUpdateData = { full_name: "Tên Mới" };

  beforeEach(() => {
    // req bây giờ cần params.id và body
    req = {
      params: { id: mockUserId },
      body: mockUpdateData,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
    // Reset tất cả "bộ điều khiển"
    mockSelectForFind.mockClear();
    mockSelectForFindById.mockClear();
    mockSelectForFindByIdAndUpdate.mockClear(); // <-- Reset mock mới
    mockSave.mockClear();
    User.mockClear();
  });

  test("Phải trả về status 200 và user đã cập nhật", async () => {
    // --- ARRANGE ---
    const mockUpdatedUser = { _id: mockUserId, ...mockUpdateData };
    mockSelectForFindByIdAndUpdate.mockResolvedValue(mockUpdatedUser);
    // --- ACT ---
    await updateUser(req, res);
    // --- ASSERT ---
    // 1. Kiểm tra User.findByIdAndUpdate đã được gọi đúng
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      mockUserId,
      mockUpdateData,
      { new: true }
    );
    // 2. Kiểm tra .select() đã được gọi
    expect(mockSelectForFindByIdAndUpdate).toHaveBeenCalledWith(
      "-password_hash"
    );
    // 3. Kiểm tra status 200
    expect(res.status).toHaveBeenCalledWith(200);
    // 4. Kiểm tra dữ liệu trả về
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockUpdatedUser,
    });
  });

  test("Phải trả về status 404 khi không tìm thấy user", async () => {
    // --- ARRANGE ---
    mockSelectForFindByIdAndUpdate.mockResolvedValue(null);
    // --- ACT ---
    await updateUser(req, res);
    // --- ASSERT ---
    expect(User.findByIdAndUpdate).toHaveBeenCalled();
    expect(mockSelectForFindByIdAndUpdate).toHaveBeenCalledWith(
      "-password_hash"
    );
    // 1. Kiểm tra status 404
    expect(res.status).toHaveBeenCalledWith(404);
    // 2. Kiểm tra message lỗi
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "User not found",
    });
  });

  test("Phải trả về status 500 khi có lỗi database", async () => {
    // --- ARRANGE ---
    const errorMessage = "Lỗi kết nối database";
    const dbError = new Error(errorMessage);
    mockSelectForFindByIdAndUpdate.mockRejectedValue(dbError);
    // --- ACT ---
    await updateUser(req, res);
    // --- ASSERT ---
    expect(User.findByIdAndUpdate).toHaveBeenCalled();
    expect(mockSelectForFindByIdAndUpdate).toHaveBeenCalledWith(
      "-password_hash"
    );
    // 1. Kiểm tra status 500
    expect(res.status).toHaveBeenCalledWith(500);
    // 2. Kiểm tra message lỗi
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: errorMessage,
    });
  });
});

describe("User Controller - deleteUser", () => {
  let req, res;
  const mockUserId = new mongoose.Types.ObjectId().toHexString();

  beforeEach(() => {
    // req bây giờ cần params.id
    req = {
      params: { id: mockUserId },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
    // Reset tất cả "bộ điều khiển"
    mockSelectForFind.mockClear();
    mockSelectForFindById.mockClear();
    mockSelectForFindByIdAndUpdate.mockClear();
    mockFindByIdAndDelete.mockClear(); // <-- Reset mock mới
    mockSave.mockClear();
    User.mockClear();
  });

  test("Phải trả về status 200 và thông báo thành công", async () => {
    // --- ARRANGE ---
    const mockDeletedUser = { _id: mockUserId, full_name: "Đã bị xóa" };
    mockFindByIdAndDelete.mockResolvedValue(mockDeletedUser);
    // --- ACT ---
    await deleteUser(req, res);
    // --- ASSERT ---
    // 1. Kiểm tra User.findByIdAndDelete đã được gọi đúng
    expect(User.findByIdAndDelete).toHaveBeenCalledWith(mockUserId);
    // 2. Kiểm tra status 200
    expect(res.status).toHaveBeenCalledWith(200);
    // 3. Kiểm tra thông báo thành công
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "User deleted successfully",
    });
  });

  test("Phải trả về status 404 khi không tìm thấy user", async () => {
    // --- ARRANGE ---
    mockFindByIdAndDelete.mockResolvedValue(null);
    // --- ACT ---
    await deleteUser(req, res);
    // --- ASSERT ---
    expect(User.findByIdAndDelete).toHaveBeenCalledWith(mockUserId);
    // 1. Kiểm tra status 404
    expect(res.status).toHaveBeenCalledWith(404);
    // 2. Kiểm tra message lỗi
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "User not found",
    });
  });

  test("Phải trả về status 500 khi có lỗi database", async () => {
    // --- ARRANGE ---
    const errorMessage = "Lỗi kết nối database";
    const dbError = new Error(errorMessage);
    mockFindByIdAndDelete.mockRejectedValue(dbError);
    // --- ACT ---
    await deleteUser(req, res);
    // --- ASSERT ---
    expect(User.findByIdAndDelete).toHaveBeenCalledWith(mockUserId);
    // 1. Kiểm tra status 500
    expect(res.status).toHaveBeenCalledWith(500);
    // 2. Kiểm tra message lỗi
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: errorMessage,
    });
  });
});

describe("User Controller - getCurrentUser", () => {
  let req, res;

  // --- Mock Mongoose Chaining ---
  // Chúng ta cần mock chuỗi: .findById().select()
  const mockSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      // Giả lập rằng middleware xác thực đã chạy
      // và chèn thông tin user vào req
      user: {
        _id: "user123",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    User.findById.mockReturnValue({ select: mockSelect });
  });

  // --- Test Case 1: Lấy thành công (200) ---
  test("should return 200 with the current user data", async () => {
    // Arrange
    const mockUserData = {
      _id: "user123",
      full_name: "Test User",
      email: "test@example.com",
    };
    mockSelect.mockResolvedValue(mockUserData);
    // Act
    await getCurrentUser(req, res);
    // Assert
    // 1. Kiểm tra query database
    expect(User.findById).toHaveBeenCalledWith("user123");
    // 2. Kiểm tra select
    expect(mockSelect).toHaveBeenCalledWith("-password_hash");
    // 3. Kiểm tra response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockUserData,
    });
  });

  // --- Test Case 2: Lỗi 404 - Không tìm thấy user ---
  test("should return 404 if user not found", async () => {
    // Arrange
    mockSelect.mockResolvedValue(null);
    // Act
    await getCurrentUser(req, res);
    // Assert
    // 1. Vẫn gọi query
    expect(User.findById).toHaveBeenCalledWith("user123");
    expect(mockSelect).toHaveBeenCalledWith("-password_hash");
    // 2. Trả về 404
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "User not found",
    });
  });

  // --- Test Case 3: Lỗi 500 - Lỗi database ---
  test("should return 500 if database query fails", async () => {
    // Arrange
    const dbError = new Error("Database connection error");
    mockSelect.mockRejectedValue(dbError);
    // Act
    await getCurrentUser(req, res);
    // Assert
    // 1. Vẫn gọi query
    expect(User.findById).toHaveBeenCalledWith("user123");
    // 2. Trả về 500
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Database connection error",
    });
  });
});
