const request = require("supertest");
const express = require("express");
const notificationRouter = require("../../routes/notificationRouter");
const Notification = require("../../models/Notification");
const jwt = require("jsonwebtoken");

// Mock các dependencies
jest.mock("../../models/Notification");
jest.mock("jsonwebtoken");

describe("Notification API Tests", () => {
  let app;
  let authToken;
  let mockUserId;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Mock auth middleware
    app.use((req, res, next) => {
      try {
        const token = req.headers.authorization?.replace("Bearer ", "");
        if (token && jwt.verify(token)) {
          req.user = {
            id: "user123",
            _id: "user123",
            role: "user",
          };
        }
        next();
      } catch (error) {
        next();
      }
    });

    app.use("/api/notifications", notificationRouter);

    authToken = "mock_user_token_123";
    mockUserId = "user123";
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock jwt.verify để luôn trả về user data
    jwt.verify.mockReturnValue({
      id: mockUserId,
      _id: mockUserId,
      role: "user",
    });
  });

  describe("GET /api/notifications", () => {
    it("Nên trả về danh sách notifications với limit mặc định", async () => {
      // --- ARRANGE ---
      const mockNotifications = [
        {
          _id: "notif1",
          userId: mockUserId,
          title: "Test Notification 1",
          body: "This is a test notification",
          href: "/events/1",
          read: false,
          createdAt: new Date(),
        },
      ];

      Notification.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockNotifications),
      });

      // --- ACT ---
      const response = await request(app)
        .get("/api/notifications")
        .set("Authorization", `Bearer ${authToken}`);

      // --- ASSERT ---
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("items");
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it("Nên trả về 401 khi không có token", async () => {
      // --- ACT ---
      const response = await request(app).get("/api/notifications");
      // Không set Authorization header

      // --- ASSERT ---
      expect(response.statusCode).toBe(401);
    });
  });

  describe("POST /api/notifications", () => {
    it("Nên tạo notification thành công", async () => {
      // --- ARRANGE ---
      const newNotification = {
        title: "New Event Created",
        body: "Your event has been created successfully",
        href: "/events/123",
      };

      const mockCreatedNotification = {
        _id: "new_notif_123",
        userId: mockUserId,
        ...newNotification,
        read: false,
        createdAt: new Date(),
      };

      Notification.create.mockResolvedValue(mockCreatedNotification);

      // --- ACT ---
      const response = await request(app)
        .post("/api/notifications")
        .set("Authorization", `Bearer ${authToken}`)
        .send(newNotification);

      // --- ASSERT ---
      expect(response.statusCode).toBe(201);
      expect(response.body.title).toBe("New Event Created");
    });

    it("Nên trả về lỗi 400 khi thiếu title", async () => {
      // --- ARRANGE ---
      const invalidNotification = {
        body: "Notification without title",
      };

      // --- ACT ---
      const response = await request(app)
        .post("/api/notifications")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidNotification);

      // --- ASSERT ---
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty("message", "title is required");
    });
  });

  describe("PATCH /api/notifications/:id", () => {
    it("Nên cập nhật trạng thái read thành công", async () => {
      // --- ARRANGE ---
      const notificationId = "notif_123";
      const updatedNotification = {
        _id: notificationId,
        userId: mockUserId,
        title: "Test Notification",
        read: true,
      };

      const leanMock = jest.fn().mockResolvedValue(updatedNotification);

      // 2. Mock findOneAndUpdate để trả về một đối tượng có chứa hàm lean()
      Notification.findOneAndUpdate.mockReturnValue({
        lean: leanMock,
      });

      // --- ACT ---
      const response = await request(app)
        .patch(`/api/notifications/${notificationId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ read: true });

      // --- ASSERT ---
      expect(response.statusCode).toBe(200);
      expect(response.body.read).toBe(true);
    });

    it("Nên trả về 404 khi notification không tồn tại", async () => {
      // --- ARRANGE ---
      const notificationId = "non_existent_id";
      // 1. Tạo mock .lean() trả về null (vì không tìm thấy)
      const leanMock = jest.fn().mockResolvedValue(null);

      // 2. Mock findOneAndUpdate để trả về đối tượng chứa hàm lean()
      Notification.findOneAndUpdate.mockReturnValue({
        lean: leanMock,
      });
      // --- ACT ---
      const response = await request(app)
        .patch(`/api/notifications/${notificationId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ read: true });

      // --- ASSERT ---
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty("message", "Not found");
    });
  });

  describe("POST /api/notifications/read-all", () => {
    it("Nên đánh dấu tất cả notifications là đã đọc", async () => {
      // --- ARRANGE ---
      const mockUpdateResult = {
        modifiedCount: 5,
      };

      Notification.updateMany.mockResolvedValue(mockUpdateResult);

      // --- ACT ---
      const response = await request(app)
        .post("/api/notifications/read-all")
        .set("Authorization", `Bearer ${authToken}`);

      // --- ASSERT ---
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("updated", 5);
    });
  });

  describe("DELETE /api/notifications", () => {
    it("Nên xóa tất cả notifications của user", async () => {
      // --- ARRANGE ---
      Notification.deleteMany.mockResolvedValue({ deletedCount: 3 });

      // --- ACT ---
      const response = await request(app)
        .delete("/api/notifications")
        .set("Authorization", `Bearer ${authToken}`);

      // --- ASSERT ---
      expect(response.statusCode).toBe(204);
    });
  });
});
