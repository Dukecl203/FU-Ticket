const {
  getAllCategories,
  getCategoryById,
  getAllEvents,
  getEventById,
  getAllTickets,
  getFormattedEvents,
  getBannerByRandomCurrentEvent,
  getTrendingEvent,
  getEventsByMode,
  getEventsByCategory,
  getTicketsByEventId,
  getDiscountsByEventId,
  updateDiscount,
  paymentByMomo,
  returnData,
  getOrderDetails,
  getOrderByUserId,
  addOrUpdateReview,
  getAllReviewsByEvent,
  getOrderItemById,
  updateOrderItem,
  getOrderItemsByOrderId,
} = require("../../controllers/binhController");
const mongoose = require("mongoose");
const Category = require("../../model/Category");
const Product = require("../../model/Ticket");
const Discount = require("../../model/Discount");
const Order = require("../../model/Order");
const OrderItem = require("../../model/OrderItem");
const Review = require("../../models/Review");

const mockSave = jest.fn();
const mockSort = jest.fn();
const mockFindByIdAndUpdate = jest.fn();
const mockFindByIdAndDelete = jest.fn();
const mockPopulate = jest.fn(() => ({
  sort: mockSort,
}));
const mockProductFind = jest.fn(() => ({
  sort: mockSort,
  populate: mockPopulate,
}));
const mockDiscountSave = jest.fn();
const mockOrderLean = jest.fn();
const mockOrderPopulate = jest.fn(() => ({ lean: mockOrderLean }));
const mockOrderFindById = jest.fn(() => ({ populate: mockOrderPopulate }));
const mockOrderItemLean = jest.fn();
const mockOrderItemPopulate = jest.fn(() => ({ lean: mockOrderItemLean }));
const mockOrderItemFind = jest.fn(() => ({ populate: mockOrderItemPopulate }));
const mockOrderFindLean = jest.fn();
const mockOrderFindPopulate = jest.fn(() => ({ lean: mockOrderFindLean }));
Order.find.mockReturnValue({ populate: mockOrderFindPopulate });
const mockOrderItemFindLean = jest.fn();
const mockOrderItemFindPopulate = jest.fn(() => ({
  lean: mockOrderItemFindLean,
}));
OrderItem.find.mockReturnValue({ populate: mockOrderItemFindPopulate });
const mockLean = jest.fn();
const mockPopulateProduct = jest.fn(() => ({ lean: mockLean }));
const mockPopulateOrder = jest.fn(() => ({ populate: mockPopulateProduct }));

jest.mock("../../model/Category", () => ({
  find: jest.fn(),
  findById: jest.fn(),
}));

jest.mock("../../model/Ticket", () => {
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

jest.mock("../../model/Discount", () => ({
  find: jest.fn(),
  findById: jest.fn(),
}));

jest.mock("../../model/Order", () => {
  const mockConstructor = jest.fn();
  // Gán hàm TĨNH (static)
  mockConstructor.findById = jest.fn((...args) => mockOrderFindById(...args));
  return mockConstructor;
});

jest.mock("../../model/OrderItem", () => {
  const mockConstructor = jest.fn();
  // Gán hàm TĨNH (static)
  mockConstructor.find = jest.fn((...args) => mockOrderItemFind(...args));
  return mockConstructor;
});

jest.mock("../../models/Review", () => {
  // 1. Mock constructor (new Review())
  const mockConstructor = jest.fn((data) => ({
    ...data,
    save: mockSave,
  }));
  // 2. Mock các phương thức static (Review.findOne())
  mockConstructor.findOne = jest.fn();
  return mockConstructor;
});

jest.mock("../../models/Review", () => ({
  find: jest.fn(() => ({ populate: mockPopulate })),
}));

jest.mock("../../model/OrderItem", () => ({
  findById: jest.fn(() => ({
    populate: mockPopulateOrder,
  })),
  findByIdAndUpdate: jest.fn(),
}));

const MOCK_DATE = new Date("2025-11-03T10:30:00.000Z");

// Dữ liệu giả cho User (được populate bởi Order)
const mockUser = {
  full_name: "Test User",
  email: "user@test.com",
  phone_number: "0123456789",
};

// Dữ liệu giả cho Order
const mockOrders = [
  {
    _id: "order1",
    user_id: mockUser,
    order_id: "O-001",
    total_amount: 150,
    status: "SUCCESS",
    created_at: "2025-11-03T10:00:00.000Z",
    updated_at: "2025-11-03T10:01:00.000Z",
  },
];

// Dữ liệu giả cho Event (được populate lồng trong Product)
const mockEvent = {
  _id: "event1",
  title: "My Concert",
  start_time: "2025-12-01T18:00:00.000Z",
  end_time: "2025-12-01T22:00:00.000Z",
  location: "Stadium",
};

// Dữ liệu giả cho Product (được populate bởi OrderItem)
const mockProduct = {
  _id: "prod1",
  name: "Vé VIP",
  price: 150,
  type: "ticket",
  event_id: mockEvent, // Populate lồng
};

// Dữ liệu giả cho OrderItem
const mockOrderItems = [
  {
    _id: "item1",
    order_id: "order1",
    product_id: mockProduct,
    quantity: 1,
  },
];

const mockItemFromDB = {
  _id: "item123",
  status: "USED",
  createdAt: "2025-11-03T10:00:00.000Z",
  updatedAt: "2025-11-03T10:05:00.000Z",
  product_id: mockProduct,
  order_id: mockOrders,
};

describe("Binh Controller - getCategoryById", () => {
  let req, res;
  const mockCategoryId = new mongoose.Types.ObjectId().toHexString();

  beforeEach(() => {
    req = {
      params: { id: mockCategoryId },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    // Reset tất cả mock
    jest.clearAllMocks();
    Category.findById.mockClear(); // Xóa riêng cho findById
  });

  test("Phải trả về status 200 và category tìm thấy", async () => {
    // --- ARRANGE ---
    const mockCategory = { _id: mockCategoryId, name: "Test Category" };
    Category.findById.mockResolvedValue(mockCategory);
    // --- ACT ---
    await getCategoryById(req, res);
    // --- ASSERT ---
    // 1. Kiểm tra Category.findById đã được gọi đúng
    expect(Category.findById).toHaveBeenCalledWith(mockCategoryId);
    // 2. Kiểm tra status 200
    expect(res.status).toHaveBeenCalledWith(200);
    // 3. Kiểm tra dữ liệu trả về
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockCategory,
    });
  });

  test("Phải trả về status 404 khi không tìm thấy category", async () => {
    // --- ARRANGE ---
    Category.findById.mockResolvedValue(null);
    // --- ACT ---
    await getCategoryById(req, res);
    // --- ASSERT ---
    expect(Category.findById).toHaveBeenCalledWith(mockCategoryId);
    // 1. Kiểm tra status 404
    expect(res.status).toHaveBeenCalledWith(404);
    // 2. Kiểm tra message lỗi
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Category not found",
    });
  });

  test("Phải trả về status 500 khi có lỗi database", async () => {
    // --- ARRANGE ---
    const errorMessage = "Database connection lost";
    const dbError = new Error(errorMessage);
    Category.findById.mockRejectedValue(dbError);
    // --- ACT ---
    await getCategoryById(req, res);
    // --- ASSERT ---
    expect(Category.findById).toHaveBeenCalledWith(mockCategoryId);
    // 1. Kiểm tra status 500
    expect(res.status).toHaveBeenCalledWith(500);
    // 2. Kiểm tra message lỗi
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: errorMessage,
    });
  });
});

describe("Binh Controller - getAllTickets", () => {
  let req, res;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    // Reset tất cả mock
    jest.clearAllMocks();
    mockSave.mockClear();
    mockSort.mockClear();
    mockProductFind.mockClear();
    mockPopulate.mockClear();
    mockFindByIdAndUpdate.mockClear();
    mockFindByIdAndDelete.mockClear();
    Product.mockClear();
  });

  test("Phải trả về status 200 và danh sách vé", async () => {
    // --- ARRANGE ---
    const mockTickets = [
      { _id: "1", name: "Vé VIP", type: "ticket", event_id: "evt1" },
    ];
    mockPopulate.mockResolvedValue(mockTickets);
    // --- ACT ---
    await getAllTickets(req, res);
    // --- ASSERT ---
    // 1. Kiểm tra Product.find() đã được gọi với đúng filter
    expect(Product.find).toHaveBeenCalledWith({ type: "ticket" });
    // 2. Kiểm tra .populate() đã được gọi với đúng tham số
    expect(mockPopulate).toHaveBeenCalledWith("event_id");
    // 3. Kiểm tra status 200
    expect(res.status).toHaveBeenCalledWith(200);
    // 4. Kiểm tra dữ liệu trả về
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockTickets,
    });
  });

  test("Phải trả về status 500 nếu có lỗi xảy ra", async () => {
    // --- ARRANGE ---
    const errorMessage = "Lỗi database";
    const dbError = new Error(errorMessage);
    mockPopulate.mockRejectedValue(dbError);
    // --- ACT ---
    await getAllTickets(req, res);
    // --- ASSERT ---
    // 1. Kiểm tra chuỗi lệnh đã được gọi
    expect(Product.find).toHaveBeenCalledWith({ type: "ticket" });
    expect(mockPopulate).toHaveBeenCalledWith("event_id");
    // 2. Kiểm tra status 500
    expect(res.status).toHaveBeenCalledWith(500);
    // 3. Kiểm tra message lỗi
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: errorMessage,
    });
  });
});

