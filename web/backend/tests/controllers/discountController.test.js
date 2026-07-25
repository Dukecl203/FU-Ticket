const {
  getEventDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  getDiscountById,
} = require("../../controllers/discountController");
const Discount = require("../../models/Discount");
const Event = require("../../models/Events");

const mockSave = jest.fn();

jest.mock("../../models/Discount");
jest.mock("../../models/Events");

jest.mock("../../models/Discount", () => {
  // 1. Mock hàm constructor (cho 'new Discount()')
  const mockConstructor = jest.fn((data) => ({
    ...data,
    save: mockSave,
  }));
  // 2. Thêm TẤT CẢ các phương thức static cần dùng
  mockConstructor.find = jest.fn();
  mockConstructor.findOne = jest.fn();
  mockConstructor.findById = jest.fn();
  mockConstructor.findByIdAndUpdate = jest.fn();
  mockConstructor.findByIdAndDelete = jest.fn();
  return mockConstructor;
});

describe("getEventDiscounts Controller", () => {
  let req, res;
  let consoleErrorSpy;

  // Mock thời gian hiện tại
  const MOCK_NOW = new Date("2025-11-02T15:00:00.000Z");

  beforeEach(() => {
    // Thiết lập req, res giả
    req = {
      params: { eventId: "event123" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // "Đóng băng" thời gian hệ thống
    jest.useFakeTimers().setSystemTime(MOCK_NOW);

    // Spy on console.error để kiểm tra log lỗi và giữ im lặng khi test
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Xóa tất cả các lần gọi mock cũ
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Khôi phục lại thời gian thực
    jest.useRealTimers();
    // Khôi phục console.error
    consoleErrorSpy.mockRestore();
  });

  // --- Mock dữ liệu và Mongoose chaining ---

  // Dữ liệu thô trả về từ DB
  const mockRawDiscounts = [
    // 1. Discount hợp lệ, còn lượt, có giới hạn
    {
      _id: "d1",
      event_id: "event123",
      code: "ACTIVE10",
      valid_from: "2025-11-01T00:00:00.000Z", // Bắt đầu
      valid_to: "2025-11-30T23:59:59.000Z", // Chưa kết thúc
      max_users: 100,
      user_id: [{ _id: "user1" }, { _id: "user2" }], // Đã dùng 2
      toObject: function () {
        return this;
      }, // Mock toObject
    },
    // 2. Discount đã hết hạn
    {
      _id: "d2",
      event_id: "event123",
      code: "EXPIRED50",
      valid_from: "2025-10-01T00:00:00.000Z",
      valid_to: "2025-11-01T23:59:59.000Z", // Đã kết thúc
      max_users: 50,
      user_id: [],
      toObject: function () {
        return this;
      },
    },
    // 3. Discount chưa bắt đầu
    {
      _id: "d3",
      event_id: "event123",
      code: "FUTURE20",
      valid_from: "2025-12-01T00:00:00.000Z", // Chưa bắt đầu
      valid_to: "2025-12-31T23:59:59.000Z",
      max_users: 10,
      user_id: [],
      toObject: function () {
        return this;
      },
    },
    // 4. Discount hợp lệ, không giới hạn (max_users: 0)
    {
      _id: "d4",
      event_id: "event123",
      code: "UNLIMITED",
      valid_from: "2025-11-01T00:00:00.000Z",
      valid_to: "2025-11-30T23:59:59.000Z",
      max_users: 0, // Không giới hạn
      user_id: [{ _id: "user1" }],
      toObject: function () {
        return this;
      },
    },
  ];

  // Dữ liệu đã được format mà chúng ta mong đợi
  const expectedFormattedDiscounts = [
    // 1. Discount 1 (Active)
    {
      ...mockRawDiscounts[0],
      isValid: true,
      isExpired: false,
      isNotStarted: false,
      usageCount: 2,
      remainingUses: 98, // 100 - 2
      usagePercentage: "2.0", // (2 / 100 * 100).toFixed(1)
    },
    // 2. Discount 2 (Expired)
    {
      ...mockRawDiscounts[1],
      isValid: false,
      isExpired: true,
      isNotStarted: false,
      usageCount: 0,
      remainingUses: 50,
      usagePercentage: "0.0",
    },
    // 3. Discount 3 (Not Started)
    {
      ...mockRawDiscounts[2],
      isValid: false,
      isExpired: false,
      isNotStarted: true,
      usageCount: 0,
      remainingUses: 10,
      usagePercentage: "0.0",
    },
    // 4. Discount 4 (Unlimited)
    {
      ...mockRawDiscounts[3],
      isValid: true,
      isExpired: false,
      isNotStarted: false,
      usageCount: 1,
      remainingUses: "Unlimited", // max_users là 0
      usagePercentage: 0, // max_users là 0
    },
  ];

  // Mock Mongoose chaining (find().populate().sort())
  const mockSort = jest.fn();
  const mockPopulate = jest.fn(() => ({ sort: mockSort }));
  Discount.find.mockReturnValue({ populate: mockPopulate });

  // --- Test Case 1: Thành công với đầy đủ dữ liệu ---
  test("should return 200 with formatted discounts", async () => {
    // Arrange
    mockSort.mockResolvedValue(mockRawDiscounts);
    // Act
    await getEventDiscounts(req, res);
    // Assert
    // 1. Kiểm tra query database
    expect(Discount.find).toHaveBeenCalledWith({ event_id: "event123" });
    expect(mockPopulate).toHaveBeenCalledWith("user_id", "full_name email");
    expect(mockSort).toHaveBeenCalledWith({ created_at: -1 });
    // 2. Kiểm tra response trả về
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expectedFormattedDiscounts,
    });
  });

  // --- Test Case 2: Thành công nhưng không tìm thấy discount nào ---
  test("should return 200 with an empty array if no discounts found", async () => {
    // Arrange
    mockSort.mockResolvedValue([]);
    // Act
    await getEventDiscounts(req, res);
    // Assert
    // 1. Kiểm tra query database vẫn được gọi
    expect(Discount.find).toHaveBeenCalledWith({ event_id: "event123" });
    // 2. Kiểm tra response trả về
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [], // Dữ liệu là mảng rỗng
    });
  });

  // --- Test Case 3: Lỗi 500 khi query database ---
  test("should return 500 if database query fails", async () => {
    // Arrange
    const dbError = new Error("Database connection failed");
    mockSort.mockRejectedValue(dbError);
    // Act
    await getEventDiscounts(req, res);
    // Assert
    // 1. Kiểm tra lỗi đã được log
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error getting event discounts:",
      dbError
    );
    // 2. Kiểm tra response trả về
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Database connection failed",
    });
  });
});

