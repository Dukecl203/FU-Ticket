const mongoose = require("mongoose");
const {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventsByMode,
  getEventsByCategory,
  getEventsByUserId,
  getEventReport,
  recommendEvents,
  getFinancialReport,
  requestEventPublish,
  testEmail,
  getAdminUsers,
} = require("../../controllers/eventController.js");

jest.mock("../../model/Event.js", () => {
  const mongoose = require("mongoose");

  // --- BỘ PHẬN LINH HOẠT ĐỂ GỌI CHUỖI LỆNH ---
  const createChainable = () => ({
    populate: jest.fn().mockReturnThis(), // .populate() trả về chính nó
    exec: jest.fn(), // Hàm cuối cùng để trả về Promise
  });

  // --- CONSTRUCTOR CHO `new Event()`---
  const MockEvent = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data);
    this.toObject = function () {
      const { save, toObject, ...rest } = this;
      return rest;
    };
    this.save = jest.fn().mockImplementation(() => {
      this._id = new mongoose.Types.ObjectId();
      return Promise.resolve(this);
    });
  });

  // Gán các phương thức tĩnh
  MockEvent.find = jest.fn().mockImplementation(createChainable);
  MockEvent.findById = jest.fn().mockImplementation(createChainable);
  MockEvent.findByIdAndDelete = jest.fn();
  MockEvent.findByIdAndUpdate = jest.fn().mockImplementation(createChainable);
  return MockEvent;
});

jest.mock("../../model/Ticket.js", () => ({
  find: jest.fn().mockReturnValue({
    select: jest.fn(),
  }),
}));

jest.mock("../../model/OrderItem.js", () => ({
  find: jest.fn().mockReturnValue({
    populate: jest.fn().mockReturnThis(),
    populate: jest.fn(),
  }),
}));

jest.mock("../../model/Order.js", () => ({
  find: jest.fn().mockReturnValue({
    populate: jest.fn(),
  }),
}));

jest.mock("../../models/Payment");

jest.mock("../OutsiderFunc.js", () => ({
  getDisplayStatus: jest.fn(),
}));

const Event = require("../../model/Event");
const Product = require("../../model/Ticket");
const Order = require("../../model/Order");
const OrderItem = require("../../model/OrderItem");
const User = require("../../models/Users");
const Payment = require("../../models/Payment");
const { getDisplayStatus } = require("../OutsiderFunc.js");

const mockSort = jest.fn();
const mockPopulateSeller = jest.fn(() => ({ sort: mockSort }));
const mockPopulateCategory = jest.fn(() => ({ populate: mockPopulateSeller }));
Event.find.mockReturnValue({ populate: mockPopulateCategory });

const mockEventFindPopSeller = jest.fn();
const mockEventFindPopCat = jest.fn(() => ({
  populate: mockEventFindPopSeller,
}));
Event.find.mockReturnValue({ populate: mockEventFindPopCat });

const mockOrderFindPopulate = jest.fn();
Order.find.mockReturnValue({ populate: mockOrderFindPopulate });

const mockEventPopSeller = jest.fn();
const mockEventPopCat = jest.fn(() => ({ populate: mockEventPopSeller }));
const mockProductSelect = jest.fn();
const mockOrderItemPopOrder = jest.fn();
const mockOrderItemPopProduct = jest.fn(() => ({
  populate: mockOrderItemPopOrder,
}));
const mockOrderPopUser = jest.fn();

const mockSelect = jest.fn();
jest.mock("../../models/Users", () => ({
  find: jest.fn(() => ({ select: mockSelect })),
}));

const mockFindByIdPopulate = jest.fn();
const mockFindByIdAndUpdatePopulate = jest.fn();
Event.findById.mockReturnValue({ populate: mockFindByIdPopulate });
Event.findByIdAndUpdate.mockReturnValue({
  populate: mockFindByIdAndUpdatePopulate,
});

// Đóng băng thời gian
const MOCK_NOW = new Date("2025-11-03T10:20:15.000Z");

// 1. Event
const mockEvent = {
  _id: "event1",
  title: "Mock Event Title",
  category_id: { name: "Music" },
  seller_id: { full_name: "Mock Seller" },
  start_time: "2025-12-01T18:00:00.000Z",
  end_time: "2025-12-01T22:00:00.000Z",
  location: "Mock Location",
  status: "approved",
};

// 2. Products
const mockProducts = [
  {
    _id: "prod1-ticket",
    name: "Vé VIP",
    type: "ticket",
    price: 100,
    quantity_total: 100,
    quantity_sold: 20,
  },
  {
    _id: "prod2-merch",
    name: "Áo Thun",
    type: "merchandise",
    price: 25,
    quantity_total: 50,
    quantity_sold: 10,
  },
];

// 3. Orders
const mockOrders = [
  {
    _id: "order1",
    user_id: { full_name: "User A", email: "a@test.com" },
    total_amount: 200,
    created_at: "2025-11-01T10:00:00.000Z",
  },
  {
    _id: "order2",
    user_id: { full_name: "User B", email: "b@test.com" },
    total_amount: 125,
    created_at: "2025-11-02T11:00:00.000Z",
  },
  {
    _id: "order3",
    user_id: { full_name: "User A", email: "a@test.com" },
    total_amount: 25,
    created_at: "2025-11-02T12:00:00.000Z",
  },
];

// 4. OrderItems (Liên kết Order và Product)
const mockOrderItems = [
  // Order 1: 2 vé VIP
  {
    order_id: "order1",
    product_id: mockProducts[0],
    quantity: 2,
    price: 100,
    total_price: 200,
  },
  // Order 2: 1 vé VIP, 1 Áo
  {
    order_id: "order2",
    product_id: mockProducts[0],
    quantity: 1,
    price: 100,
    total_price: 100,
  },
  {
    order_id: "order2",
    product_id: mockProducts[1],
    quantity: 1,
    price: 25,
    total_price: 25,
  },
  // Order 3: 1 Áo (Pending)
  {
    order_id: "order3",
    product_id: mockProducts[1],
    quantity: 1,
    price: 25,
    total_price: 25,
  },
];

// 5. Payments (Liên kết Order)
const mockPayments = [
  {
    order_id: "order1",
    amount: 200,
    status: "SUCCESS",
    payment_method: "VNPAY",
    created_at: "2025-11-01T10:01:00.000Z",
  },
  {
    order_id: "order2",
    amount: 125,
    status: "SUCCESS",
    payment_method: "MOMO",
    created_at: "2025-11-02T11:01:00.000Z",
  },
  {
    order_id: "order3",
    amount: 25,
    status: "PENDING",
    payment_method: "VNPAY",
    created_at: "2025-11-02T12:01:00.000Z",
  },
];

