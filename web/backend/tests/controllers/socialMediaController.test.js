const {
  getOAuthUrls,
  postToSocialMedia,
  getSocialMediaStats,
  mockConnect
} = require("../../controllers/socialMediaController");
const Users = require("../../models/Users");
const axios = require("axios");

// Mock các dependencies
jest.mock("../../models/Users");
jest.mock("axios");

describe("Social Media Controller - Unit Tests", () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { _id: "user123" },
      protocol: "http",
      get: jest.fn().mockReturnValue("localhost:3000"),
      query: {},
      body: {}
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      redirect: jest.fn()
    };
    jest.clearAllMocks();
    delete process.env.TWITTER_CLIENT_ID;
    delete process.env.TWITTER_CLIENT_SECRET;
  });

  describe("getOAuthUrls", () => {
    test("Nên trả về Twitter OAuth URL khi có API keys", () => {
      process.env.TWITTER_CLIENT_ID = "test_client_id";
      process.env.TWITTER_CLIENT_SECRET = "test_secret";
      
      getOAuthUrls(req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Object),
        message: "Twitter API ready"
      });
    });

    test("Nên trả về mock URL khi không có API keys", () => {
      getOAuthUrls(req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Object),
        message: "Demo Mode - Add Twitter API keys for real integration"
      });
    });

    test("Nên trả về lỗi 500 khi có exception", () => {
      req.get.mockImplementation(() => {
        throw new Error("Network error");
      });
      
      getOAuthUrls(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Failed to get OAuth URLs",
        error: "Network error"
      });
    });
  });

  describe("postToSocialMedia", () => {
    test("Nên post thành công với mock khi không có API keys", async () => {
      req.body = { 
        content: "Test tweet", 
        imageUrl: null, 
        eventId: "event123" 
      };
      Users.findById.mockResolvedValue({ 
        _id: "user123",
        socialMediaTokens: {}
      });
      
      await postToSocialMedia(req, res);
      
      expect(Users.findById).toHaveBeenCalledWith("user123");
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          platform: "twitter",
          postId: expect.any(String),
          url: expect.any(String)
        }),
        message: "Successfully posted to Twitter (mock)"
      });
    });

    test("Nên trả về lỗi khi user không tồn tại", async () => {
      Users.findById.mockResolvedValue(null);
      
      await postToSocialMedia(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User not found"
      });
    });
  });

  describe("getSocialMediaStats", () => {
    test("Nên trả về mock stats khi không có API keys", async () => {
      req.query = { postId: "post123" };
      Users.findById.mockResolvedValue({ 
        _id: "user123",
        socialMediaTokens: {}
      });
      
      await getSocialMediaStats(req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          likes: expect.any(Number),
          comments: expect.any(Number),
          shares: expect.any(Number),
          views: expect.any(Number)
        })
      });
    });
  });

  describe("mockConnect", () => {
    test("Nên redirect với mock connection", async () => {
      req.query = { platform: "twitter", userId: "user123" };
      process.env.FRONTEND_URL = "http://localhost:3000";
      Users.findByIdAndUpdate.mockResolvedValue({});
      
      await mockConnect(req, res);
      
      expect(res.redirect).toHaveBeenCalledWith(
        "http://localhost:3000/organizer?twitter_connected=true&mock=true"
      );
    });

    test("Nên trả về lỗi khi thiếu platform", async () => {
      req.query = { userId: "user123" };
      
      await mockConnect(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Missing platform"
      });
    });
  });

});