describe("Binh Controller - getTicketsByEventId", () => {
  let req, res;
  const mockEventId = new mongoose.Types.ObjectId().toHexString();

  // --- ĐÓNG BĂNG THỜI GIAN ---
  // Chọn một ngày cố định, ví dụ: 19/10/2025
  const FAKE_NOW = new Date("2025-10-19T10:00:00.000Z");

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FAKE_NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });
  // --- KẾT THÚC ĐÓNG BĂNG THỜI GIAN ---

  beforeEach(() => {
    req = { params: { eventId: mockEventId } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    // Reset tất cả mock
    jest.clearAllMocks();
    mockSave.mockClear();
    mockSort.mockClear();
    mockProductFind.mockClear();
    mockPopulate.mockClear();
    mockFindByIdAndUpdate.mockClear();
    mockFindByIdAndDelete.mockClear();
    Product.mockClear();
  });

  test("Phải trả về status 200 và danh sách vé đã được định dạng", async () => {
    // --- ARRANGE ---
    const mockDbTickets = [
      // 1. Vé hợp lệ
      {
        _id: "t1",
        name: "Vé VIP",
        price: 100000,
        quantity_total: 10,
        quantity_sold: 5, // --> available: true
        event_id: {
          end_time: "2025-10-20T00:00:00.000Z", // --> notExpired: true (sau FAKE_NOW)
          description: "Ghi chú sự kiện",
        },
        toObject: function () {
          return this;
        },
      },
      // 2. Vé hết hạn
      {
        _id: "t2",
        name: "Vé Thường",
        price: 50000,
        quantity_total: 10,
        quantity_sold: 5, // --> available: true
        event_id: {
          end_time: "2025-10-18T00:00:00.000Z", // --> notExpired: false (trước FAKE_NOW)
        },
        toObject: function () {
          return this;
        },
      },
      // 3. Vé bán hết
      {
        _id: "t3",
        name: "Vé Miễn Phí",
        price: 0,
        quantity_total: 10,
        quantity_sold: 10, // --> available: false
        event_id: {
          end_time: "2025-10-20T00:00:00.000Z", // --> notExpired: true
        },
        toObject: function () {
          return this;
        },
      },
    ];
    mockPopulate.mockResolvedValue(mockDbTickets);
    // --- ACT ---
    await getTicketsByEventId(req, res);
    // --- ASSERT ---
    // 1. Kiểm tra chuỗi lệnh DB
    expect(Product.find).toHaveBeenCalledWith({ event_id: mockEventId });
    expect(mockPopulate).toHaveBeenCalledWith("event_id");
    // 2. Kiểm tra status 200
    expect(res.status).toHaveBeenCalledWith(200);
    // 3. Kiểm tra dữ liệu ĐÃ ĐƯỢC ĐỊNH DẠNG
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        // 1. Vé hợp lệ
        expect.objectContaining({
          id: "t1",
          name: "Vé VIP",
          price: "100.000 ₫",
          available: true,
          valid: true,
          note: "Ghi chú sự kiện",
        }),
        // 2. Vé hết hạn
        expect.objectContaining({
          id: "t2",
          available: true, // Vẫn còn hàng
          valid: false, // Nhưng đã hết hạn
        }),
        // 3. Vé bán hết
        expect.objectContaining({
          id: "t3",
          price: "Miễn phí",
          available: false, // Hết hàng
          valid: false, // Không hợp lệ
        }),
      ],
    });
  });

  test("Phải trả về status 404 nếu không tìm thấy vé", async () => {
    // --- ARRANGE ---
    mockPopulate.mockResolvedValue([]);
    // --- ACT ---
    await getTicketsByEventId(req, res);
    // --- ASSERT ---
    expect(Product.find).toHaveBeenCalled();
    expect(mockPopulate).toHaveBeenCalled();
    // 1. Kiểm tra status 404
    expect(res.status).toHaveBeenCalledWith(404);
    // 2. Kiểm tra message lỗi
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "No tickets found for this event",
    });
  });

  test("Phải trả về status 500 nếu có lỗi database", async () => {
    // --- ARRANGE ---
    const errorMessage = "Lỗi database";
    const dbError = new Error(errorMessage);
    mockPopulate.mockRejectedValue(dbError);
    // --- ACT ---
    await getTicketsByEventId(req, res);
    // --- ASSERT ---
    expect(Product.find).toHaveBeenCalled();
    // 1. Kiểm tra status 500
    expect(res.status).toHaveBeenCalledWith(500);
    // 2. Kiểm tra message lỗi
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: errorMessage,
    });
  });
});

describe("Binh Controller - getFormattedEvents", () => {
  let req, res;

  // --- ĐÓNG BĂNG THỜI GIAN ---
  // Chúng ta không cần FAKE_NOW vì hàm này không so sánh
  // mà chỉ định dạng.
  // Tuy nhiên, việc đóng băng thời gian vẫn tốt để đảm bảo
  // múi giờ (timezone) nhất quán.
  beforeAll(() => {
    jest.useFakeTimers();
    // Đặt múi giờ giả định là GMT+7 (Việt Nam)
    jest.setSystemTime(new Date("2025-10-19T14:00:00.000+07:00"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });
  // --- KẾT THÚC ĐÓNG BĂNG THỜI GIAN ---

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    // Reset tất cả mock
    jest.clearAllMocks();
    mockSave.mockClear();
    mockSort.mockClear();
    mockProductFind.mockClear();
    mockPopulate.mockClear();
    mockFindByIdAndUpdate.mockClear();
    mockFindByIdAndDelete.mockClear();
    Product.mockClear();
  });

  test("Phải trả về status 200 và danh sách sự kiện đã được định dạng", async () => {
    // --- ARRANGE ---
    const mockDbResult = [
      {
        _id: "t1",
        price: 150000,
        quantity_sold: 10,
        quantity_total: 100,
        event_id: {
          _id: "e1",
          title: "Đại nhạc hội Mùa Thu",
          description: "Sự kiện âm nhạc...",
          start_time: "2025-10-25T19:30:00.000Z", // 19:30 UTC
          location: "Sân vận động Mỹ Đình",
          poster_url: "http://image.com/poster.jpg",
          category_id: { name: "Âm nhạc" },
          seller_id: { full_name: "Ban tổ chức A" },
        },
      },
      // Vé miễn phí
      {
        _id: "t2",
        price: 0,
        event_id: {
          _id: "e2",
          title: "Sự kiện miễn phí",
          start_time: "2025-11-01T09:00:00.000Z", // 09:00 UTC
          category_id: { name: "Hội thảo" },
        },
      },
    ];
    mockPopulate.mockResolvedValue(mockDbResult);
    const expectedPopulateQuery = {
      path: "event_id",
      populate: [
        { path: "category_id", select: "name" },
        { path: "seller_id", select: "full_name email" },
      ],
    };
    // --- ACT ---
    await getFormattedEvents(req, res);
    // --- ASSERT ---
    // 1. Kiểm tra chuỗi lệnh DB
    expect(Product.find).toHaveBeenCalledWith({ type: "ticket" });
    expect(mockPopulate).toHaveBeenCalledWith(expectedPopulateQuery);
    // 2. Kiểm tra status 200
    expect(res.status).toHaveBeenCalledWith(200);
    // 3. Kiểm tra dữ liệu ĐÃ ĐƯỢC ĐỊNH DẠNG
    // Lưu ý: toLocaleDateString/Time phụ thuộc vào múi giờ của môi trường chạy.
    // Giả định môi trường chạy (và jest.setSystemTime) là GMT+7 (Việt Nam)
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        // 1. Vé 1 (19:30 UTC -> 02:30+1 ngày GMT+7, tức là 26/10)
        expect.objectContaining({
          id: "e1",
          title: "Đại nhạc hội Mùa Thu",
          subtitle: "Sự kiện âm nhạc...",
          date: "26/10/2025",
          time: "02:30",
          location: "Sân vận động Mỹ Đình",
          img: "http://image.com/poster.jpg",
          price: "$150000",
          category: "Âm nhạc",
        }),
        // 2. Vé 2 (09:00 UTC -> 16:00 GMT+7)
        expect.objectContaining({
          id: "e2",
          title: "Sự kiện miễn phí",
          subtitle: "No description", // Test default value
          date: "01/11/2025",
          time: "16:00",
          location: "Updating...", // Test default value
          price: "Free", // Test giá miễn phí
          category: "Hội thảo",
        }),
      ],
    });
  });

  test("Phải trả về status 500 nếu có lỗi database", async () => {
    // --- ARRANGE ---
    const errorMessage = "Lỗi database";
    const dbError = new Error(errorMessage);
    mockPopulate.mockRejectedValue(dbError);
    // --- ACT ---
    await getFormattedEvents(req, res);
    // --- ASSERT ---
    expect(Product.find).toHaveBeenCalled();
    // 1. Kiểm tra status 500
    expect(res.status).toHaveBeenCalledWith(500);
    // 2. Kiểm tra message lỗi
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: errorMessage,
    });
  });
});

