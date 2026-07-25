const { addNotification } = require("../../controllers/notificationController");
const Notification = require("../../models/Notification");

const mockSave = jest.fn();
jest.mock("../../models/Notification", () => {
  return jest.fn().mockImplementation(() => ({
    save: mockSave,
  }));
});

describe("Notification Controller - addNotification", () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // --- Test Case 1: Trường hợp thành công ---
  test("should add a notification successfully", async () => {
    // Arrange (Sắp xếp)
    const userId = "user123";
    const orderId = "order456";
    const message = "Your order has been confirmed";
    mockSave.mockResolvedValue(true);
    // Act (Hành động)
    await addNotification(userId, orderId, message);
    // Assert (Kiểm chứng)
    // 1. Kiểm tra 'new Notification' được gọi với đúng dữ liệu
    expect(Notification).toHaveBeenCalledWith({
      user_id: userId,
      order_id: orderId,
      message: message,
    });
    // 2. Kiểm tra phương thức 'save' đã được gọi
    expect(mockSave).toHaveBeenCalledTimes(1);
    // 3. Kiểm tra console.log đã được gọi (đây là "kết quả" chúng ta kiểm tra)
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "✅ Notification added successfully"
    );
    // 4. Đảm bảo console.error không được gọi
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  // --- Test Case 2: Trường hợp thất bại ---
  test("should log an error if saving fails", async () => {
    // Arrange (Sắp xếp)
    const dbError = new Error("Database connection error");
    mockSave.mockRejectedValue(dbError);
    // Act (Hành động)
    await addNotification("user_err", "order_err", "fail");
    // Assert (Kiểm chứng)
    // 1. Kiểm tra 'save' vẫn được gọi
    expect(mockSave).toHaveBeenCalledTimes(1);
    // 2. Kiểm tra console.log không được gọi
    expect(consoleLogSpy).not.toHaveBeenCalled();
    // 3. Kiểm tra console.error đã được gọi với đúng lỗi (đây là "kết quả" chính)
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error adding notification:",
      dbError
    );
  });
});
