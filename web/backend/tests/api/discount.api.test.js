const request = require("supertest");
const app = require("../../index.js");

describe("API Test cho PUT /api/discounts/:id/use", () => {
  // Giả sử các ID này đã được định nghĩa
  const validDiscountId = "68da274594178a2b12029263";
  const nonExistentDiscountId = "68da274594178a2b12029263";
  const invalidFormatId = "60c84c1f40c74100150990000001234";

  // --- CASE 1: THÀNH CÔNG (200) ---
  it("nên cập nhật discount thành công khi dùng ID hợp lệ (200 OK)", async () => {
    const response = await request(app)
      .put(`/api/discounts/${validDiscountId}/use`)
      .send({ userId: "some_valid_user_id" });
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Object);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Object);
  });

  // --- CASE 2: KHÔNG TÌM THẤY (404) ---
  it("nên trả về 404 khi cố gắng cập nhật discount không tồn tại", async () => {
    const response = await request(app)
      .put(`/api/discounts/${nonExistentDiscountId}/use`)
      .send({ userId: "some_test_user_id_24chars" });
    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
  });

  // --- CASE 3: LỖI ĐỊNH DẠNG/LỖI SERVER (400 hoặc 500) ---
  it("nên trả về lỗi (400/500) khi ID sai định dạng", async () => {
    const response = await request(app).put(
      `/api/discounts/${invalidFormatId}/use`
    );
    expect(response.statusCode).toBe(500);
    expect(response.body.success).toBe(false);
  });
});

describe("API Test cho /api/discounts/:eventId", () => {
  const validEventId = "690b8ae5b27861db380dc157";
  const nonExistentEventId = "690b8ae5b27861db380dc157";
  const invalidFormatId = "60c84c1f40c741001509900000000001";

  // --- CASE 1: THÀNH CÔNG (200) ---
  it("GET /api/discounts/:eventId -- nên trả về danh sách discounts (200 OK)", async () => {
    const response = await request(app).get(`/api/discounts/${validEventId}`);
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Object);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  // --- CASE 2: KHÔNG TÌM THẤY (404) ---
  it("GET /api/discounts/:eventId -- nên trả về 404 hoặc 200/mảng rỗng khi EventId không tồn tại", async () => {
    const response = await request(app).get(
      `/api/discounts/${nonExistentEventId}`
    );
    expect(response.statusCode).toBe(404);
    expect(response.body).toBeInstanceOf(Object);
    expect(response.body.success).toBe(false);
    expect(Array.isArray(response.body.data)).toBe(false);
  });

  // --- CASE 3: LỖI (400 hoặc 500) ---
  it("GET /api/discounts/:eventId -- nên trả về lỗi (400/500) khi EventId sai định dạng", async () => {
    const response = await request(app).get(
      `/api/discounts/${invalidFormatId}`
    );
    expect(response.statusCode).toBe(500);
    expect(response.body.success).toBe(false);
  });
});
