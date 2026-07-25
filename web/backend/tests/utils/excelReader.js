const XLSX = require("xlsx");

/**
 * Đọc dữ liệu từ một file Excel và chuyển thành mảng các đối tượng (JSON).
 * Hàm này giả định rằng hàng đầu tiên (row 1) trong sheet là hàng tiêu đề (header).
 *
 * @param {string} filePath Đường dẫn đầy đủ đến file Excel.
 * @param {string} [sheetName] Tên của sheet cần đọc. Nếu bỏ trống, sẽ tự động đọc sheet đầu tiên.
 * @returns {Array<Object>} Mảng các đối tượng, mỗi đối tượng đại diện cho một hàng dữ liệu.
 * @throws {Error} Nếu không tìm thấy sheet hoặc file.
 */
function getTestData(filePath, sheetName) {
  try {
    // 1. Đọc toàn bộ file Excel
    const workbook = XLSX.readFile(filePath);

    // 2. Xác định tên sheet cần đọc
    let targetSheetName = sheetName;
    if (!targetSheetName) {
      targetSheetName = workbook.SheetNames[0]; // Mặc định lấy sheet đầu tiên
    }

    // 3. Lấy sheet cụ thể
    const worksheet = workbook.Sheets[targetSheetName];
    if (!worksheet) {
      throw new Error(
        `Không tìm thấy sheet có tên: "${targetSheetName}" trong file.`
      );
    }

    // 4. Chuyển sheet thành mảng JSON
    // XLSX.utils.sheet_to_json sẽ tự động lấy hàng đầu tiên làm keys
    const data = XLSX.utils.sheet_to_json(worksheet, {
      raw: true, // Giữ nguyên kiểu dữ liệu (vd: số, ngày) thay vì chuyển hết sang string
    });

    return data;
  } catch (error) {
    console.error(`Lỗi khi đọc file Excel tại ${filePath}:`, error.message);
    throw error; // Ném lỗi để Jest test case biết và báo fail
  }
}

// Xuất hàm này ra để các file test khác có thể import và sử dụng
module.exports = { getTestData };