describe("Discount Controller - createDiscount", () => {
  let req, res;
  let consoleErrorSpy;

  beforeEach(() => {
    // Reset tất cả mocks trước mỗi test
    jest.clearAllMocks();

    // Thiết lập req giả với dữ liệu mẫu
    req = {
      params: { eventId: "event123" },
      body: {
        code: " SALE50 ", // Thêm khoảng trắng để test trim()
        description: "Big Sale",
        percentage: 50,
        max_users: 100,
        valid_from: "2025-12-01T00:00:00.000Z",
        valid_to: "2025-12-31T23:59:59.000Z",
        type: "Specific",
      },
    };

    // Thiết lập res giả
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Spy on console.error
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    // Khôi phục console
    consoleErrorSpy.mockRestore();
  });

  // --- Test Case 1: Tạo discount thành công ---
  test("should create a new discount successfully (201)", async () => {
    // Arrange
    const mockEvent = { _id: "event123", name: "Test Event" };
    const mockSavedDiscount = { _id: "d123", ...req.body, code: "SALE50" };

    // 1. Event.findById: Tìm thấy event
    Event.findById.mockResolvedValue(mockEvent);
    // 2. Discount.findOne: Không tìm thấy (code hợp lệ)
    Discount.findOne.mockResolvedValue(null);
    // 3. newDiscount.save: Lưu thành công
    mockSave.mockResolvedValue(mockSavedDiscount);

    // Act
    await createDiscount(req, res);

    // Assert
    // 1. Kiểm tra đã tìm event
    expect(Event.findById).toHaveBeenCalledWith("event123");
    // 2. Kiểm tra đã check code (đã trim)
    expect(Discount.findOne).toHaveBeenCalledWith({ code: "SALE50" });
    // 3. Kiểm tra đã gọi constructor với dữ liệu đã xử lý
    expect(Discount).toHaveBeenCalledWith({
      event_id: "event123",
      code: "SALE50",
      description: "Big Sale",
      percentage: 50,
      max_users: 100,
      valid_from: new Date("2025-12-01T00:00:00.000Z"),
      valid_to: new Date("2025-12-31T23:59:59.000Z"),
      type: "Specific",
      user_id: [],
    });
    // 4. Kiểm tra đã save
    expect(mockSave).toHaveBeenCalledTimes(1);
    // 5. Kiểm tra response
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Discount created successfully",
      data: mockSavedDiscount,
    });
  });

  // --- Test Case 2: Kiểm tra giá trị mặc định (description, max_users, type) ---
  test("should use default values for optional fields", async () => {
    // Arrange
    delete req.body.description;
    delete req.body.max_users;
    delete req.body.type;
    Event.findById.mockResolvedValue({ _id: "event123" });
    Discount.findOne.mockResolvedValue(null);
    mockSave.mockResolvedValue({}); // Giá trị trả về không quan trọng
    // Act
    await createDiscount(req, res);
    // Assert
    // Chỉ cần kiểm tra constructor đã được gọi với đúng giá trị default
    expect(Discount).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "", // Default
        max_users: 0, // Default
        type: "All", // Default
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // --- Test Case 3: Lỗi 404 - Không tìm thấy Event ---
  test("should return 404 if event not found", async () => {
    // Arrange
    Event.findById.mockResolvedValue(null); // Không tìm thấy event
    // Act
    await createDiscount(req, res);
    // Assert
    // 1. Kiểm tra response
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Event not found",
    });
    // 2. Đảm bảo không có hành động nào khác được thực hiện
    expect(Discount.findOne).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });

  // --- Test Case 4: Lỗi 400 - Code discount đã tồn tại ---
  test("should return 400 if discount code already exists", async () => {
    // Arrange
    // 1. Event được tìm thấy
    Event.findById.mockResolvedValue({ _id: "event123" });
    // 2. Discount code đã tồn tại
    Discount.findOne.mockResolvedValue({ _id: "d999", code: "SALE50" });
    // Act
    await createDiscount(req, res);
    // Assert
    // 1. Kiểm tra response
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Discount code already exists",
    });
    // 2. Đảm bảo không save
    expect(mockSave).not.toHaveBeenCalled();
  });

  // --- Test Case 5: Lỗi 400 - Ngày không hợp lệ ---
  test("should return 400 if valid_from date is after valid_to date", async () => {
    // Arrange
    req.body.valid_from = "2025-12-31T00:00:00.000Z";
    req.body.valid_to = "2025-12-01T00:00:00.000Z"; // Ngày kết thúc trước ngày bắt đầu
    Event.findById.mockResolvedValue({ _id: "event123" });
    Discount.findOne.mockResolvedValue(null);
    // Act
    await createDiscount(req, res);
    // Assert
    // 1. Kiểm tra response
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Valid from date must be before valid to date",
    });
    // 2. Đảm bảo không save
    expect(mockSave).not.toHaveBeenCalled();
  });

  // --- Test Case 6: Lỗi 500 - Lỗi khi save ---
  test("should return 500 if saving to database fails", async () => {
    // Arrange
    const dbError = new Error("Database save error");
    Event.findById.mockResolvedValue({ _id: "event123" });
    Discount.findOne.mockResolvedValue(null);
    mockSave.mockRejectedValue(dbError); // Giả lập .save() ném ra lỗi
    // Act
    await createDiscount(req, res);
    // Assert
    // 1. Kiểm tra log lỗi
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error creating discount:",
      dbError
    );
    // 2. Kiểm tra response
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Database save error",
    });
  });
});

