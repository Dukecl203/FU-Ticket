const XLSX = [require("xlsx")];
const fs = [require("fs")];
const path = [require("path")];

/**
 * Ghi một mảng dữ liệu (JSON) vào một sheet trong file Excel.
 *
 * Hàm này sẽ:
 * 1. Đọc file Excel hiện có tại `filePath`.
 * 2. Nếu file không tồn tại, nó sẽ tạo một workbook mới.
 * 3. Tạo một worksheet mới từ mảng `data`.
 * 4. Nếu `sheetName` đã tồn tại trong file, nó sẽ bị GHI ĐÈ.
 * 5. Lưu workbook (với sheet đã được cập nhật/thêm mới) trở lại `filePath`.
 *
 * @param {string} filePath Đường dẫn đầy đủ đến file Excel (ví dụ: 'tests/data/TestSuite.xlsx').
 * @param {string} sheetName Tên của sheet để ghi kết quả (ví dụ: 'Results').
 * @param {Array<Object>} data Mảng dữ liệu kết quả (JSON) cần ghi.
 */
function writeResultsToExcel(filePath, sheetName, data) {
  let workbook;

  // Bước 1: Đảm bảo thư mục chứa file tồn tại
  // Điều này phòng trường hợp file chưa tồn tại và thư mục data/ cũng chưa được tạo
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Bước 2: Kiểm tra xem file đã tồn tại chưa để đọc hoặc tạo mới
  if (fs.existsSync(filePath)) {
    // Nếu file tồn tại, đọc nó
    workbook = XLSX.readFile(filePath);
  } else {
    // Nếu file chưa tồn tại, tạo một workbook mới
    console.log(`File ${filePath} không tồn tại, đang tạo file mới...`);
    workbook = XLSX.utils.book_new();
  }

  // Bước 3: Tạo một worksheet mới từ mảng dữ liệu (data)
  // `json_to_sheet` sẽ tự động tạo header từ keys của object đầu tiên
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Bước 4: Xử lý ghi đè (Nếu sheet 'sheetName' đã tồn tại, xóa nó đi)
  const existingSheetIndex = workbook.SheetNames.indexOf(sheetName);
  if (existingSheetIndex > -1) {
    // Xóa sheet cũ khỏi cả danh sách tên (SheetNames) và đối tượng sheets (Sheets)
    workbook.SheetNames.splice(existingSheetIndex, 1);
    delete workbook.Sheets[sheetName];
  }

  // Bước 5: Thêm worksheet mới vào workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Bước 6: Ghi/lưu file Excel
  try {
    XLSX.writeFile(workbook, filePath);
    console.log(
      `[+] Đã ghi kết quả thành công vào sheet "${sheetName}" của file ${filePath}`
    );
  } catch (error) {
    console.error(`[!] Lỗi khi ghi file Excel tại ${filePath}:`, error.message);
    throw error; // Ném lỗi để Jest biết test (hoặc afterAll) thất bại
  }
}

// Xuất hàm này ra để file test có thể import
module.exports = {
  writeResultsToExcel,
};