describe("Binh Controller - getBannerByRandomCurrentEvent", () => {
  let req, res;

  // --- MOCK THỜI GIAN VÀ RANDOM ---
  // Chọn một ngày cố định, ví dụ: 20/10/2025 (noon UTC)
  const FAKE_NOW = new Date("2025-10-20T12:00:00.000Z");
  let mathRandomSpy;

  beforeAll(() => {
    // 1. Đóng băng thời gian
    jest.useFakeTimers();
    jest.setSystemTime(FAKE_NOW);
    // 2. Đóng băng Math.random() để kết quả không bị ngẫu nhiên
    // (trả về 0.1 sẽ giữ nguyên thứ tự)
    mathRandomSpy = jest.spyOn(Math, "random").mockReturnValue(0.1);
  });

  afterAll(() => {
    // 1. Trả lại thời gian thật
    jest.useRealTimers();
    // 2. Trả lại Math.random() thật
    mathRandomSpy.mockRestore();
  });
  // --- KẾT THÚC MOCK ---

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    // Reset tất cả mock
    jest.clearAllMocks();
    mockSave.mockClear();
    mockSort.mockClear();
    mockProductFind.mockClear();
    mockPopulate.mockClear();
    mockFindByIdAndUpdate.mockClear();
    mockFindByIdAndDelete.mockClear();
    Product.mockClear();
  });

  test("Phải trả về status 200 và tối đa 3 sự kiện đang diễn ra", async () => {
    // --- ARRANGE ---
    const mockDbResult = [
      // 1. Event ĐANG CHẠY
      {
        _id: "t1",
        event_id: {
          _id: "e1",
          title: "Event 1 (Running)",
          start_time: "2025-10-19T00:00Z", // Bắt đầu
          end_time: "2025-10-21T00:00Z", // Kết thúc
          poster_url: "img1.jpg",
        },
      },
      // 2. Event KHÔNG ĐƯỢC DUYỆT (match thất bại)
      { _id: "t2", event_id: null },
      // 3. Event TRONG TƯƠNG LAI
      {
        _id: "t3",
        event_id: {
          _id: "e3",
          title: "Event 3 (Future)",
          start_time: "2025-10-22T00:00Z",
          end_time: "2025-10-23T00:00Z",
        },
      },
      // 4. Event TRONG QUÁ KHỨ
      {
        _id: "t4",
        event_id: {
          _id: "e4",
          title: "Event 4 (Past)",
          start_time: "2025-10-15T00:00Z",
          end_time: "2025-10-17T00:00Z",
        },
      },
      {
        _id: "t5",
        event_id: {
          _id: "e5",
          title: "Event 5 (Running)",
          start_time: "2025-10-20T00:00Z",
          end_time: "2025-10-22T00:00Z",
        },
      },
      {
        _id: "t6",
        event_id: {
          _id: "e6",
          title: "Event 6 (Running)",
          start_time: "2025-10-20T00:00Z",
          end_time: "2025-10-22T00:00Z",
        },
      },
      {
        _id: "t7",
        event_id: {
          _id: "e7",
          title: "Event 7 (Running)",
          start_time: "2025-10-20T00:00Z",
          end_time: "2025-10-22T00:00Z",
        },
      },
    ];
    mockPopulate.mockResolvedValue(mockDbResult);
    const expectedPopulateQuery = {
      path: "event_id",
      match: { status: "approved" }, // Kiểm tra xem có lọc event_id
      populate: [
        { path: "category_id", select: "name" },
        { path: "seller_id", select: "full_name email" },
      ],
    };
    // --- ACT ---
    await getBannerByRandomCurrentEvent(req, res);
    // --- ASSERT ---
    // 1. Kiểm tra chuỗi lệnh DB
    expect(Product.find).toHaveBeenCalledWith({ type: "ticket" });
    expect(mockPopulate).toHaveBeenCalledWith(expectedPopulateQuery);
    // 2. Kiểm tra status 200
    expect(res.status).toHaveBeenCalledWith(200);
    // 3. Kiểm tra dữ liệu ĐÃ ĐƯỢC LỌC VÀ CHỌN (có 4 event đang chạy, nhưng chỉ lấy 3)
    const responseData = res.json.mock.calls[0][0].data;
    expect(responseData.length).toBe(3);
    // 4. Kiểm tra event đầu tiên (vì Math.random đã bị mock, thứ tự sẽ ổn định)
    expect(responseData[0]).toEqual(
      expect.objectContaining({
        id: "e1",
        title: "Event 1 (Running)",
        image: "img1.jpg",
        date: "October 19, 2025", // Test định dạng 'en-US'
      })
    );
  });

  test("Phải trả về status 200 và mảng rỗng nếu không có sự kiện nào đang diễn ra", async () => {
    // --- ARRANGE ---
    const mockDbResult = [
      {
        _id: "t3",
        event_id: {
          _id: "e3",
          title: "Event 3 (Future)",
          start_time: "2025-10-22T00:00Z",
          end_time: "2025-10-23T00:00Z",
        },
      },
      {
        _id: "t4",
        event_id: {
          _id: "e4",
          title: "Event 4 (Past)",
          start_time: "2025-10-15T00:00Z",
          end_time: "2025-10-17T00:00Z",
        },
      },
    ];
    mockPopulate.mockResolvedValue(mockDbResult);
    // --- ACT ---
    await getBannerByRandomCurrentEvent(req, res);
    // --- ASSERT ---
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });

  test("Phải trả về status 500 nếu có lỗi database", async () => {
    // --- ARRANGE ---
    const errorMessage = "Lỗi database";
    const dbError = new Error(errorMessage);
    mockPopulate.mockRejectedValue(dbError);
    // --- ACT ---
    await getBannerByRandomCurrentEvent(req, res);
    // --- ASSERT ---
    expect(Product.find).toHaveBeenCalled();
    // 1. Kiểm tra status 500
    expect(res.status).toHaveBeenCalledWith(500);
    // 2. Kiểm tra message lỗi
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: errorMessage,
    });
  });
});

// describe("Binh Controller - getTrendingEvent", () => {
//   let req, res;

//   // --- MOCK THỜI GIAN ---
//   // Chọn một ngày cố định, ví dụ: 20/10/2025 (noon UTC)
//   const FAKE_NOW = new Date("2025-10-20T12:00:00.000Z");

//   beforeAll(() => {
//     // 1. Đóng băng thời gian
//     jest.useFakeTimers();
//     jest.setSystemTime(FAKE_NOW);
//   });

//   afterAll(() => {
//     // 1. Trả lại thời gian thật
//     jest.useRealTimers();
//   });
//   // --- KẾT THÚC MOCK ---

//   beforeEach(() => {
//     req = {};
//     res = {
//       status: jest.fn().mockReturnThis(),
//       json: jest.fn(),
//     };
//     // Reset tất cả mock
//     jest.clearAllMocks();
//     mockSave.mockClear();
//     mockSort.mockClear();
//     mockPopulate.mockClear();
//     mockProductFind.mockClear();
//     mockFindByIdAndUpdate.mockClear();
//     mockFindByIdAndDelete.mockClear();
//     Product.mockClear();
//   });

//   test("Phải trả về status 200 và top 10 sự kiện chưa kết thúc", async () => {
//     // --- ARRANGE ---
//     const mockDbResult = [
//       // 1. Event ĐÃ KẾT THÚC (Sẽ bị lọc)
//       {
//         _id: "t1",
//         quantity_sold: 200, // Bán nhiều nhất nhưng đã kết thúc
//         event_id: {
//           _id: "e1",
//           end_time: "2025-10-19T00:00Z", // (Trước FAKE_NOW)
//         },
//       },
//       // 2. Event `null` (do match status failed) (Sẽ bị lọc)
//       { _id: "t2", quantity_sold: 150, event_id: null },
//       // 3. Event HỢP LỆ
//       {
//         _id: "t3",
//         quantity_sold: 100,
//         event_id: {
//           _id: "e3",
//           title: "Event 3 (Valid)",
//           start_time: "2025-10-19T00:00Z",
//           end_time: "2025-10-21T00:00Z", // (Sau FAKE_NOW)
//           poster_url: "img3.jpg",
//           category_id: { name: "Âm nhạc" },
//         },
//       },
//       // 4. Event HỢP LỆ (Thêm 10 cái nữa để test slice(0, 10))
//       ...Array.from({ length: 15 }, (_, i) => ({
//         _id: `t${i + 4}`,
//         quantity_sold: 99 - i,
//         event_id: {
//           _id: `e${i + 4}`,
//           title: `Event ${i + 4} (Valid)`,
//           start_time: "2025-10-19T00:00Z",
//           end_time: "2025-10-21T00:00Z",
//         },
//       })),
//     ];
//     mockSort.mockResolvedValue(mockDbResult);
//     const expectedPopulateQuery = {
//       path: "event_id",
//       match: { status: "approved" },
//       populate: [
//         { path: "category_id", select: "name" },
//         { path: "seller_id", select: "full_name email" },
//       ],
//     };
//     // --- ACT ---
//     await getTrendingEvent(req, res);
//     // --- ASSERT ---
//     // 1. Kiểm tra chuỗi lệnh DB
//     expect(Product.find).toHaveBeenCalledWith({ type: "ticket" });
//     expect(mockPopulate).toHaveBeenCalledWith(expectedPopulateQuery);
//     expect(mockSort).toHaveBeenCalledWith({ quantity_sold: -1 });
//     // 2. Kiểm tra status 200
//     expect(res.status).toHaveBeenCalledWith(200);
//     // 3. Kiểm tra dữ liệu ĐÃ ĐƯỢC LỌC VÀ CẮT
//     const responseData = res.json.mock.calls[0][0].data;
//     // (Lọc 2 cái đầu, lấy 10 cái tiếp theo)
//     expect(responseData.length).toBe(10);
//     // 4. Kiểm tra event đầu tiên (phải là e3)
//     expect(responseData[0]).toEqual(
//       expect.objectContaining({
//         id: "e3",
//         title: "Event 3 (Valid)",
//         image: "img3.jpg",
//         category: "Âm nhạc",
//         quantity_sold: 100,
//         date: "October 19, 2025", // Test định dạng 'en-US'
//       })
//     );
//   });

