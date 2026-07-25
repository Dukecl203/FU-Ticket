const request = require("supertest");
const app = require("../../index.js");

let createdUserId = "68c97bf55ebda7befe4cfdb1";

const mockUser = {
  full_name: "testuser_" + Date.now(),
  email: "test_" + Date.now() + "@example.com",
  password_hash: "password123",
  phone_number: "1234567890",
  role: "User",
  status: "active",
};

const mockUserUpdate = {
  full_name: "updated_username",
};

describe("API Test cho /api/users", () => {
  it("GET /api/users -- nên trả về danh sách users", async () => {
    const response = await request(app).get("/api/users");
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  }, 20000);

  it("GET /api/users/:id -- nên trả về user theo id", async () => {
    const response = await request(app).get(`/api/users/${createdUserId}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Object);
    expect(response.body.data._id).toBe(createdUserId);
  }, 20000);

  it("POST /api/users -- nên tạo user mới", async () => {
    const response = await request(app).post("/api/users").send(mockUser);
    expect(response.statusCode).toBe(201);
    expect(response.body).toBeInstanceOf(Object);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Object);
    expect(response.body.data.username).toBe(mockUser.username);
    expect(response.body.data).toHaveProperty("_id");
    createdUserId = response.body.data._id;
  }, 20000);

  it("PUT /api/users/:id -- nên cập nhật user vừa tạo", async () => {
    const response = await request(app)
      .put(`/api/users/${createdUserId}`)
      .send(mockUserUpdate);
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Object);
    expect(response.body.data.username).toBe(mockUserUpdate.username);
  }, 20000);

  it("DELETE /api/users/:id -- nên xóa user theo id", async () => {
    const deleteId = "68f8df99410af93961616afb";
    const response = await request(app).delete(`/api/users/${deleteId}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  }, 20000);
});
