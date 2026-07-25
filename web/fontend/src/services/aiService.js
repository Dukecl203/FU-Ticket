import axios from 'axios';

export async function sendChatMessages(messages, model = 'gemini-2.5-flash') {
  const res = await axios.post('/api/ai/chat', { messages, model });
  return res.data;
}

export const INTENT_SYSTEM_PROMPT = `Hãy phân tích tin nhắn người dùng bằng tiếng Việt và xuất ra JSON TUYỆT ĐỐI theo schema sau, không kèm giải thích:

{
  "keywords": string[],
  "category": string | null,
  "timeRange": string | null,
  "priceRange": { "min": number, "max": number } | null,
  "location": string | null,
  "requestedTitle": string | null,
  "requestedDate": { "day": number, "month": number, "year": number } | null,
  "requestedMonth": { "month": number, "year": number } | null,
  "requestedRange": { "start": { "day": number, "month": number, "year": number }, "end": { "day": number, "month": number, "year": number } } | null,
  "requestedRangeLabel": string | null,
  "negations": string[] | null,
  "preferences": { "pricePreference": "cheap" | "premium" | null } | null,
  "confidences": { "category": number | null, "timeRange": number | null, "priceRange": number | null, "location": number | null, "requestedTitle": number | null, "requestedDate": number | null, "requestedMonth": number | null, "requestedRange": number | null } | null,
  "rawMessage": string
}

Quy tắc:
- Hiểu các cụm: "tháng N", "thg N", "th N" → requestedMonth.
- "mùa Noel", "Giáng sinh", "Christmas" → requestedMonth = tháng 12 (tự suy năm nếu cần).
- "Tết Dương lịch", "Tết Tây", "New Year", "Năm mới" → requestedDate = 01/01 (tự suy năm nếu cần).
- "đầu/giữa/cuối tháng N [năm Y]" → requestedRange (1–10, 11–20, 21–cuối tháng) và requestedRangeLabel. Nếu chưa có requestedMonth thì set theo tháng đó.
- Nếu không có năm và thời điểm đã qua, tự động đẩy sang năm kế tiếp.
- keywords: bỏ từ dừng, bỏ dấu, chữ thường.
- Nhận diện phủ định/ngoại lệ (ví dụ: "không miễn phí", "trừ Hà Nội") và sở thích (ví dụ: "ưu tiên giá rẻ"). Điền vào negations, preferences nếu có.
- Trả về confidences cho các trường ở thang 0..1 nếu xác định được, nếu không thì null.
- Chỉ xuất JSON hợp lệ, không thêm text.`;

export async function extractSearchIntent(userText, model = 'gemini-2.5-flash') {
  const messages = [
    { role: 'system', content: INTENT_SYSTEM_PROMPT },
    { role: 'user', content: userText }
  ];
  return await sendChatMessages(messages, model);
}

export default { sendChatMessages, extractSearchIntent, INTENT_SYSTEM_PROMPT };