//   test("Phải trả về status 200 và mảng rỗng nếu không có sự kiện nào hợp lệ", async () => {
//     // --- ARRANGE ---
//     const mockDbResult = [
//       { _id: "t1", event_id: { _id: "e1", end_time: "2025-10-19Z" } },
//     ];
//     mockSort.mockResolvedValue(mockDbResult);
//     // --- ACT ---
//     await getTrendingEvent(req, res);
//     // --- ASSERT ---
//     expect(res.status).toHaveBeenCalledWith(200);
//     expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
//   });

//   test("Phải trả về status 500 nếu có lỗi database", async () => {
//     // --- ARRANGE ---
//     const errorMessage = "Lỗi database";
//     const dbError = new Error(errorMessage);
//     mockSort.mockRejectedValue(dbError);
//     // --- ACT ---
//     await getTrendingEvent(req, res);
//     // --- ASSERT ---
//     expect(Product.find).toHaveBeenCalled();
//     // 1. Kiểm tra status 500
//     expect(res.status).toHaveBeenCalledWith(500);
//     // 2. Kiểm tra message lỗi
//     expect(res.json).toHaveBeenCalledWith({
//       success: false,
//       message: errorMessage,
//     });
//   });
// });

// describe("Binh Controller - getDiscountsByEventId", () => {
//   let req, res;
//   const mockEventId = new mongoose.Types.ObjectId().toHexString();

//   // --- MOCK THỜI GIAN ---
//   // Chọn một ngày cố định, ví dụ: 20/10/2025 (noon UTC)
//   // (Ngày hiện tại là 19/10/2025, tôi sẽ dùng ngày đó)
//   const FAKE_NOW = new Date("2025-10-19T12:00:00.000Z");

//   beforeAll(() => {
//     // 1. Đóng băng thời gian
//     jest.useFakeTimers();
//     jest.setSystemTime(FAKE_NOW);
//   });

//   afterAll(() => {
//     // 1. Trả lại thời gian thật
//     jest.useRealTimers();
//   });
//   // --- KẾT THÚC MOCK ---

//   beforeEach(() => {
//     req = { params: { eventId: mockEventId } };
//     res = {
//       status: jest.fn().mockReturnThis(),
//       json: jest.fn(),
//     };
//     // Reset tất cả mock (bao gồm cả mock Discount mới)
//     jest.clearAllMocks();
//     Discount.find.mockClear();
//     // (clear các mock khác nếu cần)
//   });

//   test("Phải trả về status 200 và danh sách discount đã được định dạng (available)", async () => {
//     // --- ARRANGE ---
//     const mockDbDiscounts = [
//       // 1. Discount HỢP LỆ (còn hạn, còn lượt)
//       {
//         _id: "d1",
//         code: "SAVE10",
//         percentage: 10,
//         max_users: 100,
//         user_id: ["user1", "user2"], // 2 < 100
//         valid_from: "2025-10-01T00:00:00Z", // (Trước FAKE_NOW)
//         valid_to: "2025-10-30T00:00:00Z", // (Sau FAKE_NOW)
//       },
//       // 2. Discount HẾT HẠN
//       {
//         _id: "d2",
//         code: "EXPIRED",
//         percentage: 20,
//         max_users: 100,
//         user_id: [],
//         valid_from: "2025-09-01T00:00:00Z",
//         valid_to: "2025-10-01T00:00:00Z", // (Trước FAKE_NOW)
//       },
//       // 3. Discount HẾT LƯỢT
//       {
//         _id: "d3",
//         code: "FULL",
//         percentage: 30,
//         max_users: 2, // Chỉ 2 lượt
//         user_id: ["userA", "userB"], // Đã dùng 2 lượt
//         valid_from: "2025-10-01T00:00:00Z",
//         valid_to: "2025-10-30T00:00:00Z",
//       },
//     ];
//     Discount.find.mockResolvedValue(mockDbDiscounts);
//     // --- ACT ---
//     await getDiscountsByEventId(req, res);
//     // --- ASSERT ---
//     // 1. Kiểm tra DB call
//     expect(Discount.find).toHaveBeenCalledWith({ event_id: mockEventId });
//     // 2. Kiểm tra status 200
//     expect(res.status).toHaveBeenCalledWith(200);
//     // 3. Kiểm tra dữ liệu ĐÃ ĐƯỢC ĐỊNH DẠNG
//     expect(res.json).toHaveBeenCalledWith({
//       success: true,
//       data: [
//         // 1. Hợp lệ
//         expect.objectContaining({
//           id: "d1",
//           code: "SAVE10",
//           available: true, // <-- Logic đúng
//         }),
//         // 2. Hết hạn
//         expect.objectContaining({
//           id: "d2",
//           code: "EXPIRED",
//           available: false, // <-- Logic đúng
//         }),
//         // 3. Hết lượt
//         expect.objectContaining({
//           id: "d3",
//           code: "FULL",
//           available: false, // <-- Logic đúng
//         }),
//       ],
//     });
//   });

//   test("Phải trả về status 404 nếu không tìm thấy discount", async () => {
//     // --- ARRANGE ---
//     Discount.find.mockResolvedValue([]);
//     // --- ACT ---
//     await getDiscountsByEventId(req, res);
//     // --- ASSERT ---
//     expect(Discount.find).toHaveBeenCalled();
//     // 1. Kiểm tra status 404
//     expect(res.status).toHaveBeenCalledWith(404);
//     // 2. Kiểm tra message lỗi
//     expect(res.json).toHaveBeenCalledWith({
//       success: false,
//       message: "No discounts found for this event",
//     });
//   });

//   test("Phải trả về status 500 nếu có lỗi database", async () => {
//     // --- ARRANGE ---
//     const errorMessage = "Lỗi database";
//     const dbError = new Error(errorMessage);
//     Discount.find.mockRejectedValue(dbError);
//     // --- ACT ---
//     await getDiscountsByEventId(req, res);
//     // --- ASSERT ---
//     expect(Discount.find).toHaveBeenCalled();
//     // 1. Kiểm tra status 500
//     expect(res.status).toHaveBeenCalledWith(500);
//     // 2. Kiểm tra message lỗi
//     expect(res.json).toHaveBeenCalledWith({
//       success: false,
//       message: errorMessage,
//     });
//   });
// });

