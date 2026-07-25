const {
  createProduct,
  getProductsByEvent,
  updateProduct,
  deleteProduct,
} = require("../../controllers/productController.js");
const Product = require("../../models/Products.js");
const mongoose = require("mongoose");

const mockSave = jest.fn();
const mockSort = jest.fn();
const mockProductFind = jest.fn(() => ({
  sort: mockSort,
}));
const mockFindByIdAndUpdate = jest.fn();
const mockFindByIdAndDelete = jest.fn();

jest.mock("../../models/Products.js", () => {
  const mongoose = require("mongoose");
  const mockConstructor = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data);
    this._id = new mongoose.Types.ObjectId().toHexString();
    this.save = mockSave;
  });
  mockConstructor.find = jest.fn((...args) => mockProductFind(...args));
  mockConstructor.findByIdAndUpdate = jest.fn((...args) =>
    mockFindByIdAndUpdate(...args)
  );
  mockConstructor.findByIdAndDelete = jest.fn((...args) =>
    mockFindByIdAndDelete(...args)
  );
  return mockConstructor;
});

describe("Product Controller - createProduct", () => {
  let req, res;
  const baseReqBody = {
    event_id: new mongoose.Types.ObjectId().toHexString(),
    name: "Test Product",
    description: "A great product",
    price: 100,
    quantity_total: 50,
    type: "ticket",
  };

  beforeEach(() => {
    req = {
      body: { ...baseReqBody },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
    mockSave.mockClear();
    Product.mockClear();
  });

  test("Phải trả về status 201 và sản phẩm mới tạo", async () => {
    // --- ARRANGE ---
    mockSave.mockResolvedValue(true);
    // --- ACT ---
    await createProduct(req, res);
    // --- ASSERT ---
    // 1. Kiểm tra `new Product()` đã được gọi với đúng dữ liệu
    expect(Product).toHaveBeenCalledWith(baseReqBody);
    // 2. Kiểm tra `.save()` đã được gọi
    expect(mockSave).toHaveBeenCalledTimes(1);
    // 3. Kiểm tra status code
    expect(res.status).toHaveBeenCalledWith(201);
    // 4. Kiểm tra dữ liệu trả về (phải là instance được tạo bởi mock)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: expect.any(String), // Mock của chúng ta đã tự gán _id
        name: "Test Product",
        price: 100,
      })
    );
  });

  test("Phải trả về status 400 nếu event_id bị thiếu", async () => {
    // --- ARRANGE ---
    delete req.body.event_id;
    // --- ACT ---
    await createProduct(req, res);
    // --- ASSERT ---
    // 1. Kiểm tra status code
    expect(res.status).toHaveBeenCalledWith(400);
    // 2. Kiểm tra message lỗi
    expect(res.json).toHaveBeenCalledWith({ message: "event_id is required" });
    // 3. Đảm bảo KHÔNG có tương tác với DB
    expect(Product).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });

  test("Phải trả về status 400 nếu .save() ném ra ValidationError", async () => {
    // --- ARRANGE ---
    const validationError = new Error("Validation error");
    validationError.name = "ValidationError";
    validationError.errors = {
      price: { message: "Price must be positive" },
      name: { message: "Name is too short" },
    };
    mockSave.mockRejectedValue(validationError);
    // --- ACT ---
    await createProduct(req, res);
    // --- ASSERT ---
    // 1. Đã cố gắng tương tác DB
    expect(Product).toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalledTimes(1);
    // 2. Kiểm tra status code
    expect(res.status).toHaveBeenCalledWith(400);
    // 3. Kiểm tra message lỗi đã được map chính xác
    expect(res.json).toHaveBeenCalledWith({
      message: "Validation error",
      errors: ["price: Price must be positive", "name: Name is too short"],
    });
  });

  test("Phải trả về status 500 nếu có lỗi server xảy ra", async () => {
    // --- ARRANGE ---
    const errorMessage = "Database connection lost";
    const dbError = new Error(errorMessage);
    mockSave.mockRejectedValue(dbError);
    // --- ACT ---
    await createProduct(req, res);
    // --- ASSERT ---
    expect(Product).toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalledTimes(1);
    // 1. Kiểm tra status code
    expect(res.status).toHaveBeenCalledWith(500);
    // 2. Kiểm tra message lỗi
    expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
  });
});