describe("Discount Controller - updateDiscount", () => {
  let req, res;
  let consoleErrorSpy;

  // Dữ liệu giả cho discount đang tồn tại trong DB
  const mockExistingDiscount = {
    _id: "discount123",
    code: "OLDCODE10",
    description: "Old Description",
    percentage: 10,
    max_users: 50,
    valid_from: new Date("2025-11-01T00:00:00.000Z"),
    valid_to: new Date("2025-11-30T23:59:59.000Z"),
    type: "All",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: { discountId: "discount123" },
      body: {}, // Sẽ được gán trong từng test
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    Discount.findById.mockResolvedValue(mockExistingDiscount);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // --- Test Case 1: Cập nhật thành công (thay đổi mọi thứ) ---
  test("should update a discount successfully (200)", async () => {
    // Arrange
    req.body = {
      code: " NEWCODE20 ", // Test trim()
      description: "New Description",
      percentage: 20,
      max_users: 100,
      valid_from: "2026-01-01T00:00:00.000Z",
      valid_to: "2026-01-31T23:59:59.000Z",
      type: "Specific",
    };
    const expectedUpdatedDiscount = {
      _id: "discount123",
      ...req.body,
      code: "NEWCODE20",
    };
    // 1. Discount.findOne: không tìm thấy code trùng
    Discount.findOne.mockResolvedValue(null);
    // 2. Discount.findByIdAndUpdate: trả về discount đã update
    Discount.findByIdAndUpdate.mockResolvedValue(expectedUpdatedDiscount);
    // Act
    await updateDiscount(req, res);
    // Assert
    // 1. Đã tìm discount
    expect(Discount.findById).toHaveBeenCalledWith("discount123");
    // 2. Đã kiểm tra code trùng (vì code mới khác code cũ)
    expect(Discount.findOne).toHaveBeenCalledWith({
      code: "NEWCODE20",
      _id: { $ne: "discount123" },
    });
    // 3. Đã gọi update với đúng payload
    expect(Discount.findByIdAndUpdate).toHaveBeenCalledWith(
      "discount123",
      {
        code: "NEWCODE20",
        description: "New Description",
        percentage: 20,
        max_users: 100,
        valid_from: new Date(req.body.valid_from),
        valid_to: new Date(req.body.valid_to),
        type: "Specific",
      },
      { new: true }
    );
    // 4. Đã trả về response thành công
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Discount updated successfully",
      data: expectedUpdatedDiscount,
    });
  });

  // --- Test Case 2: Cập nhật thành công (chỉ 1 trường và không đổi code) ---
  test("should update successfully when code is not changed", async () => {
    // Arrange
    req.body = {
      description: "Only update description",
      percentage: 0, // Test logic 'percentage !== undefined'
    };
    // Act
    await updateDiscount(req, res);
    // Assert
    // 1. KHÔNG kiểm tra code trùng
    expect(Discount.findOne).not.toHaveBeenCalled();
    // 2. Đã gọi update, giữ nguyên các giá trị cũ
    expect(Discount.findByIdAndUpdate).toHaveBeenCalledWith(
      "discount123",
      {
        code: mockExistingDiscount.code, // Giữ code cũ
        description: "Only update description", // Update
        percentage: 0, // Update (vì 0 !== undefined)
        max_users: mockExistingDiscount.max_users, // Giữ cũ
        valid_from: mockExistingDiscount.valid_from, // Giữ cũ
        valid_to: mockExistingDiscount.valid_to, // Giữ cũ
        type: mockExistingDiscount.type, // Giữ cũ
      },
      { new: true }
    );
    // 3. Trả về 200
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // --- Test Case 3: Lỗi 404 - Không tìm thấy discount ---
  test("should return 404 if discount not found", async () => {
    // Arrange
    Discount.findById.mockResolvedValue(null); // Ghi đè mock
    // Act
    await updateDiscount(req, res);
    // Assert
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Discount not found",
    });
    // Đảm bảo không gọi các hàm DB khác
    expect(Discount.findOne).not.toHaveBeenCalled();
    expect(Discount.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  // --- Test Case 4: Lỗi 400 - Code mới bị trùng ---
  test("should return 400 if new code already exists", async () => {
    // Arrange
    req.body = { code: "EXISTINGCODE" };
    Discount.findOne.mockResolvedValue({ _id: "otherDiscount456" });
    // Act
    await updateDiscount(req, res);
    // Assert
    // 1. Đã kiểm tra code
    expect(Discount.findOne).toHaveBeenCalledWith({
      code: "EXISTINGCODE",
      _id: { $ne: "discount123" },
    });
    // 2. Trả về lỗi 400
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Discount code already exists",
    });
    // 3. Không update
    expect(Discount.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  // --- Test Case 5: Lỗi 400 - Ngày không hợp lệ ---
  test("should return 400 if valid_from date is after valid_to date", async () => {
    // Arrange
    req.body = {
      // Ngày bắt đầu sau ngày kết thúc (dùng ngày cũ)
      valid_from: "2025-12-15T00:00:00.000Z", // Sau 2025-11-30
    };
    // Act
    await updateDiscount(req, res);
    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Valid from date must be before valid to date",
    });
    expect(Discount.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  // --- Test Case 6: Lỗi 500 - Lỗi database ---
  test("should return 500 if database update fails", async () => {
    // Arrange
    req.body = { description: "Will fail" };
    const dbError = new Error("Connection timed out");
    Discount.findByIdAndUpdate.mockRejectedValue(dbError);
    // Act
    await updateDiscount(req, res);
    // Assert
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error updating discount:",
      dbError
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Connection timed out",
    });
  });
});

describe("Discount Controller - deleteDiscount", () => {
  let req, res;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: { discountId: "discount123" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // --- Test Case 1: Xóa thành công (200) ---
  test("should delete a discount successfully (200)", async () => {
    // Arrange
    // 1. Giả lập tìm thấy discount
    const mockFoundDiscount = { _id: "discount123", code: "DELETEME" };
    Discount.findById.mockResolvedValue(mockFoundDiscount);
    // 2. Giả lập xóa thành công
    Discount.findByIdAndDelete.mockResolvedValue(mockFoundDiscount);
    // Act
    await deleteDiscount(req, res);
    // Assert
    // 1. Đã tìm discount
    expect(Discount.findById).toHaveBeenCalledWith("discount123");
    // 2. Đã gọi xóa
    expect(Discount.findByIdAndDelete).toHaveBeenCalledWith("discount123");
    // 3. Trả về response thành công
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Discount deleted successfully",
    });
  });

  // --- Test Case 2: Lỗi 404 - Không tìm thấy discount ---
  test("should return 404 if discount not found", async () => {
    // Arrange
    Discount.findById.mockResolvedValue(null);
    // Act
    await deleteDiscount(req, res);
    // Assert
    // 1. Đã tìm
    expect(Discount.findById).toHaveBeenCalledWith("discount123");
    // 2. Trả về lỗi 404
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Discount not found",
    });
    // 3. Quan trọng: KHÔNG gọi hàm xóa
    expect(Discount.findByIdAndDelete).not.toHaveBeenCalled();
  });

  // --- Test Case 3: Lỗi 500 - Lỗi khi tìm (findById) ---
  test("should return 500 if findById fails", async () => {
    // Arrange
    const dbError = new Error("Database lookup failed");
    Discount.findById.mockRejectedValue(dbError);
    // Act
    await deleteDiscount(req, res);
    // Assert
    // 1. Đã log lỗi
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error deleting discount:",
      dbError
    );
    // 2. Trả về lỗi 500
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Database lookup failed",
    });
    // 3. Không gọi xóa
    expect(Discount.findByIdAndDelete).not.toHaveBeenCalled();
  });

  // --- Test Case 4: Lỗi 500 - Lỗi khi xóa (findByIdAndDelete) ---
  test("should return 500 if findByIdAndDelete fails", async () => {
    // Arrange
    const dbError = new Error("Database delete failed");
    // 1. Giả lập tìm thấy
    Discount.findById.mockResolvedValue({ _id: "discount123" });
    // 2. Giả lập xóa thất bại
    Discount.findByIdAndDelete.mockRejectedValue(dbError);
    // Act
    await deleteDiscount(req, res);
    // Assert
    // 1. Đã tìm
    expect(Discount.findById).toHaveBeenCalledWith("discount123");
    // 2. Đã cố gắng xóa
    expect(Discount.findByIdAndDelete).toHaveBeenCalledWith("discount123");
    // 3. Đã log lỗi
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error deleting discount:",
      dbError
    );
    // 4. Trả về lỗi 500
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Database delete failed",
    });
  });
});