describe("Binh Controller - getDiscountsByEventId", () => {
  let req, res;
  const mockEventId = new mongoose.Types.ObjectId().toHexString();

  // --- MOCK THỜI GIAN ---
  // Chọn một ngày cố định, ví dụ: 19/10/2025
  const FAKE_NOW = new Date("2025-10-19T12:00:00.000Z");

  beforeAll(() => {
    // 1. Đóng băng thời gian
    jest.useFakeTimers();
    jest.setSystemTime(FAKE_NOW);
  });

  afterAll(() => {
    // 1. Trả lại thời gian thật
    jest.useRealTimers();
  });
  // --- KẾT THÚC MOCK ---

  beforeEach(() => {
    req = { params: { eventId: mockEventId } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    // Reset tất cả mock (bao gồm cả Discount.find)
    jest.clearAllMocks();
  });

  test("Phải trả về 200 và danh sách discount đã định dạng (available)", async () => {
    // --- ARRANGE ---
    const mockDbDiscounts = [
      // 1. Discount HỢP LỆ (còn hạn, còn lượt)
      {
        _id: "d1",
        code: "SAVE10",
        percentage: 10,
        max_users: 100,
        user_id: ["user1", "user2"], // 2 < 100
        valid_from: "2025-10-01T00:00:00Z", // (Trước FAKE_NOW)
        valid_to: "2025-10-30T00:00:00Z", // (Sau FAKE_NOW)
      },
      // 2. Discount HẾT HẠN
      {
        _id: "d2",
        code: "EXPIRED",
        percentage: 20,
        max_users: 100,
        user_id: [],
        valid_from: "2025-09-01T00:00:00Z",
        valid_to: "2025-10-01T00:00:00Z", // (Trước FAKE_NOW)
      },
      // 3. Discount HẾT LƯỢT
      {
        _id: "d3",
        code: "FULL",
        percentage: 30,
        max_users: 2, // Chỉ 2 lượt
        user_id: ["userA", "userB"], // Đã dùng 2 lượt (2 < 2 là false)
        valid_from: "2025-10-01T00:00:00Z",
        valid_to: "2025-10-30T00:00:00Z",
      },
    ];
    Discount.find.mockResolvedValue(mockDbDiscounts);
    // --- ACT ---
    await getDiscountsByEventId(req, res);
    // --- ASSERT ---
    // 1. Kiểm tra DB call
    expect(Discount.find).toHaveBeenCalledWith({ event_id: mockEventId });
    // 2. Kiểm tra status 200
    expect(res.status).toHaveBeenCalledWith(200);
    // 3. Kiểm tra dữ liệu ĐÃ ĐƯỢC ĐỊNH DẠNG
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        // 1. Hợp lệ
        expect.objectContaining({
          id: "d1",
          code: "SAVE10",
          available: true, // <-- Logic đúng
        }),
        // 2. Hết hạn
        expect.objectContaining({
          id: "d2",
          code: "EXPIRED",
          available: false, // <-- Logic đúng (do isValid = false)
        }),
        // 3. Hết lượt
        expect.objectContaining({
          id: "d3",
          code: "FULL",
          available: false, // <-- Logic đúng (do user_id.length < max_users = false)
        }),
      ],
    });
  });

  test("Phải trả về 404 nếu không tìm thấy discount", async () => {
    // --- ARRANGE ---
    Discount.find.mockResolvedValue([]);
    // --- ACT ---
    await getDiscountsByEventId(req, res);
    // --- ASSERT ---
    expect(Discount.find).toHaveBeenCalled();
    // 1. Kiểm tra status 404
    expect(res.status).toHaveBeenCalledWith(404);
    // 2. Kiểm tra message lỗi
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "No discounts found for this event",
    });
  });

  test("Phải trả về 500 nếu có lỗi database", async () => {
    // --- ARRANGE ---
    const errorMessage = "Lỗi database";
    const dbError = new Error(errorMessage);
    Discount.find.mockRejectedValue(dbError);
    // --- ACT ---
    await getDiscountsByEventId(req, res);
    // --- ASSERT ---
    expect(Discount.find).toHaveBeenCalled();
    // 1. Kiểm tra status 500
    expect(res.status).toHaveBeenCalledWith(500);
    // 2. Kiểm tra message lỗi
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: errorMessage,
    });
  });
});

describe("Binh Controller - updateDiscount", () => {
  let req, res, mockDiscount, isValidSpy;
  const mockDiscountId = new mongoose.Types.ObjectId().toHexString();
  const mockUserId = new mongoose.Types.ObjectId().toHexString();

  // --- MOCK `mongoose.Types.ObjectId.isValid` ---
  beforeEach(() => {
    // "Theo dõi" hàm isValid của mongoose
    isValidSpy = jest.spyOn(mongoose.Types.ObjectId, "isValid");
  });
  afterEach(() => {
    // Phục hồi lại hàm thật sau mỗi test
    isValidSpy.mockRestore();
  });
  // --- KẾT THÚC MOCK ---

  beforeEach(() => {
    req = {
      params: { id: mockDiscountId },
      body: { userId: mockUserId },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Tạo một instance discount giả
    mockDiscount = {
      _id: mockDiscountId,
      max_users: 10,
      user_id: [], // Bắt đầu với mảng rỗng
      // Gán "bộ điều khiển" save
      save: mockDiscountSave,
      // Thêm hàm .push() thật cho mảng user_id
      // (Vì controller sẽ gọi .push())
      user_id: {
        _data: [],
        push: function (item) {
          this._data.push(item);
        },
        some: function (callback) {
          return this._data.some(callback);
        },
        get length() {
          return this._data.length;
        },
      },
    };

    // Reset tất cả mock
    jest.clearAllMocks();
    Discount.findById.mockClear();
    mockDiscountSave.mockClear();
    isValidSpy.mockClear();

    // Cài đặt mặc định (cho các test case thành công)
    isValidSpy.mockReturnValue(true);
    Discount.findById.mockResolvedValue(mockDiscount);
    mockDiscountSave.mockResolvedValue(true);
  });

  test("Phải trả về 200, thêm user, và alreadyUsed: false", async () => {
    // --- ACT ---
    await updateDiscount(req, res);
    // --- ASSERT ---
    // 1. Kiểm tra các hàm đã gọi
    expect(isValidSpy).toHaveBeenCalledWith(mockDiscountId);
    expect(Discount.findById).toHaveBeenCalledWith(mockDiscountId);
    // 2. Kiểm tra user đã được thêm vào mảng
    expect(mockDiscount.user_id.length).toBe(1);
    // 3. Kiểm tra .save() đã được gọi
    expect(mockDiscountSave).toHaveBeenCalledTimes(1);
    // 4. Kiểm tra kết quả trả về
    expect(res.status).not.toHaveBeenCalled(); // 200 mặc định
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockDiscount,
      alreadyUsed: false,
    });
  });

  test("Phải trả về 200, *không* save, và alreadyUsed: true", async () => {
    // --- ARRANGE ---
    const userObject = { toString: () => mockUserId };
    mockDiscount.user_id._data = [userObject];
    // --- ACT ---
    await updateDiscount(req, res);
    // --- ASSERT ---
    expect(Discount.findById).toHaveBeenCalled();
    // 1. Kiểm tra mảng user_id không thay đổi
    expect(mockDiscount.user_id.length).toBe(1);
    // 2. Kiểm tra .save() KHÔNG được gọi
    expect(mockDiscountSave).not.toHaveBeenCalled();
    // 3. Kiểm tra kết quả trả về
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockDiscount,
      alreadyUsed: true,
    });
  });

  test("Phải trả về 400 nếu voucher đã hết lượt", async () => {
    // --- ARRANGE ---
    mockDiscount.max_users = 1;
    mockDiscount.user_id._data = [{ toString: () => "anotherUser" }];
    // --- ACT ---
    await updateDiscount(req, res);
    // --- ASSERT ---
    expect(Discount.findById).toHaveBeenCalled();
    // 1. Kiểm tra .save() KHÔNG được gọi
    expect(mockDiscountSave).not.toHaveBeenCalled();
    // 2. Kiểm tra status 400
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Voucher đã hết lượt",
    });
  });

  test("Phải trả về 404 nếu không tìm thấy discount", async () => {
    // --- ARRANGE ---
    Discount.findById.mockResolvedValue(null);
    // --- ACT ---
    await updateDiscount(req, res);
    // --- ASSERT ---
    expect(Discount.findById).toHaveBeenCalled();
    expect(mockDiscountSave).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Discount not found",
    });
  });

  test("Phải trả về 400 nếu ID không hợp lệ", async () => {
    // --- ARRANGE ---
    req.params.id = "invalid-id";
    isValidSpy.mockReturnValue(false); // Ra lệnh cho spy trả về false
    // --- ACT ---
    await updateDiscount(req, res);
    // --- ASSERT ---
    expect(isValidSpy).toHaveBeenCalledWith("invalid-id");
    // 1. Kiểm tra KHÔNG gọi DB
    expect(Discount.findById).not.toHaveBeenCalled();
    // 2. Kiểm tra status 400
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid discount ID",
    });
  });

  test("Phải trả về 500 nếu .findById ném lỗi", async () => {
    // --- ARRANGE ---
    const dbError = new Error("DB Error");
    Discount.findById.mockRejectedValue(dbError);
    // --- ACT ---
    await updateDiscount(req, res);
    // --- ASSERT ---
    expect(Discount.findById).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Server error",
      error: "DB Error",
    });
  });
});

