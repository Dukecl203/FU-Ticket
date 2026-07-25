const { getCategories } = require("../../controllers/categoryController.js");
const Category = require("../../models/Categories");

jest.mock("../../models/Categories", () => ({
  find: jest.fn(), // Chúng ta chỉ cần mock hàm 'find'
}));

describe("Category Controller - getCategories", () => {
  let req, res;

  beforeEach(() => {
    req = {};
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  test("Phải trả về danh sách categories và status 200", async () => {
    // --- ARRANGE ---
    const mockCategories = [
      { _id: "1", name: "Âm nhạc" },
      { _id: "2", name: "Thể thao" },
    ];
    Category.find.mockResolvedValue(mockCategories);
    // --- ACT ---
    await getCategories(req, res);
    // --- ASSERT ---
    // 1. Kiểm tra xem Category.find() đã được gọi hay chưa
    expect(Category.find).toHaveBeenCalledTimes(1);
    // 2. Kiểm tra xem res.json() đã được gọi với đúng dữ liệu
    expect(res.json).toHaveBeenCalledWith(mockCategories);
    // 3. Đảm bảo res.status() không được gọi (vì nó sẽ mặc định là 200)
    expect(res.status).not.toHaveBeenCalled();
  });

  test("Phải trả về status 500 khi có lỗi database", async () => {
    // --- ARRANGE ---
    const errorMessage = "Lỗi kết nối database";
    const dbError = new Error(errorMessage);
    // "Dạy" cho Category.find ném ra một lỗi
    Category.find.mockRejectedValue(dbError);
    // --- ACT ---
    await getCategories(req, res);
    // --- ASSERT ---
    // 1. Kiểm tra xem Category.find() đã được gọi
    expect(Category.find).toHaveBeenCalledTimes(1);
    // 2. Kiểm tra xem status 500 đã được set
    expect(res.status).toHaveBeenCalledWith(500);
    // 3. Kiểm tra xem message lỗi chính xác đã được trả về
    expect(res.json).toHaveBeenCalledWith({
      message: errorMessage,
    });
  });
});