describe("Event Controller - getAllEvents", () => {
  let req, res;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  test("Phải trả về status 200 và danh sách sự kiện đã được map", async () => {
    // --- ARRANGE ---
    const mockEvents = [
      // --- Sự kiện 1: Sắp diễn ra ---
      {
        _id: new mongoose.Types.ObjectId().toHexString(),
        seller_id: {
          full_name: "Alice Wonderland",
          email: "alice@example.com",
        },
        title: "Đại nhạc hội Mùa Thu",
        description: "Một đêm nhạc sôi động với các ngôi sao hàng đầu.",
        start_time: new Date("2025-10-26T19:00:00.000Z"),
        end_time: new Date("2025-10-26T23:00:00.000Z"),
        location: "Sân vận động Mỹ Đình, Hà Nội",
        category_id: {
          name: "Âm nhạc",
          description: "Các sự kiện liên quan đến âm nhạc và biểu diễn.",
        },
        status: "approved",
        poster_url: "https://example.com/poster1.jpg",
        created_at: new Date("2025-09-01T10:00:00.000Z"),
        updated_at: new Date("2025-09-01T10:00:00.000Z"),
        toObject: function () {
          const { toObject, ...rest } = this;
          return rest;
        },
      },
      // --- Sự kiện 2: Đã kết thúc ---
      {
        _id: new mongoose.Types.ObjectId().toHexString(),
        seller_id: {
          full_name: "Bob Builder",
          email: "bob@example.com",
        },
        title: "Triển lãm Công nghệ TechExpo",
        description: "Nơi quy tụ những sản phẩm công nghệ mới nhất.",
        start_time: new Date("2024-05-10T09:00:00.000Z"),
        end_time: new Date("2024-05-12T17:00:00.000Z"),
        location: "Trung tâm Hội nghị Quốc gia, Hà Nội",
        category_id: {
          name: "Công nghệ",
          description: "Các sự kiện về khoa học và công nghệ.",
        },
        status: "approved",
        poster_url: "https://example.com/poster2.jpg",
        created_at: new Date("2024-03-15T14:00:00.000Z"),
        updated_at: new Date("2024-03-15T14:00:00.000Z"),
        toObject: function () {
          const { toObject, ...rest } = this;
          return rest;
        },
      },
    ];
    // Mock chuỗi lệnh
    const finalPopulate = jest.fn().mockResolvedValue(mockEvents);
    const firstPopulate = { populate: finalPopulate };
    Event.find.mockReturnValue({
      populate: jest.fn().mockReturnValue(firstPopulate),
    });
    // Giả lập hàm getDisplayStatus
    getDisplayStatus.mockReturnValue("Upcoming");
    // --- ACT ---
    await getAllEvents(req, res);
    // --- ASSERT ---
    expect(Event.find).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.data).toBeInstanceOf(Array);
    expect(responseData.data.length).toBeGreaterThan(0);
  });

  test("Phải trả về status 500 và message lỗi khi có lỗi xảy ra", async () => {
    // --- ARRANGE: Chuẩn bị ---
    // 1. Tạo một đối tượng lỗi để mô phỏng
    const errorMessage = "Lỗi kết nối database";
    const dbError = new Error(errorMessage);
    // 2. Mock Event.find() để nó ném ra lỗi (reject a promise)
    // Đây là điểm mấu chốt: chúng ta ra lệnh cho mock ném ra lỗi thay vì trả về dữ liệu.
    const finalPopulate = jest.fn().mockRejectedValue(dbError);
    const firstPopulate = { populate: finalPopulate };
    Event.find.mockReturnValue({
      populate: jest.fn().mockReturnValue(firstPopulate),
    });
    // --- ACT: Gọi hàm controller ---
    await getAllEvents(req, res);
    // --- ASSERT: Khẳng định ---
    // 1. Kiểm tra xem res.status có được gọi với mã lỗi 500 không
    expect(res.status).toHaveBeenCalledWith(500);
    // 2. Kiểm tra xem res.json có được gọi với đúng cấu trúc lỗi không
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: errorMessage,
    });
  });
});

describe("Event Controller - getEventById", () => {
  let req, res;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  test("Phải trả về status 200 và sự kiện khi tìm thấy", async () => {
    // --- ARRANGE ---
    const eventId = new mongoose.Types.ObjectId().toHexString();
    req = {
      params: {
        id: eventId,
      },
    };
    const mockEvent = {
      _id: eventId,
      seller_id: {
        full_name: "Alice Wonderland",
        email: "alice@example.com",
      },
      title: "Đại nhạc hội Mùa Thu",
      description: "Một đêm nhạc sôi động với các ngôi sao hàng đầu.",
      start_time: new Date("2025-10-26T19:00:00.000Z"),
      end_time: new Date("2025-10-26T23:00:00.000Z"),
      location: "Sân vận động Mỹ Đình, Hà Nội",
      category_id: {
        name: "Âm nhạc",
        description: "Các sự kiện liên quan đến âm nhạc và biểu diễn.",
      },
      status: "approved",
      poster_url: "https://example.com/poster1.jpg",
      created_at: new Date("2025-09-01T10:00:00.000Z"),
      updated_at: new Date("2025-09-01T10:00:00.000Z"),
      toObject: function () {
        const { toObject, ...rest } = this;
        return rest;
      },
    };
    // Mock chuỗi findById().populate().populate()
    const finalPopulate = jest.fn().mockResolvedValue(mockEvent);
    const firstPopulate = { populate: finalPopulate };
    Event.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue(firstPopulate),
    });
    // --- ACT ---
    await getEventById(req, res);
    // --- ASSERT ---
    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.data).toBeDefined();
    expect(responseData.data).not.toBeNull();
    expect(responseData.data._id).toEqual(eventId);
  });

  test("Phải trả về status 404 khi không tìm thấy sự kiện với ID đã cho", async () => {
    // --- ARRANGE ---
    const eventId = new mongoose.Types.ObjectId().toHexString();
    req = {
      params: { id: eventId },
    };
    // Giả lập findById trả về null (không tìm thấy)
    const finalPopulate = jest.fn().mockResolvedValue(null);
    const firstPopulate = { populate: finalPopulate };
    Event.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue(firstPopulate),
    });
    // --- ACT ---
    await getEventById(req, res);
    // --- ASSERT ---
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Event not found",
    });
  });

  test("Phải trả về status 500 và message lỗi khi có lỗi xảy ra", async () => {
    // --- ARRANGE ---
    const eventId = new mongoose.Types.ObjectId().toHexString();
    req = {
      params: { id: eventId },
    };
    const errorMessage = "Lỗi database";
    const dbError = new Error(errorMessage);
    // Giả lập findById ném ra lỗi
    const finalPopulate = jest.fn().mockRejectedValue(dbError);
    const firstPopulate = { populate: finalPopulate };
    Event.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue(firstPopulate),
    });
    // --- ACT ---
    await getEventById(req, res);
    // --- ASSERT ---
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: errorMessage,
    });
  });
});