describe("Binh Controller - getOrderDetails", () => {
  let req, res;
  const mockOrderId = new mongoose.Types.ObjectId().toHexString();

  beforeEach(() => {
    req = { params: { orderId: mockOrderId } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Reset tất cả mock (bao gồm các bộ điều khiển mới)
    jest.clearAllMocks();
    mockOrderLean.mockClear();
    mockOrderPopulate.mockClear();
    mockOrderFindById.mockClear();
    mockOrderItemLean.mockClear();
    mockOrderItemPopulate.mockClear();
    mockOrderItemFind.mockClear();
  });

  test("Phải trả về 200 và chi tiết đơn hàng đã được định dạng", async () => {
    // --- ARRANGE ---
    // 1. Dữ liệu giả cho `Order.findById`
    const mockDbOrder = {
      _id: mockOrderId,
      order_id: "ORDER123",
      total_amount: 150000,
      status: "paid",
      created_at: "2025-10-19T10:00:00Z",
      updated_at: "2025-10-19T10:00:00Z",
      user_id: {
        full_name: "Test User",
        email: "test@user.com",
        phone_number: "0909090909",
      },
    };
    // 2. Dữ liệu giả cho `OrderItem.find` (đã populate lồng nhau)
    const mockDbItems = [
      {
        product_id: {
          name: "Vé VIP",
          type: "ticket",
          event_id: {
            title: "Sự kiện A",
            start_time: "2025-11-01T19:00Z",
            end_time: "2025-11-01T22:00Z",
            location: "Sân vận động",
          },
        },
        quantity: 1,
        price: 150000,
        total_price: 150000,
      },
    ];
    // 3. "Dạy" các bộ điều khiển
    mockOrderLean.mockResolvedValue(mockDbOrder);
    mockOrderItemLean.mockResolvedValue(mockDbItems);
    // --- ACT ---
    await getOrderDetails(req, res);
    // --- ASSERT ---
    // 1. Kiểm tra DB call 1 (Order)
    expect(Order.findById).toHaveBeenCalledWith(mockOrderId);
    expect(mockOrderPopulate).toHaveBeenCalledWith(
      "user_id",
      "full_name email phone_number"
    );
    expect(mockOrderLean).toHaveBeenCalledTimes(1);
    // 2. Kiểm tra DB call 2 (OrderItem)
    expect(OrderItem.find).toHaveBeenCalledWith({ order_id: mockOrderId });
    expect(mockOrderItemPopulate).toHaveBeenCalledWith({
      path: "product_id",
      populate: { path: "event_id", model: "Event" },
    });
    expect(mockOrderItemLean).toHaveBeenCalledTimes(1);
    // 3. Kiểm tra kết quả (status 200 mặc định)
    expect(res.status).not.toHaveBeenCalled();
    // 4. Kiểm tra dữ liệu ĐÃ ĐƯỢC ĐỊNH DẠNG
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      order: {
        order_id: "ORDER123",
        total_amount: 150000,
        status: "paid",
        created_at: "2025-10-19T10:00:00Z",
        updated_at: "2025-10-19T10:00:00Z",
      },
      user: {
        name: "Test User",
        email: "test@user.com",
        phone: "0909090909",
      },
      products: [
        {
          name: "Vé VIP",
          quantity: 1,
          price: 150000,
          total_price: 150000,
          type: "ticket",
          event: {
            title: "Sự kiện A",
            start_time: "2025-11-01T19:00Z",
            end_time: "2025-11-01T22:00Z",
            location: "Sân vận động",
          },
        },
      ],
    });
  });

  test("Phải trả về 404 nếu không tìm thấy đơn hàng", async () => {
    // --- ARRANGE ---
    mockOrderLean.mockResolvedValue(null);
    // --- ACT ---
    await getOrderDetails(req, res);
    // --- ASSERT ---
    expect(Order.findById).toHaveBeenCalled();
    // 1. Đảm bảo KHÔNG gọi OrderItem.find
    expect(OrderItem.find).not.toHaveBeenCalled();
    // 2. Kiểm tra status 404
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Không tìm thấy đơn hàng",
    });
  });

  test("Phải trả về 500 nếu có lỗi database", async () => {
    // --- ARRANGE ---
    const errorMessage = "Lỗi database";
    const dbError = new Error(errorMessage);
    mockOrderLean.mockRejectedValue(dbError);
    // --- ACT ---
    await getOrderDetails(req, res);
    // --- ASSERT ---
    expect(Order.findById).toHaveBeenCalled();
    // 1. Đảm bảo KHÔNG gọi OrderItem.find
    expect(OrderItem.find).not.toHaveBeenCalled();
    // 2. Kiểm tra status 500
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Lỗi server khi lấy chi tiết đơn hàng",
      error: errorMessage,
    });
  });
});

describe("Binh Controller - getOrderByUserId", () => {
  let req, res;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: { userId: "user123" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Đặt lại mock chain (quan trọng sau khi clearAllMocks)
    Order.find.mockReturnValue({ populate: mockOrderFindPopulate });
    OrderItem.find.mockReturnValue({ populate: mockOrderItemFindPopulate });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // --- Test Case 1: Lấy thành công (200) ---
  test("should return 200 with flattened ticket data on success", async () => {
    // Arrange
    // 1. Giả lập Order.find
    mockOrderFindLean.mockResolvedValue(mockOrders);
    // 2. Giả lập OrderItem.find
    mockOrderItemFindLean.mockResolvedValue(mockOrderItems);
    // Dữ liệu mong đợi sau khi flatten
    const expectedTickets = [
      {
        id: "order1",
        orderId: "O-001",
        eventName: "My Concert",
        productName: "Vé VIP",
        quantity: 1,
        price: 150,
        total: 150, // 150 * 1
        status: "SUCCESS",
        orderDate: "2025-11-03T10:00:00.000Z",
        location: "Stadium",
        start_time: "2025-12-01T18:00:00.000Z",
        end_time: "2025-12-01T22:00:00.000Z",
      },
    ];
    // Act
    await getOrderByUserId(req, res);
    // Assert
    // 1. Kiểm tra gọi Order
    expect(Order.find).toHaveBeenCalledWith({ user_id: "user123" });
    expect(mockOrderFindPopulate).toHaveBeenCalledWith(
      "user_id",
      "full_name email phone_number"
    );
    // 2. Kiểm tra gọi OrderItem (bên trong map)
    expect(OrderItem.find).toHaveBeenCalledTimes(1);
    expect(OrderItem.find).toHaveBeenCalledWith({ order_id: "order1" });
    expect(mockOrderItemFindPopulate).toHaveBeenCalledWith({
      path: "product_id",
      populate: { path: "event_id", model: "Events" },
    });
    // 3. Kiểm tra response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      tickets: expectedTickets,
    });
  });

  // --- Test Case 2: Xử lý dữ liệu bị thiếu (null product/event) ---
  test("should handle missing product or event data gracefully", async () => {
    // Arrange
    const mockItemsMissingData = [
      {
        // Item 1: Product bị null
        _id: "item_null_prod",
        order_id: "order1",
        product_id: null,
        quantity: 1,
      },
      {
        // Item 2: Event bị null
        _id: "item_null_event",
        order_id: "order1",
        product_id: {
          _id: "prod2",
          name: "Áo",
          price: 50,
          type: "merch",
          event_id: null,
        },
        quantity: 2,
      },
    ];

    mockOrderFindLean.mockResolvedValue(mockOrders);
    mockOrderItemFindLean.mockResolvedValue(mockItemsMissingData);

    const expectedTickets = [
      // Item 1
      {
        id: "order1",
        orderId: "O-001",
        eventName: "Không có sự kiện",
        productName: "Sản phẩm không xác định",
        quantity: 1,
        price: 0,
        total: 0, // price * qty = 0 * 1
        status: "SUCCESS",
        orderDate: mockOrders[0].created_at,
        location: "Chưa xác định",
        start_time: undefined,
        end_time: undefined,
      },
      // Item 2
      {
        id: "order1",
        orderId: "O-001",
        eventName: "Không có sự kiện",
        productName: "Áo",
        quantity: 2,
        price: 50,
        total: 100, // price * qty = 50 * 2
        status: "SUCCESS",
        orderDate: mockOrders[0].created_at,
        location: "Chưa xác định",
        start_time: undefined,
        end_time: undefined,
      },
    ];
    // Act
    await getOrderByUserId(req, res);
    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      tickets: expectedTickets,
    });
  });

  // --- Test Case 3: Lỗi 404 - Không tìm thấy Order ---
  test("should return 404 if no orders are found", async () => {
    // Arrange
    mockOrderFindLean.mockResolvedValue([]);
    // Act
    await getOrderByUserId(req, res);
    // Assert
    // 1. Vẫn gọi Order.find
    expect(Order.find).toHaveBeenCalledWith({ user_id: "user123" });
    // 2. Trả về 404
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Không tìm thấy đơn hàng nào của người dùng này",
    });
    // 3. KHÔNG gọi OrderItem.find
    expect(OrderItem.find).not.toHaveBeenCalled();
  });

  // --- Test Case 4: Lỗi 500 - Lỗi khi gọi Order.find ---
  test("should return 500 if Order.find fails", async () => {
    // Arrange
    const dbError = new Error("DB Error 1");
    mockOrderFindLean.mockRejectedValue(dbError);
    // Act
    await getOrderByUserId(req, res);
    // Assert
    // 1. Đã log lỗi
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "❌ Lỗi khi lấy đơn hàng theo userId:",
      dbError
    );
    // 2. Trả về 500
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Lỗi server khi lấy danh sách đơn hàng",
      error: "DB Error 1",
    });
  });

  // --- Test Case 5: Lỗi 500 - Lỗi khi gọi OrderItem.find (bên trong Promise.all) ---
  test("should return 500 if OrderItem.find fails inside Promise.all", async () => {
    // Arrange
    const dbError = new Error("DB Error 2");
    // 1. Order.find thành công
    mockOrderFindLean.mockResolvedValue(mockOrders);
    // 2. OrderItem.find (bên trong map) thất bại
    mockOrderItemFindLean.mockRejectedValue(dbError);
    // Act
    await getOrderByUserId(req, res);
    // Assert
    // 1. Đã log lỗi
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "❌ Lỗi khi lấy đơn hàng theo userId:",
      dbError
    );
    // 2. Trả về 500
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Lỗi server khi lấy danh sách đơn hàng",
      error: "DB Error 2",
    });
  });
});

