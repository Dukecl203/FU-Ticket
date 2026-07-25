const request = require("supertest");
const app = require("../../index.js");
const path = require("path");

// --- SỬA Ở ĐÂY ---
// Import hàm ĐỌC từ file reader
const { getTestData } = require("../utils/excelReader.js");
// Import hàm GHI từ file writer
const { writeResultsToExcel } = require("../utils/excelWriter");
// ---------------

// ==================================================================
// KHU VỰC 1: SETUP - ĐỌC DỮ LIỆU VÀ KHAI BÁO
// ==================================================================

// 1.1. Khai báo đường dẫn và tên sheet
const EXCEL_FILE_PATH = path.resolve(__dirname, "excel/TestAPI.xlsx");
const INPUT_SHEET = "TestCases"; // Sheet chứa test cases
const OUTPUT_SHEET = "Results"; // Sheet để ghi kết quả

// 1.2. Khởi tạo mảng chứa kết quả
let testResults = [];

// 1.3. Đọc dữ liệu test từ Excel
let testData = [];
try {
  // Đọc dữ liệu từ sheet 'TestCases'
  testData = getTestData(EXCEL_FILE_PATH, INPUT_SHEET);
} catch (error) {
  console.error(`Không thể đọc file Excel! Lỗi: ${error.message}`);
  // Nếu không đọc được file, testData sẽ là mảng rỗng, test.each sẽ tự động bỏ qua
}

// ==================================================================
// KHU VỰC 2: EXECUTION - CHẠY TEST VỚI TEST.EACH
// ==================================================================

describe("API Test cho /api/events (Data-Driven from Excel)", () => {
  // 2.1. Dùng test.each để lặp qua từng hàng dữ liệu (từng test case)
  test.each(testData)(
    "Test Case $TestCaseID: $Description", // Tiêu đề cho mỗi test
    async ({
      TestCaseID,
      Description,
      Method,
      Endpoint,
      Payload,
      ExpectedStatus,
    }) => {
      let response;
      let testStatus = "Fail"; // Mặc định là Fail
      let actualStatus = "N/A";
      let responseBody = "";

      // 2.2. Dùng try...catch để bắt lỗi và ghi nhận kết quả
      try {
        // Chuyển đổi Payload (dạng text JSON) thành object
        const payloadData = Payload ? JSON.parse(Payload) : {};
        ExpectedStatus = parseInt(ExpectedStatus); // Đảm bảo status là số

        // 2.3. Dùng switch để gọi đúng phương thức (Method)
        switch (Method.toUpperCase()) {
          case "GET":
            response = await request(app).get(Endpoint);
            break;
          case "POST":
            response = await request(app).post(Endpoint).send(payloadData);
            break;
          case "PUT":
            response = await request(app).put(Endpoint).send(payloadData);
            break;
          case "DELETE":
            response = await request(app).delete(Endpoint);
            break;
          default:
            throw new Error(`Phương thức ${Method} không được hỗ trợ`);
        }

        actualStatus = response.statusCode;
        responseBody = JSON.stringify(response.body);

        // 2.4. Assertion chính
        expect(actualStatus).toBe(ExpectedStatus);

        // Nếu dòng trên không ném lỗi, test case là Pass
        testStatus = "Pass";
      } catch (error) {
        // Nếu có lỗi (từ expect hoặc từ request)
        if (response) {
          actualStatus = response.statusCode;
          responseBody = JSON.stringify(response.body);
        } else {
          responseBody = error.message; // Lỗi mạng, lỗi parse JSON, v.v.
        }
        testStatus = "Fail";
      }

      // 2.5. Push kết quả vào mảng testResults
      testResults.push({
        "Test Case ID": TestCaseID,
        Description: Description,
        Method: Method,
        Endpoint: Endpoint,
        "Expected Status": ExpectedStatus,
        "Actual Status": actualStatus,
        "Test Status": testStatus,
        "Response Body":
          responseBody.substring(0, 200) +
          (responseBody.length > 200 ? "..." : ""), // Rút gọn body
        Timestamp: new Date().toISOString(),
      });
    }
  );
});

// ==================================================================
// KHU VỰC 3: TEARDOWN - GHI KẾT QUẢ RA EXCEL
// ==================================================================
afterAll(async () => {
  if (testResults.length > 0) {
    console.log(
      `Đang ghi ${testResults.length} kết quả vào sheet ${OUTPUT_SHEET}...`
    );
    writeResultsToExcel(EXCEL_FILE_PATH, OUTPUT_SHEET, testResults);
  } else {
    console.log(
      "Không có dữ liệu test hoặc không chạy test nào, không ghi file kết quả."
    );
  }
});
