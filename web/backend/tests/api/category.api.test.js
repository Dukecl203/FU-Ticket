const request = require("supertest");
const app = require("../../index.js");

describe("API Test cho /api/binh/categories", () => {
  it("GET /api/binh/categories -- nên trả về danh sách categories", async () => {
    const response = await request(app).get("/api/binh/categories");
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Object);
    expect(Array.isArray(response.body.data)).toBe(true);
    if (response.body.data.length > 0) {
      const firstCategory = response.body.data[0];
      expect(firstCategory).toHaveProperty("_id");
      expect(firstCategory).toHaveProperty("name");
      expect(firstCategory).toHaveProperty("description");
      expect(typeof firstCategory._id).toBe("string");
      expect(typeof firstCategory.name).toBe("string");
    }
  }, 20000);

  it("GET /api/binh/categories/:id -- nên trả về category theo id", async () => {
    const validCategoryId = "68c97ae25ebda7befe4cfdae";
    const response = await request(app).get(
      `/api/binh/categories/${validCategoryId}`
    );
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Object);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Object);
    expect(response.body.data._id).toBe(validCategoryId);
    expect(response.body.data.name).toBe("Music");
  }, 20000);
});
