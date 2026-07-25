const request = require("supertest");
const app = require("../../index");

describe("API Test cho /api/payment", () => {
  it("POST /api/payment -- nên tạo payment mới", async () => {
    const response = await request(app).post("/api/payment").send({
      order_id: "68f368b018b7f484e69f03be",
      amount: 350000,
      payment_method: "MOMO",
      transaction_id: "momo_txn_1760459945357",
      status: "SUCCESS",
      created_at: "2025-10-18T12:03:10.000Z",
      updated_at: "2025-10-18T12:05:00.000Z",
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Object);
    expect(response.body).toHaveProperty("requestId");
  }, 20000);

  it("POST /api/payment/return -- nên trả về dữ liệu", async () => {
    const response = await request(app).post("/api/payment/return").send({
      order_id: "68f32041d7976ef9db56c363",
      amount: 500000,
      payment_method: "MOMO",
      transaction_id: "momo_txn_1760460345678",
      status: "SUCCESS",
      created_at: "2025-10-18T12:25:00.000Z",
      updated_at: "2025-10-18T12:25:10.000Z",
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Object);
    expect(response.body).toHaveProperty("success");
    expect(response.body.success).toBe(true);
    expect(response.body.order).toHaveProperty("_id");
  }, 20000);

  it("GET /api/orders/:orderId/details -- nên trả về chi tiết 1 đơn hàng", async () => {
    const orderId = "68f32041d7976ef9db56c363";
    const response = await request(app).get(`/api/orders/${orderId}/details`);
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.products)).toBe(true);
    if (response.body.products.length > 0) {
      const firstOrderItem = response.body.products[0];
      expect(firstOrderItem).toHaveProperty("name");
      expect(typeof firstOrderItem.name).toBe("string");
    }
  }, 20000);

  it("GET /api/orders/:userId -- nên trả về đơn hàng theo userId", async () => {
    const userId = "68c97c675ebda7befe4cfdb2";
    const response = await request(app).get(`/api/orders/${userId}`);
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.tickets)).toBe(true);
    if (response.body.tickets.length > 0) {
      const firstOrder = response.body.tickets[0];
      expect(firstOrder).toHaveProperty("id");
      expect(typeof firstOrder.id).toBe("string");
    }
  }, 20000);

  it("GET /api/order/items/:orderId -- nên trả về các item trong order theo orderId", async () => {
    const orderId = "68f32041d7976ef9db56c363";
    const response = await request(app).get(`/api/order/items/${orderId}`);
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.items)).toBe(true);
    if (response.body.items.length > 0) {
      const firstOrder = response.body.items[0];
      expect(firstOrder).toHaveProperty("_id");
      expect(typeof firstOrder._id).toBe("string");
    }
  }, 20000);

  it("GET /api/order/item/detail/:id -- nên trả về thông tin chi tiết item trong order theo id", async () => {
    const findId = "68f32109c696dad3bcdee144";
    const response = await request(app).get(`/api/order/item/detail/${findId}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Object);
  }, 20000);

  it("PUT /api/order/item/detail/:id -- nên cập nhật thông tin của item trong order", async () => {
    const id = "68f32109c696dad3bcdee144";
    const response = await request(app)
      .put(`/api/order/item/detail/${id}`)
      .send({
        status: "Pending",
      });
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Object);
    expect(response.body).toHaveProperty("success");
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty("data");
    expect(response.body.data).toBeInstanceOf(Object);
  }, 20000);

  it("GET /api/review/:id -- nên trả về review theo id", async () => {
    const findId = "68c97fd05ebda7befe4cfdb7";
    const response = await request(app).get(`/api/review/${findId}`);
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.reviews)).toBe(true);
    if (response.body.reviews.length > 0) {
      const firstReview = response.body.reviews[0];
      expect(firstReview).toHaveProperty("_id");
      expect(firstReview).toHaveProperty("rating");
      expect(firstReview).toHaveProperty("comments");
      expect(typeof firstReview._id).toBe("string");
      expect(typeof firstReview.comments).toBe("string");
    }
  }, 20000);
});