describe("Event Controller - createEvent", () => {
  let req, res;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  test("Phải trả về status 201 và sự kiện mới tạo", async () => {
    // --- ARRANGE ---
    // 1. Dữ liệu đầu vào (payload) mà người dùng thực sự gửi đi
    const eventPayload = {
      seller_id: new mongoose.Types.ObjectId().toHexString(), // Giả sử người dùng đã đăng nhập và có ID
      title: "Đại nhạc hội Mùa Thu",
      description: "Một đêm nhạc sôi động với các ngôi sao hàng đầu.",
      start_time: new Date("2025-10-26T19:00:00.000Z"),
      end_time: new Date("2025-10-26T23:00:00.000Z"),
      location: "Sân vận động Mỹ Đình, Hà Nội",
      category_id: new mongoose.Types.ObjectId().toHexString(),
      poster_url: "https://example.com/poster1.jpg",
    };
    // 2. Thiết lập req.body
    req = {
      body: eventPayload,
    };
    // Mock cho Event.save() đã được thiết lập ở đầu file, không cần thay đổi
    // --- ACT ---
    await createEvent(req, res);
    // --- ASSERT ---
    const responseData = res.json.mock.calls[0][0];
    expect(res.status).toHaveBeenCalledWith(201);
    expect(responseData.data).toBeDefined();
    expect(responseData.data).not.toBeNull();
    expect(responseData.data).toHaveProperty("_id");
  });

  test("Phải trả về status 500 và message lỗi khi có lỗi xảy ra", async () => {
    // --- ARRANGE ---
    const newEventData = {
      title: "Sự kiện Lỗi",
      // ...
    };
    req = {
      body: newEventData,
    };
    const errorMessage = "Lỗi ghi vào database";
    const dbError = new Error(errorMessage);
    // Ghi đè mock `save` để nó ném ra lỗi cho riêng test case này
    Event.mockImplementationOnce(() => {
      return {
        save: jest.fn().mockRejectedValue(dbError), // Ra lệnh cho save() ném ra lỗi
      };
    });
    // --- ACT ---
    await createEvent(req, res);
    // --- ASSERT ---
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: errorMessage,
    });
  });
});

describe("Event Controller - updateEvent", () => {
  let req, res;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  test("Phải trả về status 200 và sự kiện đã cập nhật", async () => {
    // --- ARRANGE ---
    const eventId = new mongoose.Types.ObjectId().toHexString();
    const updateData = {
      title: "Tiêu đề đã được cập nhật",
      location: "Địa điểm mới",
    };
    req = {
      params: { id: eventId },
      body: updateData,
    };
    // Tạo một sự kiện giả "trước khi cập nhật"
    const mockEventBeforeUpdate = {
      _id: eventId,
      title: "Tiêu đề cũ",
      location: "Địa điểm cũ",
      description: "Một đêm nhạc sôi động với các ngôi sao hàng đầu.",
      start_time: new Date("2025-10-26T19:00:00.000Z"),
      end_time: new Date("2025-10-26T23:00:00.000Z"),
      category_id: new mongoose.Types.ObjectId().toHexString(),
      poster_url: "https://example.com/poster1.jpg",
      created_at: new Date("2025-09-01T10:00:00.000Z"),
      updated_at: new Date("2025-09-01T10:00:00.000Z"),
      ...updateData, // Gán dữ liệu mới vào
      // Mock phương thức save() để nó trả về chính đối tượng đã cập nhật
      save: jest.fn().mockResolvedValue({
        _id: eventId,
        title: "Tiêu đề đã được cập nhật",
        location: "Địa điểm mới",
        toObject: () => ({
          _id: eventId,
          title: "Tiêu đề đã được cập nhật",
          location: "Địa điểm mới",
        }),
      }),
    };

    // Giả lập Event.findById tìm thấy sự kiện này
    Event.findById.mockResolvedValue(mockEventBeforeUpdate);
    // --- ACT ---
    await updateEvent(req, res);
    // --- ASSERT ---
    expect(Event.findById).toHaveBeenCalledWith(eventId);
    expect(mockEventBeforeUpdate.save).toHaveBeenCalled(); // Quan trọng: Kiểm tra xem save() có được gọi không
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Cập nhật sự kiện thành công",
      data: expect.objectContaining({
        title: "Tiêu đề đã được cập nhật", // Kiểm tra dữ liệu đã được cập nhật
      }),
    });
  });

  test("Phải trả về status 404 khi không tìm thấy sự kiện với ID đã cho", async () => {
    // --- ARRANGE ---
    const eventId = new mongoose.Types.ObjectId().toHexString(); // Tạo ID ngẫu nhiên cho sự kiện
    req = {
      params: { id: eventId },
      body: { title: "Cập nhật không thành công" }, // Dữ liệu mock để update
    };
    // Giả lập findByIdAndUpdate trả về null (không tìm thấy sự kiện)
    Event.findByIdAndUpdate = jest.fn().mockResolvedValue(null);
    // Giả lập res.status và res.json để kiểm tra phản hồi
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    // --- ACT ---
    await updateEvent(req, res); // Gọi hàm updateEvent
    // --- ASSERT ---
    expect(res.status).toHaveBeenCalledWith(404); // Kiểm tra mã trạng thái trả về
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Event not found", // Kiểm tra thông báo lỗi trả về
    });
  });

  test("Phải trả về status 500 và message lỗi khi có lỗi xảy ra", async () => {
    // --- ARRANGE ---
    const eventId = new mongoose.Types.ObjectId().toHexString();
    req = {
      params: { id: eventId },
      body: { title: "Gây lỗi" },
    };
    const errorMessage = "Lỗi database";
    const dbError = new Error(errorMessage);
    // Giả lập findById ném ra lỗi
    Event.findById.mockRejectedValue(dbError);
    // --- ACT ---
    await updateEvent(req, res);
    // --- ASSERT ---
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: errorMessage,
    });
  });
});

