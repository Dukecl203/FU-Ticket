const request = require("supertest");
const app = require("../../index.js");

const validEventId = "68c97fd05ebda7befe4cfdb7";
const validUserId = "68c97c675ebda7befe4cfdb2";
const invalidEventId = "68c97c675ebda7befe4cfdb2";

const mockReviewData_Create = {
  event_id: validEventId,
  user_id: validUserId,
  rating: 5,
  comments: "Sự kiện tuyệt vời, 5 sao!",
};

const mockReviewData_Update = {
  event_id: validEventId,
  user_id: validUserId,
  rating: 3,
  comments: "Sau khi xem xét lại, tôi cho 3 sao.",
};

describe("API Test cho /api/review/:id", () => {
  it("GET /api/review/:eventId -- nên trả về DANH SÁCH reviews theo eventId", async () => {
    const response = await request(app).get(`/api/review/${validEventId}`);
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Object);
    expect(response.body).toHaveProperty("message");
    expect(response.body).toHaveProperty("totalReviews");
    expect(response.body).toHaveProperty("averageRating");
    expect(response.body.message).toBe("Lấy danh sách review thành công!");
    expect(Array.isArray(response.body.reviews)).toBe(true);
    expect(response.body.reviews.length).toBe(response.body.totalReviews);
    if (response.body.reviews.length > 0) {
      const firstReview = response.body.reviews[0];
      expect(firstReview).toHaveProperty("_id");
      expect(firstReview).toHaveProperty("user_id");
      expect(firstReview).toHaveProperty("rating");
      expect(firstReview).toHaveProperty("comments");
      expect(firstReview.user_id).toHaveProperty("email");
    }
  }, 20000);

  it("POST /api/review/:eventId -- nên TẠO review mới (201) nếu chưa tồn tại", async () => {
    const response = await request(app)
      .post(`/api/review/${invalidEventId}`)
      .send(mockReviewData_Create);
    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty("message");
    expect(response.body.data).toBeInstanceOf(Object);
    expect(response.body.data.comments).toBe(mockReviewData_Create.comments);
    expect(response.body.data.rating).toBe(mockReviewData_Create.rating);
  }, 20000);

  it("POST /api/review/:eventId -- nên CẬP NHẬT review (200) nếu đã tồn tại", async () => {
    const response = await request(app)
      .post(`/api/review/${validEventId}`)
      .send(mockReviewData_Update);
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Object);
    expect(response.body.data.comments).toBe(mockReviewData_Update.comments);
    expect(response.body.data.rating).toBe(mockReviewData_Update.rating);
  }, 20000);
});