describe("Binh Controller - addOrdUpdateReview", () => {
  let req, res;
  let consoleErrorSpy, consoleLogSpy;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: { event_id: "event123" },
      body: {
        user_id: "user456",
        rating: 5,
        comments: "Tuyệt vời!",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Spy và tắt tiếng console
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Đóng băng thời gian
    jest.useFakeTimers().setSystemTime(MOCK_DATE);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    jest.useRealTimers();
  });

  // --- Test Case 1: TẠO MỚI review (201) ---
  test("should CREATE a new review if one does not exist (201)", async () => {
    // Arrange
    // 1. findOne trả về null (chưa tồn tại)
    Review.findOne.mockResolvedValue(null);
    // 2. Giả lập hàm save() trả về dữ liệu
    const newReviewData = { _id: "revNew", ...req.body };
    mockSave.mockResolvedValue(newReviewData);
    // Act
    await addOrUpdateReview(req, res);
    // Assert
    // 1. Kiểm tra console.log
    expect(consoleLogSpy).toHaveBeenCalledWith("event123,user456");
    // 2. Kiểm tra findOne
    expect(Review.findOne).toHaveBeenCalledWith({
      user_id: "user456",
      event_id: "event123",
    });
    // 3. Kiểm tra constructor đã được gọi
    expect(Review).toHaveBeenCalledWith({
      user_id: "user456",
      event_id: "event123",
      rating: 5,
      comments: "Tuyệt vời!",
    });
    // 4. Kiểm tra save()
    expect(mockSave).toHaveBeenCalledTimes(1);
    // 5. Kiểm tra response
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Tạo review mới thành công!",
      review: newReviewData,
    });
  });

  // --- Test Case 2: CẬP NHẬT review (200) ---
  test("should UPDATE an existing review (200)", async () => {
    // Arrange
    // 1. Tạo một review giả (quan trọng: phải có hàm save)
    const mockExistingReview = {
      _id: "rev999",
      user_id: "user456",
      event_id: "event123",
      rating: 3,
      comments: "Tạm.",
      updated_at: new Date("2025-10-01T00:00:00.000Z"),
      save: mockSave,
    };
    // 2. findOne trả về review này
    Review.findOne.mockResolvedValue(mockExistingReview);
    // 3. Giả lập save()
    mockSave.mockResolvedValue(mockExistingReview); // Trả về chính nó (đã bị thay đổi)
    // Act
    await addOrUpdateReview(req, res);
    // Assert
    // 1. Kiểm tra findOne
    expect(Review.findOne).toHaveBeenCalledWith({
      user_id: "user456",
      event_id: "event123",
    });
    // 2. KHÔNG gọi constructor
    expect(Review).not.toHaveBeenCalled();
    // 3. Kiểm tra các trường đã được cập nhật TRƯỚC KHI save
    expect(mockExistingReview.rating).toBe(5); // Rating mới
    expect(mockExistingReview.comments).toBe("Tuyệt vời!"); // Comment mới
    expect(mockExistingReview.updated_at).toEqual(MOCK_DATE); // Ngày mới
    // 4. Kiểm tra save()
    expect(mockSave).toHaveBeenCalledTimes(1);
    // 5. Kiểm tra response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Cập nhật review thành công!",
      review: mockExistingReview,
    });
  });

  // --- Test Case 3: Lỗi 400 - Thiếu thông tin ---
  test("should return 400 if user_id or rating is missing", async () => {
    // Arrange
    req.body = { user_id: "user456" }; // Thiếu rating
    // Act
    await addOrUpdateReview(req, res);
    // Assert
    // 1. Kiểm tra response
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Thiếu thông tin cần thiết!",
    });
    // 2. Không gọi DB
    expect(Review.findOne).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });

  // --- Test Case 4: Lỗi 500 - Lỗi findOne ---
  test("should return 500 if findOne fails", async () => {
    // Arrange
    const dbError = new Error("Database error");
    Review.findOne.mockRejectedValue(dbError);
    // Act
    await addOrUpdateReview(req, res);
    // Assert
    // 1. Đã log lỗi
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error:", dbError);
    // 2. Trả về 500
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Lỗi server",
      error: "Database error",
    });
  });

  // --- Test Case 5: Lỗi 500 - Lỗi save() (kịch bản tạo mới) ---
  test("should return 500 if newReview.save() fails", async () => {
    // Arrange
    const dbError = new Error("Save failed");
    Review.findOne.mockResolvedValue(null);
    mockSave.mockRejectedValue(dbError);
    // Act
    await addOrUpdateReview(req, res);
    // Assert
    // 1. Đã gọi constructor và save
    expect(Review).toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalled();
    // 2. Đã log lỗi
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error:", dbError);
    // 3. Trả về 500
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("Binh Controller - getAllReviewsByEvent", () => {
  let req, res;
  let consoleLogSpy, consoleErrorSpy;

  beforeEach(() => {
    // Reset tất cả mocks
    jest.clearAllMocks();

    req = {
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Spy và tắt tiếng console
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Đặt lại mock chain (quan trọng sau khi clearAllMocks)
    Review.find.mockReturnValue({ populate: mockPopulate });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // --- Test Case 1: Lấy thành công (200) ---
  test("should return 200 with reviews, count, and average rating", async () => {
    // Arrange
    req.params.event_id = "event123";
    const mockReviews = [
      { rating: 5, comment: "Tuyệt vời" },
      { rating: 3, comment: "Tạm" },
      { rating: 4, comment: "Tốt" },
    ];
    mockSort.mockResolvedValue(mockReviews);
    // Act
    await getAllReviewsByEvent(req, res);
    // Assert
    // 1. Kiểm tra console.log
    expect(consoleLogSpy).toHaveBeenCalledWith("event123");
    // 2. Kiểm tra query database
    expect(Review.find).toHaveBeenCalledWith({ event_id: "event123" });
    // 3. Kiểm tra chuỗi Mongoose
    expect(mockPopulate).toHaveBeenCalledWith("user_id", "name email");
    expect(mockSort).toHaveBeenCalledWith({ created_at: -1 });
    // 4. Kiểm tra response và tính toán
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Lấy danh sách review thành công!",
      totalReviews: 3,
      averageRating: 4.0, // (5 + 3 + 4) / 3 = 4
      reviews: mockReviews,
    });
  });

  // --- Test Case 2: Lấy thành công nhưng không có review (200) ---
  test("should return 200 with 0 results if no reviews found", async () => {
    // Arrange
    req.params.event_id = "event456";
    mockSort.mockResolvedValue([]);
    // Act
    await getAllReviewsByEvent(req, res);
    // Assert
    // 1. Vẫn gọi query
    expect(Review.find).toHaveBeenCalledWith({ event_id: "event456" });
    // 2. Trả về 200 với kết quả rỗng
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Chưa có review nào cho sự kiện này.",
      totalReviews: 0,
      averageRating: 0,
      reviews: [],
    });
  });

  // --- Test Case 3: Lỗi 400 - Thiếu event_id ---
  test("should return 400 if event_id is missing", async () => {
    // Arrange
    // Act
    await getAllReviewsByEvent(req, res);
    // Assert
    // 1. Trả về 400
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Thiếu event_id!" });
    // 2. Không gọi database
    expect(Review.find).not.toHaveBeenCalled();
  });

  // --- Test Case 4: Lỗi 500 - Lỗi database ---
  test("should return 500 if database query fails", async () => {
    // Arrange
    req.params.event_id = "event123";
    const dbError = new Error("Database error");
    mockSort.mockRejectedValue(dbError);
    // Act
    await getAllReviewsByEvent(req, res);
    // Assert
    // 1. Vẫn gọi query
    expect(Review.find).toHaveBeenCalled();
    // 2. Đã log lỗi
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error:", dbError);
    // 3. Trả về 500
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Lỗi server",
      error: "Database error",
    });
  });
});