describe("Event Controller - deleteEvent", () => {
  let req, res;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  test("Phải trả về status 200 khi xóa sự kiện thành công", async () => {
    // --- ARRANGE ---
    const eventId = new mongoose.Types.ObjectId().toHexString();
    req = {
      params: { id: eventId },
    };
    // Giả lập findByIdAndDelete tìm thấy và xóa một đối tượng
    const deletedEvent = { _id: eventId, title: "Sự kiện đã bị xóa" };
    Event.findByIdAndDelete.mockResolvedValue(deletedEvent);
    // --- ACT ---
    await deleteEvent(req, res);
    // --- ASSERT ---
    expect(Event.findByIdAndDelete).toHaveBeenCalledWith(eventId);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Event deleted successfully",
    });
  });

  test("Phải trả về status 404 khi không tìm thấy sự kiện với ID đã cho", async () => {
    // --- ARRANGE ---
    const eventId = new mongoose.Types.ObjectId().toHexString();
    req = {
      params: { id: eventId },
    };
    // Giả lập findByIdAndDelete trả về null (không tìm thấy gì để xóa)
    Event.findByIdAndDelete.mockResolvedValue(null);
    // --- ACT ---
    await deleteEvent(req, res);
    // --- ASSERT ---
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Event not found",
    });
  });

  test("Phải trả về status 500 và message lỗi khi có lỗi xảy ra", async () => {
    // --- ARRANGE ---
    const eventId = new mongoose.Types.ObjectId().toHexString();
    req = {
      params: { id: eventId },
    };
    const errorMessage = "Lỗi database";
    const dbError = new Error(errorMessage);
    // Giả lập findByIdAndDelete ném ra lỗi
    Event.findByIdAndDelete.mockRejectedValue(dbError);
    // --- ACT ---
    await deleteEvent(req, res);
    // --- ASSERT ---
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: errorMessage,
    });
  });
});

describe("Event Controller - getEventsByMode", () => {
  const FAKE_NOW = new Date("2025-10-18T10:00:00.000Z");

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FAKE_NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  let req, res;
  beforeEach(() => {
    req = { query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  test("Phải trả về status 200 và danh sách sự kiện theo thời gian", async () => {
    // --- ARRANGE ---
    req.query.mode = "week";
    const mockEvents = [
      {
        _id: "1",
        title: "Event 1",
        toObject: () => ({ _id: "1", title: "Event 1" }),
      },
    ];
    // Ra lệnh cho chuỗi lệnh trả về kết quả
    // Vì mock của chúng ta linh hoạt, chúng ta chỉ cần mock bước cuối cùng
    Event.find().populate().populate.mockResolvedValue(mockEvents);
    getDisplayStatus.mockReturnValue("Upcoming");
    // Tính toán ngày dự kiến dựa trên FAKE_NOW (2025-10-18)
    const expectedStart = new Date("2025-10-18T00:00:00.000Z");
    const expectedEnd = new Date("2025-10-25T23:59:59.999Z");
    // --- ACT ---
    await getEventsByMode(req, res);
    // --- ASSERT ---
    expect(Event.find).toHaveBeenCalledWith({
      start_time: { $gte: expectedStart, $lte: expectedEnd },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ _id: "1", title: "Event 1", display_status: "Upcoming" }],
    });
  });

  test("Phải trả về status 500 nếu có lỗi xảy ra", async () => {
    // --- ARRANGE ---
    req.query.mode = "month"; // Mode phải hợp lệ để đi đến bước `find`
    const errorMessage = "Lỗi database";
    const dbError = new Error(errorMessage);
    // Ra lệnh cho chuỗi lệnh ném ra lỗi
    Event.find().populate().populate.mockRejectedValue(dbError);
    // --- ACT ---
    await getEventsByMode(req, res);
    // --- ASSERT ---
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: errorMessage,
    });
  });
});

describe("Event Controller - getEventsByCategory", () => {
  let req, res;
  let mockAllEvents;

  beforeEach(() => {
    req = { query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();

    // --- ARRANGE CHUNG ---
    // Tạo mock data cho các sự kiện
    const mockMusicEvent = {
      _id: "1",
      title: "Sự kiện Âm nhạc",
      category_id: { name: "Music" },
      toObject: function () {
        return this;
      },
    };
    const mockSportsEvent = {
      _id: "2",
      title: "Sự kiện Thể thao",
      category_id: { name: "Sports" },
      toObject: function () {
        return this;
      },
    };
    mockAllEvents = [mockMusicEvent, mockSportsEvent];

    getDisplayStatus.mockReturnValue("Test Status");
  });

  test("Phải trả về status 200 và danh sách sự kiện theo phân loại ", async () => {
    // --- ARRANGE ---
    req.query.category = "Music";
    // Ra lệnh cho chuỗi lệnh trả về TẤT CẢ sự kiện
    Event.find().populate().populate.mockResolvedValue(mockAllEvents);
    // --- ACT ---
    await getEventsByCategory(req, res);
    // --- ASSERT ---
    expect(Event.find).toHaveBeenCalled(); // Đã gọi DB
    expect(res.status).toHaveBeenCalledWith(200);
    // Kiểm tra xem logic filter của JS đã chạy đúng
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        {
          _id: "1",
          title: "Sự kiện Âm nhạc",
          category_id: { name: "Music" },
          display_status: "Test Status",
          toObject: expect.any(Function),
        },
      ],
    });
  });

  test("Phải trả về status 500 nếu có lỗi xảy ra", async () => {
    // --- ARRANGE ---
    req.query.category = "Music"; // Mode phải hợp lệ để đi đến bước `find`
    const errorMessage = "Lỗi database";
    const dbError = new Error(errorMessage);
    // Ra lệnh cho chuỗi lệnh ném ra lỗi
    Event.find().populate().populate.mockRejectedValue(dbError);
    // --- ACT ---
    await getEventsByCategory(req, res);
    // --- ASSERT ---
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: errorMessage,
    });
  });

  test("Phải trả về status 400 nếu thiếu tham số 'category'", async () => {
    // --- ARRANGE ---
    // req.query.category đã rỗng (do beforeEach)
    // --- ACT ---
    await getEventsByCategory(req, res);
    // --- ASSERT ---
    expect(Event.find).not.toHaveBeenCalled(); // Không được gọi DB
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Missing category parameter",
    });
  });
});

