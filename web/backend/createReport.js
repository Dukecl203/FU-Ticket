const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

// Đọc file kết quả JSON mà Jest đã tạo
const results = JSON.parse(fs.readFileSync("jest-results.json", "utf8"));

async function createReport() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Automation Script";
  workbook.lastModifiedBy = "Automation Script";
  workbook.created = new Date();

  // --- Tạo Sheet Chi Tiết (ví dụ từ Jest) ---
  const detailSheet = workbook.addWorksheet("Test Details");
  detailSheet.columns = [
    { header: "Test Suite (File)", key: "suite", width: 50 },
    { header: "Test Case Name", key: "title", width: 50 },
    { header: "Status", key: "status", width: 15 },
    { header: "Time (ms)", key: "duration", width: 15 },
    { header: "Bugs", key: "error", width: 70 },
  ];

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalPending = 0;

  const rootDir = process.cwd();
  // Lặp qua kết quả test của Jest
  results.testResults.forEach((suite) => {
    suite.assertionResults.forEach((test) => {
      detailSheet.addRow({
        suite: suite.name.replace(rootDir + path.sep, ""),
        title: test.title,
        status: test.status,
        duration: test.duration,
        error: test.failureMessages.join("\n"),
      });

      // Cập nhật biến đếm cho sheet Summary
      if (test.status === "passed") totalPassed++;
      if (test.status === "failed") totalFailed++;
      if (test.status === "pending") totalPending++;
    });
  });
  totalTests = totalPassed + totalFailed + totalPending;

  // --- Tạo Sheet Summary (Tổng kết) ---
  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Muc", key: "item", width: 30 },
    { header: "So luong", key: "count", width: 15 },
  ];

  summarySheet.addRow({ item: "Total Test Case", count: totalTests });
  summarySheet.addRow({ item: "Passed", count: totalPassed });
  summarySheet.addRow({ item: "Failed", count: totalFailed });
  summarySheet.addRow({ item: "Skipped/Pending", count: totalPending });
  summarySheet.addRow({
    item: "Pass Rate",
    count: {
      formula: `=B3/B2`,
      result: totalPassed / totalTests,
    },
  });
  // Định dạng ô tỷ lệ
  summarySheet.getCell("B6").numFmt = "0.00%";

  // Lưu file
  await workbook.xlsx.writeFile("BaoCaoTest_TuDong.xlsx");
  console.log("Da xuat bao cao Excel thanh cong!");
}

createReport();