describe("Binh Controller - getOrderItemById", () => {
  let req, res;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: { id: "item123" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Đặt lại mock chain (quan trọng sau khi clearAllMocks)
    OrderItem.findById.mockReturnValue({ populate: mockPopulateOrder });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // --- Test Case 1: Lấy thành công (200) ---
  test("should return 200 with formatted item data if found", async () => {
    // Arrange
    mockLean.mockResolvedValue(mockItemFromDB);
    const expectedResponseData = {
      _id: "item123",
      status: "USED",
      createdAt: "2025-11-03T10:00:00.000Z",
      updatedAt: "2025-11-03T10:05:00.000Z",
      product: {
        id: "prod1",
        name: "Test Product",
        price: 100,
        type: "ticket",
        event: {
          id: "event1",
          title: "Test Event",
          location: "Test Location",
          start_time: "2025-12-01T18:00:00.000Z",
          end_time: "2025-12-01T22:00:00.000Z",
        },
      },
      order: {
        id: "order1",
        order_code: "O-123",
        total_amount: 100,
        status: "SUCCESS",
      },
    };
    // Act
    await getOrderItemById(req, res);
    // Assert
    // 1. Kiểm tra query database
    expect(OrderItem.findById).toHaveBeenCalledWith("item123");
    // 2. Kiểm tra populate (order_id)
    expect(mockPopulateOrder).toHaveBeenCalledWith({
      path: "order_id",
      select: "order_id total_amount status created_at",
    });
    // 3. Kiểm tra populate lồng (product_id -> event_id)
    expect(mockPopulateProduct).toHaveBeenCalledWith({
      path: "product_id",
      populate: { path: "event_id", model: "Events" },
    });
    // 4. Kiểm tra lean
    expect(mockLean).toHaveBeenCalledTimes(1);
    // 5. Kiểm tra response
    expect(res.status).not.toHaveBeenCalled(); // 200 là mặc định
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expectedResponseData,
    });
  });

  // --- Test Case 2: Xử lý dữ liệu populate bị null (Graceful) ---
  test("should handle missing populated data gracefully (null event/order)", async () => {
    // Arrange
    const mockItemMissingData = {
      _id: "item456",
      product_id: {
        _id: "prod2",
        name: "Product with no event",
        event_id: null,
      },
      order_id: null,
    };
    mockLean.mockResolvedValue(mockItemMissingData);
    // Act
    await getOrderItemById(req, res);
    // Assert
    // 1. Lấy dữ liệu trả về
    const responseData = res.json.mock.calls[0][0].data;
    // 2. Kiểm tra product
    expect(responseData.product.name).toBe("Product with no event");
    expect(responseData.product.event).toBeNull(); // Do event_id là null
    // 3. Kiểm tra order
    expect(responseData.order.id).toBeUndefined(); // do item.order_id là null
    expect(responseData.order.order_code).toBeUndefined();
    expect(responseData.order.status).toBeUndefined();
  });

  // --- Test Case 3: Lỗi 404 - Không tìm thấy item ---
  test("should return 404 if item not found", async () => {
    // Arrange
    mockLean.mockResolvedValue(null);
    // Act
    await getOrderItemById(req, res);
    // Assert
    // 1. Vẫn gọi query
    expect(OrderItem.findById).toHaveBeenCalledWith("item123");
    // 2. Trả về 404
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Không tìm thấy OrderItem",
    });
  });

  // --- Test Case 4: Lỗi 500 - Lỗi database ---
  test("should return 500 if database query fails", async () => {
    // Arrange
    const dbError = new Error("Database error");
    mockLean.mockRejectedValue(dbError);
    // Act
    await getOrderItemById(req, res);
    // Assert
    // 1. Vẫn gọi query
    expect(OrderItem.findById).toHaveBeenCalledWith("item123");
    // 2. Đã log lỗi
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "❌ Lỗi lấy OrderItem:",
      dbError
    );
    // 3. Trả về 500
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Lỗi server",
      error: "Database error",
    });
  });
});

describe("Binh Controller - updateOrderItem", () => {
  let req, res;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: { id: "item123" },
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Đóng băng thời gian
    jest.useFakeTimers().setSystemTime(MOCK_DATE);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.useRealTimers();
  });

  // --- Test Case 1: Cập nhật thành công (input 'Scanned') ---
  test("should return 200 and update status to Scanned when input is 'Scanned'", async () => {
    // Arrange
    req.body.status = "Scanned";
    const mockUpdatedItem = {
      _id: "item123",
      status: "Scanned",
      updatedAt: MOCK_DATE,
    };
    OrderItem.findByIdAndUpdate.mockResolvedValue(mockUpdatedItem);
    // Act
    await updateOrderItem(req, res);
    // Assert
    // 1. Kiểm tra gọi database
    expect(OrderItem.findByIdAndUpdate).toHaveBeenCalledWith(
      "item123",
      { status: "Scanned", updatedAt: MOCK_DATE }, // <-- Quan trọng: Kiểm tra `updatedAt`
      { new: true }
    );
    // 2. Kiểm tra response
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Cập nhật trạng thái thành công",
      data: mockUpdatedItem,
    });
  });

  // --- Test Case 2: Cập nhật thành công (input 'Pending') ---
  test("should return 200 and update status to Scanned even when input is 'Pending'", async () => {
    // Arrange
    req.body.status = "Pending";
    const mockUpdatedItem = {
      _id: "item123",
      status: "Scanned",
      updatedAt: MOCK_DATE,
    };
    OrderItem.findByIdAndUpdate.mockResolvedValue(mockUpdatedItem);
    // Act
    await updateOrderItem(req, res);
    // Assert
    // 1. Kiểm tra gọi database
    expect(OrderItem.findByIdAndUpdate).toHaveBeenCalledWith(
      "item123",
      { status: "Scanned", updatedAt: MOCK_DATE }, // <-- Vẫn là "Scanned"
      { new: true }
    );
    // 2. Kiểm tra response
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Cập nhật trạng thái thành công",
      data: mockUpdatedItem,
    });
  });

  // --- Test Case 3: Lỗi 400 - Trạng thái không hợp lệ ---
  test("should return 400 if status is invalid", async () => {
    // Arrange
    req.body.status = "InvalidStatus";
    // Act
    await updateOrderItem(req, res);
    // Assert
    // 1. Kiểm tra response
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Trạng thái không hợp lệ (chỉ cho phép Pending hoặc Scanned)",
    });
    // 2. KHÔNG gọi database
    expect(OrderItem.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  // --- Test Case 4: Lỗi 404 - Không tìm thấy item ---
  test("should return 404 if findByIdAndUpdate returns null", async () => {
    // Arrange
    req.body.status = "Scanned";
    OrderItem.findByIdAndUpdate.mockResolvedValue(null);
    // Act
    await updateOrderItem(req, res);
    // Assert
    // 1. Vẫn gọi database
    expect(OrderItem.findByIdAndUpdate).toHaveBeenCalled();
    // 2. Trả về 404
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Không tìm thấy OrderItem",
    });
  });

  // --- Test Case 5: Lỗi 500 - Lỗi database ---
  test("should return 500 if findByIdAndUpdate fails", async () => {
    // Arrange
    req.body.status = "Scanned";
    const dbError = new Error("Database error");
    OrderItem.findByIdAndUpdate.mockRejectedValue(dbError);
    // Act
    await updateOrderItem(req, res);
    // Assert
    // 1. Vẫn gọi database
    expect(OrderItem.findByIdAndUpdate).toHaveBeenCalled();
    // 2. Đã log lỗi
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "❌ Lỗi cập nhật OrderItem:",
      dbError
    );
    // 3. Trả về 500
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Lỗi server",
      error: "Database error",
    });
  });
});

describe("Binh Controller - getOrderItemsByOrderId", () => {
  let req, res;
  let consoleErrorSpy;
  // Một ObjectId hợp lệ để test
  const VALID_OBJECT_ID = "60d0fe4f5311236168a109ca";

  beforeEach(() => {
    // Reset tất cả mocks
    jest.clearAllMocks();

    req = {
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Spy và tắt tiếng console.error
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Đặt lại mock chain (quan trọng sau khi clearAllMocks)
    OrderItem.find.mockReturnValue({ populate: mockPopulate });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // --- Test Case 1: Lấy thành công (200) ---
  test("should return 200 with items and count if found", async () => {
    // Arrange
    req.params.orderId = VALID_OBJECT_ID;
    const mockItems = [
      { _id: "item1", product_id: { name: "Product A" } },
      { _id: "item2", product_id: { name: "Product B" } },
    ];
    mockSort.mockResolvedValue(mockItems);
    // Act
    await getOrderItemsByOrderId(req, res);
    // Assert
    // 1. Kiểm tra query database
    expect(OrderItem.find).toHaveBeenCalledWith({ order_id: VALID_OBJECT_ID });
    // 2. Kiểm tra chuỗi Mongoose
    expect(mockPopulate).toHaveBeenCalledWith("product_id", "name price image");
    expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
    // 3. Kiểm tra response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      count: 2,
      items: mockItems,
    });
  });

  // --- Test Case 2: Lỗi 404 - Không tìm thấy item ---
  test("should return 404 if no items are found", async () => {
    // Arrange
    req.params.orderId = VALID_OBJECT_ID;
    mockSort.mockResolvedValue([]);
    // Act
    await getOrderItemsByOrderId(req, res);
    // Assert
    // 1. Vẫn gọi query
    expect(OrderItem.find).toHaveBeenCalledWith({ order_id: VALID_OBJECT_ID });
    // 2. Trả về 404
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Không có item nào trong đơn hàng này",
    });
  });

  // --- Test Case 3: Lỗi 400 - orderId không hợp lệ (invalid) ---
  test("should return 400 if orderId is invalid", async () => {
    // Arrange
    req.params.orderId = "invalid-id-format";
    // Act
    await getOrderItemsByOrderId(req, res);
    // Assert
    // 1. Trả về 400
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "orderId không hợp lệ",
    });
    // 2. KHÔNG gọi database
    expect(OrderItem.find).not.toHaveBeenCalled();
  });

  // --- Test Case 4: Lỗi 400 - Thiếu orderId ---
  test("should return 400 if orderId is missing", async () => {
    // Arrange
    // Act
    await getOrderItemsByOrderId(req, res);
    // Assert
    // 1. Trả về 400
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "orderId không hợp lệ",
    });
    // 2. KHÔNG gọi database
    expect(OrderItem.find).not.toHaveBeenCalled();
  });

  // --- Test Case 5: Lỗi 500 - Lỗi database ---
  test("should return 500 if database query fails", async () => {
    // Arrange
    req.params.orderId = VALID_OBJECT_ID;
    const dbError = new Error("Database connection error");
    mockSort.mockRejectedValue(dbError);
    // Act
    await getOrderItemsByOrderId(req, res);
    // Assert
    // 1. Vẫn gọi query
    expect(OrderItem.find).toHaveBeenCalled();
    // 2. Đã log lỗi
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "❌ Lỗi khi lấy OrderItems:",
      dbError
    );
    // 3. Trả về 500
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Database connection error",
    });
  });
});
