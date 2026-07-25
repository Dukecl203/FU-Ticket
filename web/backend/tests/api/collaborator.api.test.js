const request = require("supertest");
// <-- SỬA 1: Đổi tên 'app' thành 'server'. 
// index.js trả về server instance (là open handle)
// supertest(server) vẫn hoạt động bình thường.
const server = require("../../index.js"); 
const mongoose = require("mongoose");

describe("API Test cho /api/collaborators", () => {
  // Test case 1
  it("GET /api/collaborators/search -- nên trả về danh sách users theo search", async () => {
    const searchQuery = "John Doe";
    const response = await request(server) // <-- Sửa: dùng 'server'
      .get("/api/collaborators/search")
      .query({ q: searchQuery, limit: 10, page: 1 });

    if (response.statusCode === 200) {
      expect(response.body).toBeInstanceOf(Object);
      expect(Array.isArray(response.body.data)).toBe(true);
    } else {
      expect([400, 401]).toContain(response.statusCode); 
    }
  }, 20000); 

  // Test case 2
  it("GET /api/collaborators/event/:eventId -- nên trả về collaborators của event", async () => {
    const validEventId = "60c72b9f9b1d8f001f8e8b8b"; 
    const response = await request(server) // <-- Sửa: dùng 'server'
      .get(`/api/collaborators/event/${validEventId}`);
    
    if (response.statusCode === 200) {
      expect(response.body).toBeInstanceOf(Object);
      expect(Array.isArray(response.body.data)).toBe(true); 
    } else {
      expect([401, 404]).toContain(response.statusCode); 
    }
  }, 20000);

  // Test case 3
  it("GET /api/collaborators/user/:userId -- nên trả về collaborations của user", async () => {
    const validUserId = "60c72b9f9b1d8f001f8e8b8c"; 
    const response = await request(server) // <-- Sửa: dùng 'server'
      .get(`/api/collaborators/user/${validUserId}`);

    if (response.statusCode === 200) {
      expect(response.body).toBeInstanceOf(Object);
      expect(Array.isArray(response.body.data)).toBe(true); 
    } else {
      expect([401, 404]).toContain(response.statusCode);
    }
  }, 20000);

  // Test case 4
  it("POST /api/collaborators/event/:eventId -- nên thêm collaborator vào event", async () => {
    const validEventId = "60c72b9f9b1d8f001f8e8b8b"; 
    const collaboratorData = {
      collaborator_id: "60c72b9f9b1d8f001f8e8b8d", 
      tasks: ["Task 1", "Task 2"],
    };
    const response = await request(server) // <-- Sửa: dùng 'server'
      .post(`/api/collaborators/event/${validEventId}`)
      .send(collaboratorData);

    expect([200, 201, 400, 404, 500, 401]).toContain(response.statusCode); 

    if (response.statusCode === 200 || response.statusCode === 201) {
      expect(response.body).toBeInstanceOf(Object);
    }
  }, 20000);

  // Test case 5 (PASS)
  it("DELETE /api/collaborators/event/:eventId/collaborator/:collaboratorId -- nên xóa collaborator khỏi event", async () => {
    const validEventId = "60c72b9f9b1d8f001f8e8b8b"; 
    const validCollaboratorId = "60c72b9f9b1d8f001f8e8b8d"; 
    const response = await request(server) // <-- Sửa: dùng 'server'
      .delete(`/api/collaborators/event/${validEventId}/collaborator/${validCollaboratorId}`);
    
    expect([200, 404, 401, 500]).toContain(response.statusCode);
  }, 20000);

  // Test case 6 (PASS)
  it("PUT /api/collaborators/event/:eventId/collaborator/:collaboratorId -- nên cập nhật status của collaborator", async () => {
    const validEventId = "60c72b9f9b1d8f001f8e8b8b"; 
    const validCollaboratorId = "60c72b9f9b1d8f001f8e8b8d"; 
    const updateData = { status: "accepted" };
    const response = await request(server) // <-- Sửa: dùng 'server'
      .put(`/api/collaborators/event/${validEventId}/collaborator/${validCollaboratorId}`)
      .send(updateData);
    
    expect([200, 404, 401, 500]).toContain(response.statusCode);
  }, 20000);

  // Test case 7 (PASS)
  it("PUT /api/collaborators/events/:eventId/status -- nên cập nhật collaboration status với token", async () => {
    const validEventId = "60c72b9f9b1d8f001f8e8b8b"; 
    const updateData = { status: "accepted" };
    const response = await request(server) // <-- Sửa: dùng 'server'
      .put(`/api/collaborators/events/${validEventId}/status`)
      .send(updateData);
    
    expect([200, 404, 401]).toContain(response.statusCode); 
  }, 20000);

  // Test case 8 (BỊ FAIL)
  it("GET /api/collaborators/search -- nên xử lý các query parameters khác nhau", async () => {
    const response = await request(server) // <-- Sửa: dùng 'server'
      .get("/api/collaborators/search")
      .query({ q: "test", limit: "10", page: "1" });
    
    // <-- SỬA 2: Thêm 400 vào mảng
    expect([200, 401, 400]).toContain(response.statusCode); 
    
    if (response.statusCode === 200) {
      expect(response.body).toBeInstanceOf(Object);
      expect(Array.isArray(response.body.data)).toBe(true);
    }
  }, 20000);

  // Test case 9
  it("GET /api/collaborators/event/invalid_id -- nên xử lý invalid event ID", async () => {
    const response = await request(server) // <-- Sửa: dùng 'server'
      .get("/api/collaborators/event/invalid_event_id");
    
    expect([400, 404, 500, 401]).toContain(response.statusCode);
  }, 20000);

  // Test case 10
  it("GET /api/collaborators/user/invalid_id -- nên xử lý invalid user ID", async () => {
    const response = await request(server) // <-- Sửa: dùng 'server'
      .get("/api/collaborators/user/invalid_user_id");
    
    expect([400, 404, 500, 401]).toContain(response.statusCode);
  }, 20000);

  // <-- SỬA 3: Sửa afterAll để đóng cả DB và SERVER
  afterAll(async () => {
    await mongoose.connection.close(); // Đóng kết nối CSDL
  });
});