describe("Event Controller - getEventsByUserId", () => {
  let req, res;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks(); // Rất quan trọng!

    req = {
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Đặt lại mock chain (vì jest.clearAllMocks() có thể xóa nó)
    Event.find.mockReturnValue({ populate: mockPopulateCategory });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // --- Test Case 1: Lấy thành công (200) ---
  test("should return 200 with events, count, and display_status", async () => {
    // Arrange
    req.params.userId = "seller123";
    const mockEvents = [
      {
        _id: "e1",
        title: "Event 1",
        toObject: () => ({ _id: "e1", title: "Event 1" }),
      },
      {
        _id: "e2",
        title: "Event 2",
        toObject: () => ({ _id: "e2", title: "Event 2" }),
      },
    ];
    mockSort.mockResolvedValue(mockEvents);
    getDisplayStatus.mockReturnValue("Ongoing");
    const expectedMappedData = [
      { _id: "e1", title: "Event 1", display_status: "Ongoing" },
      { _id: "e2", title: "Event 2", display_status: "Ongoing" },
    ];
    // Act
    await getEventsByUserId(req, res);
    // Assert
    // 1. Kiểm tra query
    expect(Event.find).toHaveBeenCalledWith({ seller_id: "seller123" });
    // 2. Kiểm tra chuỗi Mongoose
    expect(mockPopulateCategory).toHaveBeenCalledWith(
      "category_id",
      "name description"
    );
    expect(mockPopulateSeller).toHaveBeenCalledWith(
      "seller_id",
      "full_name email"
    );
    expect(mockSort).toHaveBeenCalledWith({ created_at: -1 });
    // 3. Kiểm tra helper
    expect(getDisplayStatus).toHaveBeenCalledTimes(2);
    // 4. Kiểm tra response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expectedMappedData,
      count: 2,
    });
  });

  // --- Test Case 2: Lấy thành công nhưng không có event (200) ---
  test("should return 200 with an empty array if no events found", async () => {
    // Arrange
    req.params.userId = "seller456";
    mockSort.mockResolvedValue([]);
    // Act
    await getEventsByUserId(req, res);
    // Assert
    // 1. Vẫn gọi query
    expect(Event.find).toHaveBeenCalledWith({ seller_id: "seller456" });
    // 2. Không gọi helper
    expect(getDisplayStatus).not.toHaveBeenCalled();
    // 3. Trả về 200 với mảng rỗng
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [],
      count: 0,
    });
  });

  // --- Test Case 3: Lỗi 400 - Thiếu userId ---
  test("should return 400 if userId is missing", async () => {
    // Arrange
    // req.params.userId để trống
    // Act
    await getEventsByUserId(req, res);
    // Assert
    // 1. Trả về 400
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Missing userId parameter",
    });
    // 2. Không gọi database
    expect(Event.find).not.toHaveBeenCalled();
  });

  // --- Test Case 4: Lỗi 500 - Lỗi database ---
  test("should return 500 if database query fails", async () => {
    // Arrange
    req.params.userId = "seller123";
    const dbError = new Error("Database query failed");
    mockSort.mockRejectedValue(dbError);
    // Act
    await getEventsByUserId(req, res);
    // Assert
    // 1. Vẫn gọi query
    expect(Event.find).toHaveBeenCalledWith({ seller_id: "seller123" });
    // 2. Đã log lỗi
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error in getEventsByUserId:",
      dbError
    );
    // 3. Trả về 500
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Database query failed",
    });
  });
});

// describe("Event Controller - getEventReport", () => {
//   let req, res;

//   beforeEach(() => {
//     req = {};
//     res = {
//       status: jest.fn().mockReturnThis(),
//       json: jest.fn(),
//     };
//     jest.clearAllMocks();
//   });

//   // test("Phải trả về status 200 và các báo cáo về sự kiện", async () => {
//   //   // --- ARRANGE ---
//   //   const mockEvent = { _id: eventId, title: "Test Event" };
//   //   // 1. Event.findById() tìm thấy
//   //   Event.findById().populate().populate.mockResolvedValue(mockEvent);
//   //   // 2. Product.find() trả về mảng rỗng
//   //   Product.find().select.mockResolvedValue([]);
//   //   // --- ACT ---
//   //   await getEventReport(req, res);
//   //   // --- ASSERT ---
//   //   // Kiểm tra đã gọi đúng các hàm
//   //   expect(Event.findById).toHaveBeenCalledWith(eventId);
//   //   expect(Product.find).toHaveBeenCalledWith({ event_id: eventId });
//   //   // Đảm bảo KHÔNG gọi OrderItem hay Order
//   //   expect(OrderItem.find).not.toHaveBeenCalled();
//   //   expect(Order.find).not.toHaveBeenCalled();
//   //   // Kiểm tra kết quả trả về
//   //   expect(res.json).toHaveBeenCalledWith({
//   //     event: mockEvent,
//   //     products: [],
//   //     orders: [],
//   //     stats: {
//   //       totalOrders: 0,
//   //       totalItems: 0,
//   //       totalRevenuePaid: 0,
//   //       quantityByType: { ticket: 0, merchandise: 0 },
//   //     },
//   //   });
//   // });

//   // test("Phải trả về status 500 nếu có lỗi xảy ra", async () => {
//   //   // --- ARRANGE ---
//   //   const errorMessage = "Lỗi database";
//   //   const dbError = new Error(errorMessage);
//   //   // Gây lỗi ngay ở bước đầu tiên
//   //   Event.findById().populate().populate.mockRejectedValue(dbError);
//   //   // --- ACT ---
//   //   await getEventReport(req, res);
//   //   // --- ASSERT ---
//   //   expect(res.status).toHaveBeenCalledWith(500);
//   //   expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
//   // });

//   // test("Phải trả về status 404 nếu không tìm thấy Event", async () => {
//   //   // --- ARRANGE ---
//   //   // Giả lập Event.findById trả về null
//   //   Event.findById().populate().populate.mockResolvedValue(null);
//   //   // --- ACT ---
//   //   await getEventReport(req, res);
//   //   // --- ASSERT ---
//   //   // Đảm bảo không gọi các hàm sau
//   //   expect(Product.find).not.toHaveBeenCalled();
//   //   // Kiểm tra lỗi 404
//   //   expect(res.status).toHaveBeenCalledWith(404);
//   //   expect(res.json).toHaveBeenCalledWith({ message: "Event not found" });
//   // });
// });