describe("Product Controller - getProductsByEvent", () => {
  let req, res;
  const mockEventId = new mongoose.Types.ObjectId().toHexString();

  beforeEach(() => {
    // req bây giờ cần params.eventId
    req = {
      params: { eventId: mockEventId },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    // Reset tất cả mock
    jest.clearAllMocks();
    mockSave.mockClear();
    mockSort.mockClear();
    mockProductFind.mockClear();
    Product.mockClear();
  });

  test("Phải trả về status 200 (mặc định) và danh sách sản phẩm", async () => {
    // --- ARRANGE ---
    const mockProducts = [
      { _id: "1", name: "Vé VIP" },
      { _id: "2", name: "Áo phông" },
    ];
    mockSort.mockResolvedValue(mockProducts);
    // --- ACT ---
    await getProductsByEvent(req, res);
    // --- ASSERT ---
    // 1. Kiểm tra Product.find() đã được gọi với đúng eventId
    expect(Product.find).toHaveBeenCalledWith({ event_id: mockEventId });
    // 2. Kiểm tra .sort() đã được gọi với đúng tham số
    expect(mockSort).toHaveBeenCalledWith({ created_at: -1 });
    // 3. Kiểm tra dữ liệu trả về (status 200 là mặc định)
    expect(res.json).toHaveBeenCalledWith(mockProducts);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("Phải trả về status 500 nếu có lỗi xảy ra", async () => {
    // --- ARRANGE ---
    const errorMessage = "Lỗi database";
    const dbError = new Error(errorMessage);
    mockSort.mockRejectedValue(dbError);
    // --- ACT ---
    await getProductsByEvent(req, res);
    // --- ASSERT ---
    // 1. Kiểm tra chuỗi lệnh đã được gọi
    expect(Product.find).toHaveBeenCalledWith({ event_id: mockEventId });
    expect(mockSort).toHaveBeenCalledWith({ created_at: -1 });
    // 2. Kiểm tra status 500
    expect(res.status).toHaveBeenCalledWith(500);
    // 3. Kiểm tra message lỗi
    expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
  });
});

describe("Product Controller - updateProduct", () => {
  let req, res;
  const mockProductId = new mongoose.Types.ObjectId().toHexString();
  const mockUpdateData = { name: "Tên Mới", price: 150 };

  beforeEach(() => {
    // req bây giờ cần params.id và body
    req = {
      params: { id: mockProductId },
      body: mockUpdateData,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    // Reset tất cả mock
    jest.clearAllMocks();
    mockSave.mockClear();
    mockSort.mockClear();
    mockProductFind.mockClear();
    mockFindByIdAndUpdate.mockClear(); // <-- Reset mock mới
    Product.mockClear();
  });

  test("Phải trả về status 200 (mặc định) và sản phẩm đã cập nhật", async () => {
    // --- ARRANGE ---
    const mockUpdatedProduct = { _id: mockProductId, ...mockUpdateData };
    mockFindByIdAndUpdate.mockResolvedValue(mockUpdatedProduct);
    // --- ACT ---
    await updateProduct(req, res);
    // --- ASSERT ---
    // 1. Kiểm tra Product.findByIdAndUpdate đã được gọi đúng
    expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
      mockProductId,
      mockUpdateData,
      { new: true }
    );
    // 2. Kiểm tra dữ liệu trả về
    expect(res.json).toHaveBeenCalledWith(mockUpdatedProduct);
    // 3. Status 200 là mặc định
    expect(res.status).not.toHaveBeenCalled();
  });

  test("Phải trả về status 404 khi không tìm thấy sản phẩm", async () => {
    // --- ARRANGE ---
    mockFindByIdAndUpdate.mockResolvedValue(null);
    // --- ACT ---
    await updateProduct(req, res);
    // --- ASSERT ---
    expect(Product.findByIdAndUpdate).toHaveBeenCalled();
    // 1. Kiểm tra status 404
    expect(res.status).toHaveBeenCalledWith(404);
    // 2. Kiểm tra message lỗi
    expect(res.json).toHaveBeenCalledWith({ message: "Product not found" });
  });

  test("Phải trả về status 400 nếu có lỗi CastError", async () => {
    // --- ARRANGE ---
    const castError = new Error("Cast to ObjectId failed");
    castError.name = "CastError";
    castError.path = "id";
    mockFindByIdAndUpdate.mockRejectedValue(castError);
    // --- ACT ---
    await updateProduct(req, res);
    // --- ASSERT ---
    expect(Product.findByIdAndUpdate).toHaveBeenCalled();
    // 1. Kiểm tra status 400
    expect(res.status).toHaveBeenCalledWith(400);
    // 2. Kiểm tra message lỗi đã được xử lý
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid value for id" });
  });

  test("Phải trả về status 500 nếu có lỗi server xảy ra", async () => {
    // --- ARRANGE ---
    const errorMessage = "Database connection lost";
    const dbError = new Error(errorMessage);
    mockFindByIdAndUpdate.mockRejectedValue(dbError);
    // --- ACT ---
    await updateProduct(req, res);
    // --- ASSERT ---
    expect(Product.findByIdAndUpdate).toHaveBeenCalled();
    // 1. Kiểm tra status 500
    expect(res.status).toHaveBeenCalledWith(500);
    // 2. Kiểm tra message lỗi
    expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
  });
});

describe("Product Controller - deleteProduct", () => {
  let req, res;
  const mockProductId = new mongoose.Types.ObjectId().toHexString();

  beforeEach(() => {
    req = {
      params: { id: mockProductId },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    // Reset tất cả mock
    jest.clearAllMocks();
    mockSave.mockClear();
    mockSort.mockClear();
    mockProductFind.mockClear();
    mockFindByIdAndUpdate.mockClear();
    mockFindByIdAndDelete.mockClear(); // <-- Reset mock mới
    Product.mockClear();
  });

  test("Phải trả về status 200 (mặc định) và thông báo xóa thành công", async () => {
    // --- ARRANGE ---
    const mockDeletedProduct = { _id: mockProductId, name: "Sản phẩm đã xóa" };
    mockFindByIdAndDelete.mockResolvedValue(mockDeletedProduct);
    // --- ACT ---
    await deleteProduct(req, res);
    // --- ASSERT ---
    // 1. Kiểm tra Product.findByIdAndDelete đã được gọi đúng
    expect(Product.findByIdAndDelete).toHaveBeenCalledWith(mockProductId);
    // 2. Kiểm tra dữ liệu trả về
    expect(res.json).toHaveBeenCalledWith({ message: "Product deleted" });
    // 3. Status 200 là mặc định
    expect(res.status).not.toHaveBeenCalled();
  });

  test("Phải trả về status 404 khi không tìm thấy sản phẩm", async () => {
    // --- ARRANGE ---
    mockFindByIdAndDelete.mockResolvedValue(null);
    // --- ACT ---
    await deleteProduct(req, res);
    // --- ASSERT ---
    expect(Product.findByIdAndDelete).toHaveBeenCalled();
    // 1. Kiểm tra status 404
    expect(res.status).toHaveBeenCalledWith(404);
    // 2. Kiểm tra message lỗi
    expect(res.json).toHaveBeenCalledWith({ message: "Product not found" });
  });

  test("Phải trả về status 400 nếu có lỗi CastError", async () => {
    // --- ARRANGE ---
    const castError = new Error("Cast to ObjectId failed");
    castError.name = "CastError";
    castError.path = "id"; // Controller sẽ đọc thuộc tính này
    mockFindByIdAndDelete.mockRejectedValue(castError);
    // --- ACT ---
    await deleteProduct(req, res);
    // --- ASSERT ---
    expect(Product.findByIdAndDelete).toHaveBeenCalled();
    // 1. Kiểm tra status 400
    expect(res.status).toHaveBeenCalledWith(400);
    // 2. Kiểm tra message lỗi đã được xử lý
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid value for id" });
  });

  test("Phải trả về status 500 nếu có lỗi server xảy ra", async () => {
    // --- ARRANGE ---
    const errorMessage = "Database connection lost";
    const dbError = new Error(errorMessage);
    mockFindByIdAndDelete.mockRejectedValue(dbError);
    // --- ACT ---
    await deleteProduct(req, res);
    // --- ASSERT ---
    expect(Product.findByIdAndDelete).toHaveBeenCalled();
    // 1. Kiểm tra status 500
    expect(res.status).toHaveBeenCalledWith(500);
    // 2. Kiểm tra message lỗi
    expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
  });
});
