const request = require("supertest");
const app = require("../../index.js");
const Users = require("../../models/Users");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose"); // <-- SỬA 1: Thêm import mongoose

// Mock các dependencies
jest.mock("../../models/Users");
jest.mock("jsonwebtoken");

describe("Social Media API Tests", () => {
  let authToken;

  beforeAll(() => {
    // Tạo mock token
    authToken = "mock_organizer_token_123";
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock jwt.verify để luôn trả về user data
    jwt.verify.mockReturnValue({ 
      _id: "user123", 
      role: "organizer",
      email: "organizer@test.com"
    });
  });

  describe("GET /api/social/oauth-urls", () => {
    it("Nên trả về OAuth URLs với status 200", async () => {
      // --- ARRANGE ---
      Users.findById.mockResolvedValue({
        _id: "user123",
        role: "organizer",
        email: "organizer@test.com"
      });

      // --- ACT ---
      const response = await request(app)
        .get("/api/social/oauth-urls")
        .set("Authorization", `Bearer ${authToken}`);

      // --- ASSERT ---
      expect(response.statusCode).toBe(200);
      expect(response.body).toBeInstanceOf(Object);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Object);
      expect(response.body.data.twitter).toBeInstanceOf(Object);
      expect(response.body.data.twitter).toHaveProperty("url");
      expect(response.body.data.twitter).toHaveProperty("platform");
      expect(response.body.data.twitter).toHaveProperty("isMock");
    }, 10000);

    it("Nên trả về 401 khi không có token", async () => {
      // --- ACT ---
      const response = await request(app)
        .get("/api/social/oauth-urls");

      // --- ASSERT ---
      expect(response.statusCode).toBe(401);
    }, 10000);
  });

  describe("GET /api/social/mock-connect", () => {
    it("Nên redirect với mock connection", async () => {
      // --- ACT ---
      const response = await request(app)
        .get("/api/social/mock-connect")
        .query({ platform: "twitter", userId: "user123" })
        .expect(302); // Redirect status

      // --- ASSERT ---
      expect(response.header.location).toContain("/organizer?twitter_connected=true&mock=true");
    }, 10000);

    it("Nên trả về lỗi khi thiếu platform", async () => {
      // --- ACT ---
      const response = await request(app)
        .get("/api/social/mock-connect")
        .query({ userId: "user123" });

      // --- ASSERT ---
      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Missing platform");
    }, 10000);
  });

  describe("POST /api/social/post", () => {
    it("Nên post thành công với mock mode", async () => {
      // --- ARRANGE ---
      Users.findById.mockResolvedValue({
        _id: "user123",
        role: "organizer",
        socialMediaTokens: {}
      });

      const postData = {
        content: "Test event announcement! 🎉",
        imageUrl: "https://example.com/image.jpg",
        eventId: "event123"
      };

      // --- ACT ---
      const response = await request(app)
        .post("/api/social/post")
        .set("Authorization", `Bearer ${authToken}`)
        .send(postData);

      // --- ASSERT ---
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Object);
      expect(response.body.data.platform).toBe("twitter");
      expect(response.body.data.postId).toContain("mock_tweet_");
      expect(response.body.message).toContain("Successfully posted to Twitter");
    }, 10000);

    it("Nên trả về lỗi khi user không tồn tại", async () => {
      // --- ARRANGE ---
      Users.findById.mockResolvedValue(null);

      // --- ACT ---
      const response = await request(app)
        .post("/api/social/post")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          content: "Test content",
          eventId: "event123"
        });

      // --- ASSERT ---
      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("User not found");
    }, 10000);
  });

  describe("GET /api/social/stats", () => {
    it("Nên trả về social media statistics", async () => {
      // --- ARRANGE ---
      Users.findById.mockResolvedValue({
        _id: "user123",
        role: "organizer",
        socialMediaTokens: {}
      });

      // --- ACT ---
      const response = await request(app)
        .get("/api/social/stats")
        .set("Authorization", `Bearer ${authToken}`)
        .query({ postId: "mock_post_123" });

      // --- ASSERT ---
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Object);
      expect(response.body.data).toHaveProperty("likes");
      expect(response.body.data).toHaveProperty("comments");
      expect(response.body.data).toHaveProperty("shares");
      expect(response.body.data).toHaveProperty("views");
    }, 10000);

    it("Nên trả về stats thành công khi không có postId", async () => {
      // --- ARRANGE ---
      Users.findById.mockResolvedValue({
        _id: "user123",
        role: "organizer",
        socialMediaTokens: {}
      });

      // --- ACT ---
      const response = await request(app)
        .get("/api/social/stats")
        .set("Authorization", `Bearer ${authToken}`);

      // --- ASSERT ---
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
    }, 10000);
  });

  describe("GET /api/social/twitter/callback", () => {
    it("Nên xử lý Twitter OAuth callback thành công", async () => {
      // --- ACT ---
      const response = await request(app)
        .get("/api/social/twitter/callback")
        .query({
          code: "mock_auth_code_123",
          state: "user123"
        });

      // --- ASSERT ---
      // Trong development mode, nó sẽ fallback thành mock connection
      expect([200, 302]).toContain(response.statusCode);
    }, 10000);

    it("Nên xử lý Twitter OAuth error", async () => {
      // --- ACT ---
      const response = await request(app)
        .get("/api/social/twitter/callback")
        .query({
          error: "access_denied",
          error_description: "User denied access"
        });

      // --- ASSERT ---
      expect(response.statusCode).toBe(302); // Redirect với error
      expect(response.header.location).toContain("error=access_denied");
    }, 10000);
  });

  // Test thêm cho trường hợp token không hợp lệ
  describe("Authentication failures", () => {
    it("Nên trả về 401 khi token không hợp lệ", async () => {
      // --- ARRANGE ---
      jwt.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      // --- ACT ---
      const response = await request(app)
        .get("/api/social/oauth-urls")
        .set("Authorization", `Bearer invalid_token`);

      // --- ASSERT ---
      expect(response.statusCode).toBe(401);
    }, 10000);

    // <-- SỬA 2: Sửa lỗi logic 401 -> 403
    it("Nên trả về 403 khi không phải organizer", async () => { // Đổi tên test
      // --- ARRANGE ---
      jwt.verify.mockReturnValue({ 
        _id: "user123", 
        role: "user", // Không phải organizer
        email: "user@test.com"
      });

      // --- ACT ---
      const response = await request(app)
        .get("/api/social/oauth-urls")
        .set("Authorization", `Bearer ${authToken}`);

      // --- ASSERT ---
      expect(response.statusCode).toBe(403); // Sửa mong đợi thành 403
    }, 10000);
  });

  // <-- SỬA 3: Thêm hook để đóng kết nối, sửa lỗi "Open Handles"
  afterAll(async () => {
    await mongoose.connection.close();
  });
});