describe("Event Controller - recommendEvents", () => {
  let req, res;
  let consoleErrorSpy;

  // Đóng băng thời gian để test logic tính điểm
  const MOCK_NOW = new Date("2025-11-15T10:00:00.000Z");

  // Dữ liệu giả cho các Event ứng viên
  const mockCandidates = [
    // Event A: Sắp diễn ra (5 ngày nữa)
    {
      _id: "event_A",
      title: "Music Fest",
      start_time: "2025-11-20T18:00:00.000Z", // 5 ngày nữa
      end_time: "2025-11-20T22:00:00.000Z",
      status: "approved",
      toObject: function () {
        return this;
      },
    },
    // Event B: Diễn ra xa hơn (25 ngày nữa)
    {
      _id: "event_B",
      title: "Art Show",
      start_time: "2025-12-10T18:00:00.000Z", // 25 ngày nữa
      end_time: "2025-12-10T22:00:00.000Z",
      status: "approved",
      toObject: function () {
        return this;
      },
    },
    // Event C: Diễn ra hôm nay + User đã từng mua
    {
      _id: "event_C_matched",
      title: "This is a Very Long Title for Scoring", // > 10 chars
      start_time: "2025-11-15T18:00:00.000Z", // Hôm nay (0 ngày nữa)
      end_time: "2025-11-15T22:00:00.000Z",
      status: "approved",
      toObject: function () {
        return this;
      },
    },
    // Event D: Diễn ra rất xa
    {
      _id: "event_D",
      title: "New Year",
      start_time: "2026-01-01T18:00:00.000Z", // > 30 ngày nữa
      end_time: "2026-01-01T22:00:00.000Z",
      status: "approved",
      toObject: function () {
        return this;
      },
    },
  ];

  // Dữ liệu giả cho Order của user (đã từng mua Event C)
  const mockUserOrders = [
    {
      _id: "order1",
      items: [
        {
          product_id: {
            _id: "prod1",
            event_id: "event_C_matched", // <-- Trùng với Event C
          },
        },
        {
          product_id: {
            _id: "prod2",
            event_id: "event_past", // 1 event đã qua
          },
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(MOCK_NOW); // Đóng băng thời gian
    req = { query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    Event.find.mockReturnValue({ populate: mockEventFindPopCat });
    Order.find.mockReturnValue({ populate: mockOrderFindPopulate });
    // Mock helper
    getDisplayStatus.mockReturnValue("Mocked Status");
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleErrorSpy.mockRestore();
  });

  // --- Test Case 1: Gợi ý thành công (có UserID và limit) ---
  test("should return scored, sorted, and limited events for a user", async () => {
    // Arrange
    req.query = { userId: "user123", limit: "2" };
    // 1. Event.find trả về ứng viên
    mockEventFindPopSeller.mockResolvedValue(mockCandidates);
    // 2. Order.find trả về order
    mockOrderFindPopulate.mockResolvedValue(mockUserOrders);
    // Act
    await recommendEvents(req, res);
    // Assert
    // 1. Đã gọi cả Event.find và Order.find
    expect(Event.find).toHaveBeenCalledWith({
      status: "approved",
      end_time: { $gte: MOCK_NOW },
    });
    expect(Order.find).toHaveBeenCalledWith({ user_id: "user123" });
    // 2. Kiểm tra helper được gọi 2 lần (cho C và A)
    expect(getDisplayStatus).toHaveBeenCalledTimes(2);
    // 3. Kiểm tra response cuối cùng
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        // Event C (đã map)
        {
          ...mockCandidates[2],
          display_status: "Mocked Status",
        },
        // Event A (đã map)
        {
          ...mockCandidates[0],
          display_status: "Mocked Status",
        },
      ],
    });
  });

  // --- Test Case 2: Gợi ý thành công (Không có UserID, dùng limit mặc định) ---
  test("should return time-scored events for anonymous user with default limit", async () => {
    // Arrange
    req.query = {};
    // 1. Event.find trả về ứng viên
    mockEventFindPopSeller.mockResolvedValue(mockCandidates);
    // Act
    await recommendEvents(req, res);
    // Assert
    // 1. KHÔNG gọi Order.find
    expect(Event.find).toHaveBeenCalledTimes(1);
    expect(Order.find).not.toHaveBeenCalled();
    // 2. Helper được gọi 4 lần (cho cả 4 event)
    expect(getDisplayStatus).toHaveBeenCalledTimes(4);
    // 3. Kiểm tra response
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.any(Array),
      })
    );
    // Kiểm tra thứ tự
    const responseData = res.json.mock.calls[0][0].data;
    expect(responseData.length).toBe(4);
    expect(responseData[0]._id).toBe("event_C_matched"); // Score 3.5
    expect(responseData[1]._id).toBe("event_A"); // Score 3.0
    expect(responseData[2]._id).toBe("event_B"); // Score 1.0
  });

  // --- Test Case 3: Lỗi 500 - Lỗi Event.find ---
  test("should return 500 if Event.find fails", async () => {
    // Arrange
    req.query = {};
    const dbError = new Error("Event DB Down");
    mockEventFindPopSeller.mockRejectedValue(dbError);
    // Act
    await recommendEvents(req, res);
    // Assert
    expect(Event.find).toHaveBeenCalledTimes(1);
    expect(Order.find).not.toHaveBeenCalled(); // Không chạy tới
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "recommendEvents error",
      dbError
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Event DB Down",
    });
  });

  // --- Test Case 4: Lỗi Order.find (bỏ qua) ---
  test("should ignore errors from Order.find and return time-scored events", async () => {
    // Arrange
    req.query = { userId: "user123" };
    const orderError = new Error("Order DB Down");
    // 1. Event.find thành công
    mockEventFindPopSeller.mockResolvedValue(mockCandidates);
    // 2. Order.find thất bại
    mockOrderFindPopulate.mockRejectedValue(orderError);
    // Act
    await recommendEvents(req, res);
    // Assert
    // 1. Đã gọi cả hai
    expect(Event.find).toHaveBeenCalledTimes(1);
    expect(Order.find).toHaveBeenCalledTimes(1);
    // 2. Lỗi KHÔNG được log (vì đã bị "ignore")
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    // 3. Kết quả trả về giống như anonymous (Test Case 2)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      })
    );
    const responseData = res.json.mock.calls[0][0].data;
    expect(responseData[0]._id).toBe("event_C_matched"); // Score 3.5
    expect(responseData[1]._id).toBe("event_A"); // Score 3.0
  });
});