describe("Discount Controller - getDiscountById", () => {
  let req, res;
  let consoleErrorSpy;

  // "Đóng băng" thời gian để test logic 'isValid'
  // Giả sử "hôm nay" là ngày 15/11/2025
  const MOCK_NOW = new Date("2025-11-15T10:00:00.000Z");

  // Dữ liệu thô giả định trả về từ DB (sau khi populate)
  const mockRawDiscount = {
    _id: "d123",
    code: "SALE20",
    event_id: { _id: "e1", title: "Test Event" },
    user_id: [
      { _id: "u1", full_name: "User A" },
      { _id: "u2", full_name: "User B" },
    ], // Đã dùng 2
    max_users: 10,
    valid_from: new Date("2025-11-01T00:00:00.000Z"), // (Đã bắt đầu)
    valid_to: new Date("2025-11-30T23:59:59.000Z"), // (Chưa kết thúc)
    toObject: function () {
      return this;
    }, // Mock toObject
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Đóng băng thời gian
    jest.useFakeTimers().setSystemTime(MOCK_NOW);

    req = {
      params: { discountId: "d123" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    // Khôi phục thời gian thực
    jest.useRealTimers();
  });

  // Mock Mongoose chaining
  const mockPopulateUser = jest.fn();
  const mockPopulateEvent = jest.fn(() => ({ populate: mockPopulateUser }));
  Discount.findById.mockReturnValue({ populate: mockPopulateEvent });
  // --- Test Case 1: Lấy thành công (200) ---
  test("should return 200 with formatted discount if found", async () => {
    // Arrange
    mockPopulateUser.mockResolvedValue(mockRawDiscount);
    const expectedFormattedDiscount = {
      ...mockRawDiscount,
      isValid: true,
      usageCount: 2,
      remainingUses: 8,
      usagePercentage: "20.0",
    };
    // Act
    await getDiscountById(req, res);
    // Assert
    // 1. Kiểm tra query database
    expect(Discount.findById).toHaveBeenCalledWith("d123");
    expect(mockPopulateEvent).toHaveBeenCalledWith("event_id", "title");
    expect(mockPopulateUser).toHaveBeenCalledWith("user_id", "full_name email");
    // 2. Kiểm tra response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expectedFormattedDiscount,
    });
  });

  // --- Test Case 2: Test logic (Unlimited) ---
  test("should format correctly for unlimited uses (max_users: 0)", async () => {
    // Arrange
    const mockUnlimitedDiscount = {
      ...mockRawDiscount,
      max_users: 0,
    };
    mockPopulateUser.mockResolvedValue(mockUnlimitedDiscount);
    const expectedFormattedDiscount = {
      ...mockUnlimitedDiscount,
      isValid: true,
      usageCount: 2,
      remainingUses: "Unlimited", // <-- Kiểm tra
      usagePercentage: 0, // <-- Kiểm tra
    };
    // Act
    await getDiscountById(req, res);
    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expectedFormattedDiscount,
    });
  });

  // --- Test Case 3: Lỗi 404 - Không tìm thấy ---
  test("should return 404 if discount not found", async () => {
    // Arrange
    mockPopulateUser.mockResolvedValue(null);
    // Act
    await getDiscountById(req, res);
    // Assert
    // 1. Vẫn gọi query
    expect(Discount.findById).toHaveBeenCalledWith("d123");
    // 2. Trả về 404
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Discount not found",
    });
  });

  // --- Test Case 4: Lỗi 500 - Lỗi database ---
  test("should return 500 if database query fails", async () => {
    // Arrange
    const dbError = new Error("Database query error");
    mockPopulateUser.mockRejectedValue(dbError);
    // Act
    await getDiscountById(req, res);
    // Assert
    // 1. Đã log lỗi
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error getting discount:",
      dbError
    );
    // 2. Trả về 500
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Database query error",
    });
  });
});