describe("Event Controller - getFinancialReport", () => {
  let req, res;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    // Đóng băng thời gian
    jest.useFakeTimers().setSystemTime(MOCK_NOW);

    req = {
      params: { id: "event1" },
      query: { format: "json" }, // Mặc định
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(), // Cho CSV
      send: jest.fn(), // Cho CSV
    };
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // --- Cấu hình Mocks ---
    Event.findById.mockReturnValue({ populate: mockEventPopCat });
    Product.find.mockReturnValue({ select: mockProductSelect });
    OrderItem.find.mockReturnValue({ populate: mockOrderItemPopProduct });
    Order.find.mockReturnValue({ populate: mockOrderPopUser });
    Payment.find.mockImplementation(jest.fn()); // Sẽ mock resolved value bên dưới

    // Cấu hình các chuỗi trả về
    mockEventPopSeller.mockResolvedValue(mockEvent);
    mockProductSelect.mockResolvedValue(mockProducts);
    mockOrderItemPopOrder.mockResolvedValue(mockOrderItems);
    mockOrderPopUser.mockResolvedValue(mockOrders);
    Payment.find.mockResolvedValue(mockPayments);
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleErrorSpy.mockRestore();
  });

  // --- Test Case 1: Lấy thành công (JSON) ---
  test("should return 200 with full financial report in JSON format", async () => {
    // Act
    await getFinancialReport(req, res);
    // Assert
    // 1. Kiểm tra các lệnh gọi DB
    expect(Event.findById).toHaveBeenCalledWith("event1");
    expect(Product.find).toHaveBeenCalledWith({ event_id: "event1" });
    expect(OrderItem.find).toHaveBeenCalledWith({
      product_id: { $in: ["prod1-ticket", "prod2-merch"] },
    });
    expect(Order.find).toHaveBeenCalledWith({
      _id: { $in: ["order1", "order2", "order3"] },
    });
    expect(Payment.find).toHaveBeenCalledWith({
      order_id: { $in: ["order1", "order2", "order3"] },
    });
    // 2. Kiểm tra response
    expect(res.status).toHaveBeenCalledWith(200);
    // 3. Kiểm tra các giá trị tính toán
    const responseData = res.json.mock.calls[0][0].data;
    // Summary
    expect(responseData.summary.total_orders).toBe(3);
    expect(responseData.summary.total_revenue).toBe(325); // 200 + 125
    expect(responseData.summary.pending_revenue).toBe(25);
    expect(responseData.summary.total_tickets_sold).toBe(20);
    expect(responseData.summary.total_merch_sold).toBe(10);
    expect(responseData.summary.average_order_value).toBe(108); // round(325 / 3)
    // Breakdowns
    expect(responseData.revenue_breakdown.by_payment_method).toEqual({
      VNPAY: 200,
      MOMO: 125,
    });
    expect(responseData.revenue_breakdown.by_day).toEqual({
      "2025-11-01": 200,
      "2025-11-02": 125,
    });
    // Products
    expect(responseData.products[0].revenue).toBe(2000); // 100 * 20
    expect(responseData.products[0].sell_through_rate).toBe("20.00");
    expect(responseData.products[1].revenue).toBe(250); // 25 * 10
    expect(responseData.products[1].sell_through_rate).toBe("20.00");
    // Orders
    expect(responseData.orders.length).toBe(3);
    expect(responseData.orders[0].payment_status).toBe("SUCCESS");
    expect(responseData.orders[2].payment_status).toBe("PENDING"); // Order 3
    // Timestamp
    expect(responseData.generated_at).toBe(MOCK_NOW.toISOString());
  });

  // --- Test Case 2: Lấy thành công (CSV) ---
  test("should return 200 with CSV file format", async () => {
    // Arrange
    req.query.format = "csv";
    // Act
    await getFinancialReport(req, res);
    // Assert
    // 1. Kiểm tra không gọi res.json
    expect(res.json).not.toHaveBeenCalled();
    // 2. Kiểm tra set headers
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "text/csv; charset=utf-8"
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      expect.stringContaining(
        `financial-report-Mock-Event-Title-${
          MOCK_NOW.toISOString().split("T")[0]
        }.csv`
      )
    );
    // 3. Kiểm tra nội dung CSV (chỉ kiểm tra một vài điểm)
    expect(res.send).toHaveBeenCalledTimes(1);
    const csvContent = res.send.mock.calls[0][0];
    expect(csvContent).toContain("\uFEFF");
    expect(csvContent).toContain('"FINANCIAL REPORT"');
    expect(csvContent).toContain('"Event Title","Mock Event Title"');
    expect(csvContent).toContain('"Total Revenue","325"');
    expect(csvContent).toContain('"Total Tickets Sold","20"');
    expect(csvContent).toContain(
      '"Vé VIP","ticket","100","100","20","2000","20.00%"'
    );
    expect(csvContent).toContain('"order1","User A","a@test.com"');
  });

  // --- Test Case 3: Lỗi 404 - Không tìm thấy Event ---
  test("should return 404 if event not found", async () => {
    // Arrange
    mockEventPopSeller.mockResolvedValue(null); // Event.findById trả về null
    // Act
    await getFinancialReport(req, res);
    // Assert
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Event not found",
    });
    expect(Product.find).not.toHaveBeenCalled();
  });

  // --- Test Case 4: Lỗi 500 - Lỗi DB ---
  test("should return 500 if a database call fails", async () => {
    // Arrange
    const dbError = new Error("Database failed");
    mockProductSelect.mockRejectedValue(dbError); // Giả lập Product.find thất bại
    // Act
    await getFinancialReport(req, res);
    // Assert
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error in getFinancialReport:",
      dbError
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Database failed",
    });
  });
});

describe("Event Controller - requestEventPublish", () => {
  let req, res;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks(); // Rất quan trọng!

    req = {
      params: { id: "event123" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Đặt lại mock chain (vì jest.clearAllMocks() có thể xóa nó)
    Event.findById.mockReturnValue({ populate: mockFindByIdPopulate });
    Event.findByIdAndUpdate.mockReturnValue({
      populate: mockFindByIdAndUpdatePopulate,
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // --- Test Case 1: Yêu cầu thành công (200) ---
  test("should return 200, update status, and send notification on success", async () => {
    // Arrange
    const mockEvent = {
      _id: "event123",
      title: "Test Event",
      status: "draft",
      seller_id: { full_name: "Test Seller", email: "seller@test.com" },
    };
    const mockUpdatedEvent = {
      _id: "event123",
      title: "Test Event",
      status: "pending", // Đã cập nhật
      seller_id: { full_name: "Test Seller", email: "seller@test.com" },
      toObject: () => ({ _id: "event123", status: "pending" }), // Mock toObject
    };
    const mockEmailResult = {
      adminEmails: ["admin1@test.com"],
      eventData: { title: "Test Event" },
    };
    // 1. Giả lập Event.findById (lần 1)
    mockFindByIdPopulate.mockResolvedValue(mockEvent);
    // 2. Giả lập Event.findByIdAndUpdate (lần 2)
    mockFindByIdAndUpdatePopulate.mockResolvedValue(mockUpdatedEvent);
    // 3. Giả lập helper gửi email
    sendPublishRequestNotification.mockResolvedValue(mockEmailResult);
    // 4. Giả lập helper lấy status
    getDisplayStatus.mockReturnValue("Chờ duyệt");
    // Act
    await requestEventPublish(req, res);
    // Assert
    // 1. Kiểm tra gọi findById
    expect(Event.findById).toHaveBeenCalledWith("event123");
    expect(mockFindByIdPopulate).toHaveBeenCalledWith(
      "seller_id",
      "full_name email"
    );
    // 2. Kiểm tra gọi findByIdAndUpdate
    expect(Event.findByIdAndUpdate).toHaveBeenCalledWith(
      "event123",
      { status: "pending" },
      { new: true }
    );
    // 3. Kiểm tra gọi helper
    expect(sendPublishRequestNotification).toHaveBeenCalledWith(
      "Test Event",
      "event123",
      "Test Seller"
    );
    expect(getDisplayStatus).toHaveBeenCalledWith(mockUpdatedEvent);
    // 4. Kiểm tra response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Yêu cầu phê duyệt đã được gửi",
      data: {
        ...mockUpdatedEvent.toObject(),
        display_status: "Chờ duyệt",
        adminEmails: mockEmailResult.adminEmails,
        eventData: mockEmailResult.eventData,
      },
    });
  });

  // --- Test Case 2: Lỗi 404 - Không tìm thấy Event ---
  test("should return 404 if event not found", async () => {
    // Arrange
    // Giả lập Event.findById (lần 1) trả về null
    mockFindByIdPopulate.mockResolvedValue(null);
    // Act
    await requestEventPublish(req, res);
    // Assert
    // 1. Kiểm tra gọi findById
    expect(Event.findById).toHaveBeenCalledWith("event123");
    // 2. Kiểm tra response
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Event not found",
    });
    // 3. Đảm bảo không gọi các hàm tiếp theo
    expect(Event.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(sendPublishRequestNotification).not.toHaveBeenCalled();
  });

  // --- Test Case 3: Lỗi 500 - Lỗi khi update ---
  test("should return 500 if Event.findByIdAndUpdate fails", async () => {
    // Arrange
    const dbError = new Error("Update failed");
    // 1. findById thành công
    mockFindByIdPopulate.mockResolvedValue({ _id: "event123", title: "Test" });
    // 2. findByIdAndUpdate thất bại
    mockFindByIdAndUpdatePopulate.mockRejectedValue(dbError);
    // Act
    await requestEventPublish(req, res);
    // Assert
    // 1. Đã log lỗi
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error in requestEventPublish:",
      dbError
    );
    // 2. Trả về 500
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Update failed",
    });
    // 3. Không gửi mail
    expect(sendPublishRequestNotification).not.toHaveBeenCalled();
  });

  // --- Test Case 4: Lỗi 500 - Lỗi khi gửi mail ---
  test("should return 500 if sendPublishRequestNotification fails", async () => {
    // Arrange
    const emailError = new Error("SMTP Error");
    const mockEvent = {
      _id: "event123",
      title: "Test Event",
      seller_id: { full_name: "Test Seller" },
    };
    // 1. findById thành công
    mockFindByIdPopulate.mockResolvedValue(mockEvent);
    // 2. findByIdAndUpdate thành công
    mockFindByIdAndUpdatePopulate.mockResolvedValue({
      ...mockEvent,
      status: "pending",
    });
    // 3. Gửi mail thất bại
    sendPublishRequestNotification.mockRejectedValue(emailError);
    // Act
    await requestEventPublish(req, res);
    // Assert
    // 1. Đã log lỗi
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error in requestEventPublish:",
      emailError
    );
    // 2. Trả về 500
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "SMTP Error",
    });
  });
});

describe("Event Controller - testEmail", () => {});

describe("Event Controller - getAdminUsers", () => {
  let req, res;
  let consoleErrorSpy;

  beforeEach(() => {
    // Reset tất cả mocks
    jest.clearAllMocks();

    req = {}; // req không được sử dụng trong hàm này
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Spy và tắt tiếng console.error
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Đặt lại mock chain (quan trọng sau khi clearAllMocks)
    User.find.mockReturnValue({ select: mockSelect });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // --- Test Case 1: Lấy thành công (200) ---
  test("should return 200 with admin users and count", async () => {
    // Arrange
    const mockAdmins = [
      {
        _id: "admin1",
        full_name: "Admin One",
        role: "Admin",
        status: "active",
      },
      {
        _id: "admin2",
        full_name: "Admin Two",
        role: "Admin",
        status: "active",
      },
    ];
    mockSelect.mockResolvedValue(mockAdmins);
    // Act
    await getAdminUsers(req, res);
    // Assert
    // 1. Kiểm tra query database
    expect(User.find).toHaveBeenCalledWith({
      role: "Admin",
      status: "active",
    });
    // 2. Kiểm tra select
    expect(mockSelect).toHaveBeenCalledWith("email full_name role status");
    // 3. Kiểm tra response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Admin users retrieved successfully",
      data: {
        count: 2,
        admins: mockAdmins,
      },
    });
  });

  // --- Test Case 2: Lấy thành công nhưng không có admin (200) ---
  test("should return 200 with empty array and count 0 if no admins found", async () => {
    // Arrange
    mockSelect.mockResolvedValue([]);
    // Act
    await getAdminUsers(req, res);
    // Assert
    // 1. Vẫn gọi query
    expect(User.find).toHaveBeenCalledWith({
      role: "Admin",
      status: "active",
    });
    // 2. Trả về 200 với mảng rỗng
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Admin users retrieved successfully",
      data: {
        count: 0,
        admins: [],
      },
    });
  });

  // --- Test Case 3: Lỗi 500 - Lỗi database ---
  test("should return 500 if database query fails", async () => {
    // Arrange
    const dbError = new Error("Database connection failed");
    mockSelect.mockRejectedValue(dbError);
    // Act
    await getAdminUsers(req, res);
    // Assert
    // 1. Vẫn gọi query
    expect(User.find).toHaveBeenCalled();
    // 2. Đã log lỗi
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "❌ Error getting admin users:",
      dbError
    );
    // 3. Trả về 500
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Failed to get admin users",
      error: "Database connection failed", // error.message
    });
  });
});
