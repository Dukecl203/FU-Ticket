import axios from 'axios';

const API_BASE = 'http://localhost:9999/api';

const normalizeForSearch = (value) => removeVietnameseDiacritics((value || '').toString().toLowerCase().trim());

const removeVietnameseDiacritics = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
};

// Merge LLM intent JSON with rule-based parse and raw message
export const mergeIntents = (llmIntent, userMessage) => {
  const ruleIntent = parseSearchIntent(userMessage);
  const merged = { ...ruleIntent, ...llmIntent };

  // Prefer explicit dates/months/ranges from LLM if present, else keep rule-based
  merged.requestedDate = llmIntent?.requestedDate || ruleIntent.requestedDate || null;
  merged.requestedMonth = llmIntent?.requestedMonth || ruleIntent.requestedMonth || null;
  merged.requestedRange = llmIntent?.requestedRange || ruleIntent.requestedRange || null;
  merged.requestedRangeLabel = llmIntent?.requestedRangeLabel || ruleIntent.requestedRangeLabel || null;

  // Location normalization: prefer LLM if present, else rule
  merged.location = llmIntent?.location || ruleIntent.location || null;

  // Price preference to priceRange mapping if LLM only set preference
  if (!merged.priceRange && llmIntent?.preferences?.pricePreference) {
    const pref = llmIntent.preferences.pricePreference;
    if (pref === 'cheap') merged.priceRange = { min: 0, max: 500000 };
    if (pref === 'premium') merged.priceRange = { min: 500000, max: Infinity };
  }

  // Carry raw text
  merged.rawMessage = userMessage;
  return merged;
};

// Analyze ambiguity and return { needsClarification, question }
export const analyzeIntentAmbiguity = (intent, userMessage) => {
  const issues = [];
  // Missing any time constraint
  if (!intent.requestedDate && !intent.requestedMonth && !intent.requestedRange && !intent.timeRange) {
    issues.push('time');
  }
  // Conflicting price intentions
  const negs = intent.negations || [];
  if (intent.priceRange?.max === 0 && negs.some(n => n.includes('khong mien phi') || n.includes('khong free'))) {
    issues.push('price');
  }
  // Multiple/ambiguous locations (simple heuristic)
  if (!intent.location && /ha noi|hanoi/.test(userMessage.toLowerCase()) && /sai gon|ho chi minh|hcm/.test(userMessage.toLowerCase())) {
    issues.push('location');
  }

  if (issues.length === 0) return { needsClarification: false, question: '' };

  // Build a short clarifying question by priority
  if (issues.includes('location')) {
    return { needsClarification: true, question: 'Bạn muốn xem ở Hà Nội hay TP.HCM?' };
  }
  if (issues.includes('time')) {
    return { needsClarification: true, question: 'Bạn muốn xem sự kiện khi nào? (hôm nay, cuối tuần, tháng cụ thể, hoặc ngày cụ thể)' };
  }
  if (issues.includes('price')) {
    return { needsClarification: true, question: 'Bạn muốn sự kiện miễn phí hay có thể thu phí?' };
  }
  return { needsClarification: true, question: 'Bạn có thể nói rõ hơn để mình gợi ý chính xác hơn không?' };
};

const lastDayOfMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

// Detect phrases like "đầu tháng 12", "giữa tháng 12", "cuối tháng 12" and compute a date range
const extractMonthPartRange = (lowerMsg, normalizedMsg) => {
  const m = lowerMsg.match(/\b(dau|giua|cuoi)\s+thang\s+(\d{1,2})(?:\s*(?:năm|nam|year)?\s*(\d{2,4}))?/);
  if (!m) return null;
  const part = m[1];
  const month = parseInt(m[2], 10);
  const explicitYear = parseYearValue(m[3]);
  const resolved = resolveRequestedMonth(month, explicitYear);
  if (!resolved) return null;
  const year = resolved.year;
  const monthNum = resolved.month;
  const lastDay = lastDayOfMonth(year, monthNum);
  let startDay = 1, endDay = lastDay;
  let labelPrefix = '';
  if (part === 'dau') { startDay = 1; endDay = Math.min(10, lastDay); labelPrefix = 'đầu'; }
  else if (part === 'giua') { startDay = 11; endDay = Math.min(20, lastDay); labelPrefix = 'giữa'; }
  else if (part === 'cuoi') { startDay = 21; endDay = lastDay; labelPrefix = 'cuối'; }
  const range = {
    start: { day: startDay, month: monthNum, year },
    end: { day: endDay, month: monthNum, year },
  };
  const label = `${labelPrefix} tháng ${monthNum}/${year}`;
  return { range, label };
};

const resolveRequestedDate = (day, month, explicitYear) => {
  if (!day || !month) return null;
  const now = new Date();
  let year = explicitYear ?? now.getFullYear();
  const candidate = new Date(year, month - 1, day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!explicitYear && candidate < today) {
    year += 1;
  }
  return { day, month, year };
};

const extractHolidayRequest = (lowerMsg, normalizedMsg) => {
  const nm = normalizedMsg;
  if (nm.includes('mua noel') || nm.includes('giang sinh') || nm.includes('christmas')) {
    const year = extractYearNearKeyword(nm, 'giang sinh') || extractYearNearKeyword(nm, 'christmas');
    const monthObj = resolveRequestedMonth(12, year);
    return { month: monthObj };
  }
  if (nm.includes('tet duong lich') || nm.includes('nam moi') || nm.includes('new year') || nm.includes('tet tay')) {
    const year = extractYearNearKeyword(nm, 'tet duong lich') || extractYearNearKeyword(nm, 'new year') || extractYearNearKeyword(nm, 'nam moi') || extractYearNearKeyword(nm, 'tet tay');
    const dateObj = resolveRequestedDate(1, 1, year);
    return { date: dateObj };
  }
  return null;
};

/**
 * Parse user message to extract search intent
 * Returns: { type, keywords, category, priceRange, date, location }
 */
export const parseSearchIntent = (message) => {
  const lowerMsg = message.toLowerCase();
  const normalizedMsg = normalizeForSearch(message).replace(/\s+/g, ' ').trim();
  
  // Category keywords mapping
  const categories = {
    'music|concert|nhạc|live|biểu diễn|show|festival|party': 'Music',
    'sport|thể thao|bóng đá|tennis|basketball|football|gym': 'Sports',
    'tech|công nghệ|startup|workshop|coding|programming|development': 'Technology',
    'conference|hội thảo|seminar|talk|presentation|webinar': 'Conference',
    'art|nghệ thuật|triển lãm|drawing|painting|exhibition': 'Arts',
    'food|ăn uống|nấu ăn|festival ăn|cooking|restaurant|cafe': 'Food',
    'game|trò chơi|esports|gaming|tournament': 'Gaming',
    'education|học tập|training|giáo dục|course|class|school': 'Education',
  };

  // Time keywords
  const timePatterns = {
    'today|hôm nay': 'today',
    'tomorrow|ngày mai': 'tomorrow',
    'this week|tuần này|week|tuần': 'this-week',
    'this month|tháng này|month|tháng': 'this-month',
    'next week|tuần tới|tuần sau': 'next-week',
    'next month|tháng tới|tháng sau': 'next-month',
    'weekend|cuối tuần': 'weekend',
    'evening|tối|night|đêm': 'evening',
    'morning|sáng': 'morning',
  };

  // Price keywords
  const pricePatterns = {
    'free|miễn phí|không mất tiền': { min: 0, max: 0 },
    'cheap|rẻ|dưới 100k|under 100|bình dân': { min: 0, max: 100000 },
    'under 500k|dưới 500|moderately|vừa phải': { min: 0, max: 500000 },
    'expensive|đắt|trên 500k|over 500|premium': { min: 500000, max: Infinity },
  };

  // Location keywords
  const locationPatterns = {
    'hà nội|hanoi|downtown|center': 'Hà Nội',
    'sài gòn|ho chi minh|hcm|saigon': 'Sài Gòn',
    'đà nẵng|danang': 'Đà Nẵng',
    'huế|hue': 'Huế',
    'can tho|cần thơ': 'Cần Thơ',
    'near me|gần đây|xung quanh': 'near-me',
  };

  let detectedCategory = null;
  let detectedTime = null;
  let detectedPrice = null;
  let detectedLocation = null;
  let keywords = [];
  let requestedTitle = null;
  let requestedDate = null;
  let requestedMonth = null;

  // Detect category
  for (const [pattern, category] of Object.entries(categories)) {
    if (new RegExp(pattern).test(lowerMsg)) {
      detectedCategory = category;
      break;
    }
  }

  // Detect time
  for (const [pattern, time] of Object.entries(timePatterns)) {
    if (new RegExp(pattern).test(lowerMsg)) {
      detectedTime = time;
      break;
    }
  }

  // Detect price
  for (const [pattern, priceRange] of Object.entries(pricePatterns)) {
    if (new RegExp(pattern).test(lowerMsg)) {
      detectedPrice = priceRange;
      break;
    }
  }

  // Detect location
  for (const [pattern, location] of Object.entries(locationPatterns)) {
    if (new RegExp(pattern).test(lowerMsg)) {
      detectedLocation = location;
      break;
    }
  }

  // Detect explicit title (tiêu đề / tên sự kiện / quoted text)
  const titleRegex = /(?:tiêu đề|title|tên(?:\s+sự\s+kiện)?|event name)\s*(?:là|:)?\s*["“]?([^"”\n]+)["”]?/i;
  const titleMatch = message.match(titleRegex);
  if (titleMatch && titleMatch[1]) {
    requestedTitle = titleMatch[1].trim();
  } else {
    const quotedTitle = message.match(/["“]([^"”]{3,80})["”]/);
    if (quotedTitle && quotedTitle[1]) {
      requestedTitle = quotedTitle[1].trim();
    }
  }

  requestedDate = extractExplicitDate(message);
  requestedMonth = extractRequestedMonth(lowerMsg, normalizedMsg);
  const holiday = extractHolidayRequest(lowerMsg, normalizedMsg);
  if (!requestedDate && holiday && holiday.date) requestedDate = holiday.date;
  if (!requestedMonth && holiday && holiday.month) requestedMonth = holiday.month;

  // Detect month-part ranges: đầu/giữa/cuối tháng <n> [năm <y>]
  const monthPart = extractMonthPartRange(lowerMsg, normalizedMsg);
  let requestedRange = null;
  let requestedRangeLabel = null;
  if (monthPart) {
    requestedRange = monthPart.range;
    requestedRangeLabel = monthPart.label;
    // If user specified a month part, ensure requestedMonth is also set for better messaging
    if (!requestedMonth) requestedMonth = { month: monthPart.range.start.month, year: monthPart.range.start.year };
  }

  // Extract keywords (remove common words)
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'is', 'are', 'recommend', 'suggest',
    'find', 'search', 'show', 'tìm', 'tim', 'tìm kiếm', 'tim kiem',
    'hãy', 'hay', 'giúp', 'giup', 'hãy giúp', 'hay giup',
    'cái', 'cai', 'nào', 'nao', 'gì', 'gi', 'các', 'cac', 'những', 'nhung',
    'chọn', 'chon', 'chọn cho', 'chon cho', 'cho', 'hãy chọn', 'hay chon',
    'sự', 'su', 'kiện', 'kien', 'sự kiện', 'su kien',
    'có', 'co', 'tôi', 'toi', 'muốn', 'muon', 'cần', 'can', 'muốn tìm', 'muon tim',
    'về', 've', 'liên', 'lien', 'quan', 'đến', 'den',
    'event', 'events', 'hôm', 'hom', 'ngày', 'ngay', 'tuần', 'tuan', 'tháng', 'thang', 'năm', 'nam',
    'me', 'i', 'to', 'for', 'with', 'from', 'by', 'in', 'at',
  ]);

  const words = lowerMsg.split(/\s+/).filter(w => !commonWords.has(w) && w.length > 2);
  keywords = [...new Set(words)].slice(0, 5);

  if (requestedTitle) {
    const titleKeywords = requestedTitle
      .toLowerCase()
      .split(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+/i)
      .filter(Boolean);
    keywords = Array.from(new Set([...titleKeywords, ...keywords])).slice(0, 6);
  }

  return {
    keywords,
    category: detectedCategory,
    timeRange: detectedTime,
    priceRange: detectedPrice,
    location: detectedLocation,
    requestedTitle,
    requestedDate,
    requestedMonth,
    requestedRange,
    requestedRangeLabel,
    rawMessage: message,
  };
};

/**
 * Fetch events by category
 */
export const getEventsByCategory = async (category) => {
  try {
    const response = await axios.get(
      `${API_BASE}/binh/events/category?category=${encodeURIComponent(category)}`
    );
    const events = response.data?.data || [];
    console.log(`📂 Category ${category} returned ${events.length} events:`, events);
    // Normalize the data from backend format
    return events.map(e => normalizeEventData(e));
  } catch (error) {
    console.error('Error fetching events by category:', error);
    return [];
  }
};

/**
 * Get list of categories from backend
 */
export const getCategories = async () => {
  try {
    const resp = await axios.get(`${API_BASE}/binh/categories`);
    return resp.data?.data || [];
  } catch (err) {
    console.error('Error fetching categories:', err);
    return [];
  }
};

/**
 * Get trending events (with full details)
 */
export const getTrendingEvents = async () => {
  try {
    // First get trending IDs
    const trendingResponse = await axios.get(`${API_BASE}/binh/trendings`);
    const trendingIds = trendingResponse.data?.data || [];
    console.log(`🔥 Trending API returned ${trendingIds.length} items:`, trendingIds);
    
    if (trendingIds.length === 0) return [];

    // Try to fetch full details for each trending id using the backend event endpoint
    const detailed = await Promise.all(
      trendingIds.map(async (it) => {
        try {
          const full = await getEventById(it.id);
          return full || normalizeEventData({ id: it.id, image: it.image });
        } catch (e) {
          return normalizeEventData({ id: it.id, image: it.image });
        }
      })
    );

    // Filter out any nulls and return
    return detailed.filter(Boolean);
  } catch (error) {
    console.error('Error fetching trending events:', error);
    return [];
  }
};

/**
 * Get full event details by ID
 */
export const getEventById = async (eventId) => {
  try {
    // Use dedicated endpoint to fetch single event details
    const resp = await axios.get(`${API_BASE}/binh/events/${encodeURIComponent(eventId)}`);
    const event = resp.data?.data || null;
    if (!event) return null;
    return normalizeEventData(event);
  } catch (error) {
    console.error('Error fetching event by ID:', error);
    return null;
  }
};

/**
 * Normalize event data from backend to frontend format
 * Backend uses: start_time, end_time, image (poster_url in model)
 * Frontend expects: date_start, date_end, image
 */
const normalizeEventData = (event) => {
  if (!event) return null;
  
  return {
    id: event.id || event._id,
    title: event.title || 'Untitled Event',
    subtitle: event.description || event.detail || '',
    date_start: event.start_time || event.date_start || 'TBA',
    date_end: event.end_time || event.date_end || 'TBA',
    location: event.location || 'TBA',
    price: event.price !== undefined ? event.price : event.ticket_price || 'TBA',
    image: event.image || event.poster_url || '/placeholder.jpg',
    category: event.category || event.category_id || '',
    artist: event.artist || event.organizer?.name || 'Unknown',
    attendees: event.attendees || event.quantity_sold || 0,
    // Keep original data as backup
    _original: event,
  };
};

/**
 * Filter events by location
 */
export const filterEventsByLocation = (events, location) => {
  if (!location || location === 'near-me') return events;
  
  return events.filter(event =>
    event.location && normalizeForSearch(event.location).includes(normalizeForSearch(location))
  );
};

/**
 * Filter events by time range
 */
export const filterEventsByTime = (events, timeRange) => {
  if (!timeRange) return events;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const monthEnd = new Date(today);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  return events.filter(event => {
    const eventDate = parseLooseDate(event.date_start || event.start_time);
    if (!eventDate) return false;
    const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

    switch (timeRange) {
      case 'today':
        return eventDateOnly.getTime() === today.getTime();
      case 'tomorrow':
        return eventDateOnly.getTime() === tomorrow.getTime();
      case 'this-week':
        return eventDateOnly >= today && eventDateOnly <= weekEnd;
      case 'this-month':
        return eventDateOnly >= today && eventDateOnly <= monthEnd;
      case 'next-week':
        const nextWeekStart = new Date(weekEnd);
        nextWeekStart.setDate(nextWeekStart.getDate() + 1);
        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
        return eventDateOnly >= nextWeekStart && eventDateOnly <= nextWeekEnd;
      case 'next-month':
        const nextMonthStart = new Date(monthEnd);
        nextMonthStart.setDate(nextMonthStart.getDate() + 1);
        const nextMonthEnd = new Date(nextMonthStart);
        nextMonthEnd.setMonth(nextMonthEnd.getMonth() + 1);
        return eventDateOnly >= nextMonthStart && eventDateOnly <= nextMonthEnd;
      case 'weekend':
        const dayOfWeek = eventDateOnly.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6;
      case 'evening':
        return eventDate.getHours() >= 17;
      case 'morning':
        return eventDate.getHours() < 12;
      default:
        return true;
    }
  });
};

/**
 * Search and filter events based on user intent
 */
export const searchEventsByIntent = async (intent) => {
  let results = [];

  // If category is detected, fetch by category
  if (intent.category) {
    results = await getEventsByCategory(intent.category);
  } else {
    // Otherwise get trending events
    results = await getTrendingEvents();
    
    // If trending only returns partial data, try to enrich it
    if (results.length > 0 && !results[0].title) {
      // Trending returned only ids, need to fetch full data
      console.log('Trending returned partial data, attempting to fetch full details...');
      // For now, return what we have
    }
  }

  // Remove items with missing critical data (no title at all)
  results = results.filter(e => e && e.title);

  // Filter by price if detected
  if (intent.priceRange && results.length > 0) {
    results = results.filter(event => {
      const price = parsePrice(event.price);
      return price >= intent.priceRange.min && price <= intent.priceRange.max;
    });
  }

  // Filter by time if detected
  if (intent.timeRange) {
    results = filterEventsByTime(results, intent.timeRange);
  }

  // Filter by location if detected
  if (intent.location) {
    results = filterEventsByLocation(results, intent.location);
  }

  // Filter by keywords (accent-insensitive match in title/description)
  if (intent.keywords && intent.keywords.length > 0) {
    const normalizedKeywords = intent.keywords.map(normalizeForSearch).filter(Boolean);
    results = results.filter(event => {
      const titleNorm = normalizeForSearch(event.title);
      const subtitleNorm = normalizeForSearch(event.subtitle);
      return normalizedKeywords.some((kw) => titleNorm.includes(kw) || subtitleNorm.includes(kw));
    });
  }

  if (intent.requestedTitle) {
    const normalizedTitle = normalizeForSearch(intent.requestedTitle);
    results = results.filter(event =>
      normalizeForSearch(event.title).includes(normalizedTitle)
    );
  }

  if (intent.requestedDate) {
    results = results.filter(event => matchesRequestedDate(event, intent.requestedDate));
  }

  if (intent.requestedMonth) {
    results = results.filter(event => matchesRequestedMonth(event, intent.requestedMonth));
  }

  if (intent.requestedRange) {
    results = results.filter(event => matchesRequestedRange(event, intent.requestedRange));
  }

  // Score and sort by relevance so the first item is the best match
  results = results
    .map(event => {
      const { score, reasons } = scoreEventMatch(event, intent);
      return { ...event, _matchScore: score, _matchReasons: reasons };
    })
    .sort((a, b) => (b._matchScore || 0) - (a._matchScore || 0));

  return results;
};

/**
 * Parse price string to number (handles k, K suffixes)
 */
const parsePrice = (priceStr) => {
  if (!priceStr || priceStr === 'TBA') return 0;
  if (typeof priceStr === 'number') return priceStr;
  
  const match = priceStr.toString().match(/\d+/);
  return match ? parseInt(match[0]) * (priceStr.toString().includes('k') || priceStr.toString().includes('K') ? 1000 : 1) : 0;
};

/**
 * Format event details for display
 */
const formatEventDetails = (event, index) => {
  // Handle both normalized and raw event data
  const title = event.title || 'Untitled Event';
  const date = event.date_start || event.start_time || event._original?.date_start || event._original?.start_time || 'TBA';
  const location = event.location || 'TBA';
  const price = event.price !== undefined ? event.price : 'TBA';
  const displayDate = formatEventDateDisplay(date);
  
  return {
    rank: index + 1,
    title,
    date: displayDate,
    location,
    price: formatPrice(price),
    formatted: `**${index + 1}. ${title}**\n📅 ${displayDate} • 📍 ${location} • 💰 ${formatPrice(price)}`,
  };
};

/**
 * Format price for display
 */
const formatPrice = (price) => {
  if (price === 'TBA' || price === undefined || price === null) return 'TBA';
  if (typeof price === 'string' && price === '0') return 'Miễn phí';
  if (typeof price === 'number' && price === 0) return 'Miễn phí';
  if (typeof price === 'number' && price > 0) {
    return price >= 1000000 ? `${(price / 1000000).toFixed(1)}M` : 
           price >= 1000 ? `${(price / 1000).toFixed(0)}k` : 
           `${price}đ`;
  }
  return price;
};

/**
 * Compute a lightweight relevance score and human-friendly reasons
 * used both for ranking and for crafting the explanation.
 */
const scoreEventMatch = (event, intent) => {
  let score = 0;
  const reasons = [];

  const normalize = (value) => normalizeForSearch(value);
  const eventCategory = normalize(event.category || event._original?.category || event._original?.category_id);
  const eventLocation = normalize(event.location || event._original?.location);
  const descriptionBlob = normalize(
    `${event.title || ''} ${event.subtitle || ''} ${event._original?.description || ''}`
  );

  if (intent.requestedTitle) {
    const intentTitle = normalize(intent.requestedTitle);
    if (normalize(event.title).includes(intentTitle)) {
      score += 50;
      reasons.push(`Tiêu đề trùng với yêu cầu "${intent.requestedTitle}".`);
    }
  }

  if (intent.requestedDate && matchesRequestedDate(event, intent.requestedDate)) {
    score += 25;
    reasons.push(`Diễn ra đúng ngày ${formatRequestedDate(intent.requestedDate)} mà bạn nêu.`);
  }

  if (intent.requestedMonth && matchesRequestedMonth(event, intent.requestedMonth)) {
    score += 20;
    reasons.push(`Diễn ra trong tháng ${intent.requestedMonth.month}/${intent.requestedMonth.year} theo yêu cầu.`);
  }

  if (intent.category) {
    const intentCategory = normalize(intent.category);
    if (eventCategory.includes(intentCategory)) {
      score += 40;
      reasons.push(`Thuộc thể loại **${intent.category}** mà bạn quan tâm.`);
    }
  }

  if (intent.location && intent.location !== 'near-me') {
    const intentLocation = normalize(intent.location);
    if (eventLocation.includes(intentLocation)) {
      score += 30;
      reasons.push(`Diễn ra tại **${intent.location}** đúng như bạn yêu cầu.`);
    }
  }

  if (intent.keywords && intent.keywords.length > 0) {
    const normalizedKeywords = intent.keywords.map((kw) => ({
      raw: kw,
      normalized: normalize(kw),
    }));
    const matchedKeyword = normalizedKeywords.find(({ normalized }) => descriptionBlob.includes(normalized));
    if (matchedKeyword) {
      score += 20;
      reasons.push(`Nội dung sự kiện nhắc đến "${matchedKeyword.raw}".`);
    }
  }

  if (intent.priceRange) {
    const price = parsePrice(event.price);
    if (price >= intent.priceRange.min && price <= intent.priceRange.max) {
      score += 10;
      if (intent.priceRange.max === 0) {
        reasons.push('Hoàn toàn miễn phí, đúng mong muốn của bạn.');
      } else if (intent.priceRange.max <= 500000) {
        reasons.push('Chi phí dễ chịu, phù hợp ngân sách bạn đặt ra.');
      } else {
        reasons.push('Mức giá tương xứng với trải nghiệm cao cấp bạn tìm kiếm.');
      }
    }
  }

  if (intent.timeRange) {
    score += 5; // đã qua bộ lọc thời gian, thưởng thêm chút điểm
    const timeLabel = {
      'today': 'hôm nay',
      'tomorrow': 'ngày mai',
      'this-week': 'tuần này',
      'this-month': 'tháng này',
      'next-week': 'tuần tới',
      'next-month': 'tháng tới',
      'weekend': 'cuối tuần',
      'evening': 'buổi tối',
      'morning': 'buổi sáng',
    };
    reasons.push(`Diễn ra vào ${timeLabel[intent.timeRange] || intent.timeRange}.`);
  }

  // Favor events with visuals/price info to keep recommendation enticing
  if (event.image && event.image !== '/placeholder.jpg') score += 3;
  if (event.price !== undefined && event.price !== 'TBA') score += 2;

  return { score, reasons };
};

const extractExplicitDate = (message) => {
  const dateRegex = /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/;
  const match = message.match(dateRegex);
  if (!match) return null;

  let day = parseInt(match[1], 10);
  let month = parseInt(match[2], 10);
  let year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();

  if (year < 100) {
    year += 2000;
  }

  if (day > 31 || month > 12) {
    // swap if user wrote month/day
    if (month <= 31 && day <= 12) {
      [day, month] = [month, day];
    } else {
      return null;
    }
  }

  return { day, month, year };
};

const extractRequestedMonth = (lowerMsg, normalizedMsg) => {
  // Support forms: "tháng 12", "thang 12", "thg 12", "th 12", "month 12", optionally followed by year
  const numericRegex = /(?:tháng|thang|thg|th|month)\s*(\d{1,2})(?:\s*(?:năm|nam|year)?\s*(\d{2,4}))?/i;
  const numericMatch = lowerMsg.match(numericRegex);
  if (numericMatch) {
    const monthNum = parseInt(numericMatch[1], 10);
    const year = parseYearValue(numericMatch[2]);
    const resolved = resolveRequestedMonth(monthNum, year);
    if (resolved) return resolved;
  }

  const monthKeywordPatterns = [
    { keyword: 'thang muoi hai', month: 12 },
    { keyword: 'thang muoi mot', month: 11 },
    { keyword: 'thang muoi', month: 10 },
    { keyword: 'thang chin', month: 9 },
    { keyword: 'thang tam', month: 8 },
    { keyword: 'thang bay', month: 7 },
    { keyword: 'thang sau', month: 6 },
    { keyword: 'thang nam', month: 5 },
    { keyword: 'thang bon', month: 4 },
    { keyword: 'thang tu', month: 4 },
    { keyword: 'thang ba', month: 3 },
    { keyword: 'thang hai', month: 2 },
    { keyword: 'thang mot', month: 1 },
    { keyword: 'thang gieng', month: 1 },
    { keyword: 'december', month: 12 },
    { keyword: 'november', month: 11 },
    { keyword: 'october', month: 10 },
    { keyword: 'september', month: 9 },
    { keyword: 'august', month: 8 },
    { keyword: 'july', month: 7 },
    { keyword: 'june', month: 6 },
    { keyword: 'may', month: 5 },
    { keyword: 'april', month: 4 },
    { keyword: 'march', month: 3 },
    { keyword: 'february', month: 2 },
    { keyword: 'january', month: 1 },
    { keyword: 'jan ', month: 1 },
    { keyword: 'feb ', month: 2 },
    { keyword: 'mar ', month: 3 },
    { keyword: 'apr ', month: 4 },
    { keyword: 'jun ', month: 6 },
    { keyword: 'jul ', month: 7 },
    { keyword: 'aug ', month: 8 },
    { keyword: 'sep ', month: 9 },
    { keyword: 'oct ', month: 10 },
    { keyword: 'nov ', month: 11 },
    { keyword: 'dec ', month: 12 },
  ];

  for (const entry of monthKeywordPatterns) {
    if (normalizedMsg.includes(entry.keyword)) {
      const year = extractYearNearKeyword(normalizedMsg, entry.keyword);
      const resolved = resolveRequestedMonth(entry.month, year);
      if (resolved) return resolved;
    }
  }

  return null;
};

const extractYearNearKeyword = (normalizedMsg, keyword) => {
  const index = normalizedMsg.indexOf(keyword);
  if (index < 0) return null;
  const searchWindow = normalizedMsg.slice(index, index + keyword.length + 20);
  const match = searchWindow.match(/(?:nam|year)\s*(\d{2,4})/);
  if (match) return parseYearValue(match[1]);

  const fallback = normalizedMsg.match(/(?:nam|year)\s*(\d{2,4})/);
  return fallback ? parseYearValue(fallback[1]) : null;
};

const parseYearValue = (yearStr) => {
  if (!yearStr) return null;
  let year = parseInt(yearStr, 10);
  if (Number.isNaN(year)) return null;
  if (year < 100) {
    year += 2000;
  }
  return year;
};

const resolveRequestedMonth = (monthNum, explicitYear) => {
  if (!monthNum || monthNum < 1 || monthNum > 12) return null;
  const now = new Date();
  let year = explicitYear ?? now.getFullYear();

  if (!explicitYear && monthNum < (now.getMonth() + 1)) {
    year += 1;
  }

  return { month: monthNum, year };
};

const matchesRequestedDate = (event, requestedDate) => {
  if (!requestedDate) return true;
  const rawDate = event?.date_start || event?._original?.date_start || event?.start_time;
  if (!rawDate) return false;

  const eventDate = parseLooseDate(rawDate);
  if (!eventDate) return false;

  return (
    eventDate.getDate() === requestedDate.day &&
    eventDate.getMonth() + 1 === requestedDate.month &&
    eventDate.getFullYear() === requestedDate.year
  );
};

const matchesRequestedMonth = (event, requestedMonth) => {
  if (!requestedMonth) return true;
  const rawDate = event?.date_start || event?._original?.date_start || event?.start_time;
  if (!rawDate) return false;

  const eventDate = parseLooseDate(rawDate);
  if (!eventDate) return false;

  return (
    eventDate.getMonth() + 1 === requestedMonth.month &&
    eventDate.getFullYear() === requestedMonth.year
  );
};

const formatRequestedDate = (requestedDate) => {
  if (!requestedDate) return '';
  const { day, month, year } = requestedDate;
  return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
};

/**
 * Generate AI-like response based on search results with improved formatting
 */
export const generateSearchResponse = (intent, results) => {
  if (results.length === 0) {
    const noResultsPhrases = [
      `Rất tiếc, mình không tìm thấy sự kiện nào khớp với yêu cầu của bạn.`,
      `Mình đã tìm kiếm kỹ nhưng chưa thấy sự kiện nào phù hợp.`,
      `Có vẻ như hiện chưa có sự kiện nào khớp với tiêu chí bạn đưa ra.`
    ];
    
    let suggestion = noResultsPhrases[Math.floor(Math.random() * noResultsPhrases.length)] + ' ';
    let suggestions = [];

    if (intent.category) {
      const categoryPhrases = [
        `Bạn có muốn thử tìm các sự kiện ${intent.category} khác không?`,
        `Có thể thử tìm kiếm rộng hơn cho thể loại ${intent.category}?`,
        `Mình có thể gợi ý một số sự kiện ${intent.category} thú vị khác.`
      ];
      suggestion += categoryPhrases[Math.floor(Math.random() * categoryPhrases.length)];
      suggestions = ['Xem sự kiện thịnh hành', `Tìm kiếm khác về ${intent.category}`];
    } else if (intent.timeRange) {
      const timePhrases = [
        `Bạn có muốn thử tìm vào khoảng thời gian khác không?`,
        `Mình có thể tìm kiếm trong khoảng thời gian khác nếu bạn muốn.`,
        `Hãy thử một mốc thời gian khác xem sao nhé!`
      ];
      suggestion += timePhrases[Math.floor(Math.random() * timePhrases.length)];
      suggestions = ['Sự kiện tuần này', 'Sự kiện cuối tuần', 'Sự kiện tháng tới'];
    } else {
      const defaultPhrases = [
        `Bạn muốn xem các sự kiện thịnh hành không?`,
        `Mình có thể gợi ý một số sự kiện nổi bật nếu bạn muốn.`,
        `Bạn quan tâm đến thể loại sự kiện nào? Mình sẽ tìm giúp bạn nhé!`
      ];
      suggestion += defaultPhrases[Math.floor(Math.random() * defaultPhrases.length)];
      suggestions = ['Sự kiện thịnh hành', 'Sự kiện miễn phí', 'Sự kiện sắp diễn ra'];
    }

    // remove duplicates while preserving order
    suggestions = Array.from(new Set(suggestions));

    return {
      message: suggestion,
      events: [],
      suggestions,
    };
  }

  // Build intro message describing applied filters with natural language
  let intro = '';
  const filters = [];
  const filterPhrases = [];

  if (intent.category) {
    const categoryPhrases = [
      `sự kiện ${intent.category}`,
      `các hoạt động ${intent.category}`,
      `những chương trình ${intent.category}`
    ];
    filters.push(`**${intent.category}**`);
    filterPhrases.push(categoryPhrases[Math.floor(Math.random() * categoryPhrases.length)]);
  }

  if (intent.timeRange) {
    const timeLabel = {
      'today': { phrases: ['hôm nay', 'trong ngày hôm nay', 'hôm nay'] },
      'tomorrow': { phrases: ['ngày mai', 'vào ngày mai', 'chiều mai'] },
      'this-week': { phrases: ['tuần này', 'trong tuần này', 'đầu tuần này'] },
      'this-month': { phrases: ['tháng này', 'trong tháng này', 'đầu tháng này'] },
      'next-week': { phrases: ['tuần sau', 'tuần tới', 'đầu tuần sau'] },
      'next-month': { phrases: ['tháng sau', 'đầu tháng sau', 'tháng tới'] },
      'weekend': { phrases: ['cuối tuần này', 'ngày nghỉ cuối tuần', 'thứ 7, chủ nhật này'] },
      'evening': { phrases: ['tối nay', 'buổi tối', 'tối hôm nay'] },
      'morning': { phrases: ['sáng mai', 'buổi sáng', 'sáng sớm'] },
    };
    
    const timeOptions = timeLabel[intent.timeRange] || { phrases: [intent.timeRange] };
    const timePhrase = timeOptions.phrases[Math.floor(Math.random() * timeOptions.phrases.length)];
    
    filters.push(timePhrase);
    filterPhrases.push(timePhrase);
  }

  if (intent.location && intent.location !== 'near-me') {
    const locationPhrases = [
      `tại ${intent.location}`,
      `ở khu vực ${intent.location}`,
      `quanh khu ${intent.location}`
    ];
    filters.push(intent.location);
    filterPhrases.push(locationPhrases[Math.floor(Math.random() * locationPhrases.length)]);
  }

  if (intent.priceRange) {
    if (intent.priceRange.max === 0) {
      const freePhrases = ['miễn phí', 'không mất phí', 'hoàn toàn miễn phí'];
      filters.push('**miễn phí**');
      filterPhrases.push(freePhrases[Math.floor(Math.random() * freePhrases.length)]);
    } else if (intent.priceRange.max < 500000) {
      const cheapPhrases = ['giá bình dân', 'dưới 500k', 'giá rẻ'];
      filters.push('**dưới 500k**');
      filterPhrases.push(cheapPhrases[Math.floor(Math.random() * cheapPhrases.length)]);
    }
  }

  if (intent.requestedTitle) {
    const titlePhrases = [
      `có tiêu đề "${intent.requestedTitle}"`,
      `với tên gọi "${intent.requestedTitle}"`,
      `liên quan đến "${intent.requestedTitle}"`
    ];
    filterPhrases.push(titlePhrases[Math.floor(Math.random() * titlePhrases.length)]);
  }

  if (intent.requestedDate) {
    const datePhrases = [
      `vào ngày ${formatRequestedDate(intent.requestedDate)}`,
      `diễn ra ngày ${formatRequestedDate(intent.requestedDate)}`,
      `tổ chức vào ${formatRequestedDate(intent.requestedDate)}`
    ];
    filterPhrases.push(datePhrases[Math.floor(Math.random() * datePhrases.length)]);
  }

  if (intent.requestedMonth) {
    const monthPhrases = [
      `trong tháng ${intent.requestedMonth.month}/${intent.requestedMonth.year}`,
      `diễn ra tháng ${intent.requestedMonth.month} năm ${intent.requestedMonth.year}`,
      `tổ chức vào tháng ${intent.requestedMonth.month}`
    ];
    filterPhrases.push(monthPhrases[Math.floor(Math.random() * monthPhrases.length)]);
  }

  if (intent.requestedRangeLabel) {
    filterPhrases.push(intent.requestedRangeLabel);
  }

  const introPhrases = [
    `Mình đã tìm thấy ${results.length} sự kiện ${filterPhrases.join(', ')} phù hợp với bạn.`,
    `Đây là ${results.length} sự kiện ${filterPhrases.join(', ')} mà mình nghĩ bạn sẽ thích.`,
    `Mình gợi ý ${results.length} sự kiện ${filterPhrases.join(', ')} thú vị.`,
    `Sau khi tìm hiểu, mình thấy ${results.length} sự kiện ${filterPhrases.join(', ')} rất đáng để tham gia.`
  ];

  if (filters.length > 0) {
    intro = `${introPhrases[Math.floor(Math.random() * introPhrases.length)]}\n\n`;
  } else if (intent.keywords.length > 0) {
    const keywordPhrases = [
      `Mình tìm thấy một số sự kiện liên quan đến "${intent.keywords[0]}" cho bạn.`,
      `Đây là các sự kiện về chủ đề "${intent.keywords[0]}" mà bạn quan tâm.`,
      `Mình đã chọn lọc các sự kiện liên quan đến "${intent.keywords[0]}" cho bạn.`
    ];
    intro = `${keywordPhrases[Math.floor(Math.random() * keywordPhrases.length)]}\n\n`;
  } else {
    const defaultPhrases = [
      'Mình đã chọn ra những sự kiện phù hợp nhất dành cho bạn.',
      'Sau khi tìm hiểu, đây là những sự kiện thú vị mình muốn giới thiệu.',
      'Mình đã tìm thấy một số sự kiện có thể bạn sẽ quan tâm.'
    ];
    intro = `${defaultPhrases[Math.floor(Math.random() * defaultPhrases.length)]}\n\n`;
  }

  // If user asked for 'near me', propose a set of canonical campus/location choices
  if (intent.location === 'near-me') {
    const canonicalCampuses = [
      { name: 'Hà Nội', variants: ['hà nội', 'hanoi'] },
      { name: 'Hồ Chí Minh', variants: ['sài gòn', 'saigon', 'ho chi minh', 'hcm'] },
      { name: 'Đà Nẵng', variants: ['đà nẵng', 'danang'] },
      { name: 'Cần Thơ', variants: ['cần thơ', 'can tho'] },
      { name: 'Quy Nhơn', variants: ['quy nhơn', 'quy nhon'] },
    ];

    const counts = {};
    for (const c of canonicalCampuses) counts[c.name] = 0;

    const lowerLoc = (loc) => (loc || '').toString().toLowerCase();
    for (const ev of results) {
      const loc = lowerLoc(ev.location || ev._original?.location || '');
      for (const c of canonicalCampuses) {
        if (c.variants.some(v => loc.includes(v))) {
          counts[c.name] = (counts[c.name] || 0) + 1;
          break;
        }
      }
    }

    const campusSuggestions = canonicalCampuses.map(c => {
      const cnt = counts[c.name] || 0;
      return cnt > 0 ? `${c.name} (${cnt})` : c.name;
    });

    const message = `Tôi tìm thấy **${results.length}** sự kiện xung quanh bạn. Hãy chọn cơ sở bạn muốn xem:`;
    const suggestions = ['Xem sự kiện thịnh hành', ...campusSuggestions];

    return {
      message,
      events: [], // don't attach full event list yet — user will pick a campus
      suggestions: Array.from(new Set(suggestions)),
    };
  }

  const picks = results.slice(0, Math.min(3, results.length));
  const lines = picks.map((ev, idx) => {
    const d = formatEventDetails(ev, idx);
    const reasons = (ev._matchReasons || []).slice(0, 2).map(r => `   • ${r}`).join('  \n');
    const headerEmojis = ['🌟', '✨', '🎯'];
    const header = `${headerEmojis[idx % headerEmojis.length]} **${idx + 1}. ${d.title}**`;
    let block = `${header}  \n📅 ${d.date}  \n📍 ${d.location}  \n💰 ${d.price}`;
    if (reasons) {
      block += `  \nVì sao phù hợp:  \n${reasons}`;
    }
    return block;
  });

  let messageBody = lines.join('\n\n---\n\n');

  // More natural call-to-action
  const ctas = [
    '\n\n---\n✨ **Xem ngay** để không bỏ lỡ sự kiện thú vị này nhé!',
    '\n\n---\n💫 **Đừng bỏ lỡ** cơ hội tham gia sự kiện đặc biệt này!',
    '\n\n---\n🎯 **Đăng ký ngay** để giữ chỗ cho mình nhé!' 
  ];
  
  const tips = [
    '💡 Bạn có thể hỏi mình thêm về bất kỳ sự kiện nào nhé!',
    '💡 Cần tìm sự kiện khác? Cứ nói mình biết thể loại, địa điểm hoặc ngân sách nhé!',
    '💡 Muốn tìm sự kiện khác? Hãy cho mình biết thêm thông tin bạn cần nhé!'
  ];
  
  const footer = `\n\n---\n${ctas[Math.floor(Math.random() * ctas.length)]}\n${tips[Math.floor(Math.random() * tips.length)]}`;

  // More contextual and natural suggestions
  let suggestions = [];
  
  // Always include trending events
  suggestions.push('Sự kiện thịnh hành');
  
  // Add category-specific suggestions
  if (intent.category) {
    const categorySuggestions = [
      `Xem thêm ${intent.category}`,
      `${intent.category} khác`,
      `Các sự kiện ${intent.category} mới nhất`
    ];
    suggestions.push(categorySuggestions[Math.floor(Math.random() * categorySuggestions.length)]);
  } else {
    suggestions.push('Tìm theo thể loại');
  }
  
  // Add location-based suggestions if available
  if (intent.location && intent.location !== 'near-me') {
    suggestions.push(`Sự kiện tại ${intent.location}`);
  }
  
  // Add price-based suggestions
  if (intent.priceRange) {
    if (intent.priceRange.max === 0) {
      suggestions.push('Sự kiện miễn phí');
    } else if (intent.priceRange.max < 500000) {
      suggestions.push('Sự kiện giá rẻ');
    }
  }

  suggestions = Array.from(new Set(suggestions));

  return {
    message: intro + messageBody + footer,
    events: picks,
    suggestions,
  };
};

/**
 * Utility to rank arbitrary event JSON (e.g., from a prompt) and return a reasoning-enriched JSON array.
 * Accepts either an array of event objects or a JSON string and returns a JSON string
 * that includes a "reasoning" field as requested by AI workflows.
 */
export const filterEventsWithReasoning = ({ events, userQuery = '', maxResults = 3 } = {}) => {
  const parsedEvents = Array.isArray(events)
    ? events
    : typeof events === 'string'
      ? safelyParseEvents(events)
      : [];

  if (!parsedEvents || parsedEvents.length === 0) {
    return JSON.stringify([]);
  }

  const intent = parseSearchIntent(userQuery || '');
  const ranked = parsedEvents
    .map((event) => rankSingleEvent(event, intent))
    .filter(Boolean)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, Math.max(1, maxResults));

  const enriched = ranked.map(({ original, reasoning }) => {
    const clone = cloneEvent(original);
    clone.reasoning = reasoning;
    return clone;
  });

  return JSON.stringify(enriched, null, 2);
};

/**
 * Helper used by filterEventsWithReasoning
 */
const safelyParseEvents = (eventsString) => {
  try {
    const parsed = JSON.parse(eventsString);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Unable to parse events JSON for AI filtering', err);
    return [];
  }
};

const cloneEvent = (event) => {
  try {
    return JSON.parse(JSON.stringify(event));
  } catch {
    // shallow copy fallback
    return { ...event };
  }
};

const rankSingleEvent = (event, intent) => {
  const normalized = normalizeEventData(event);
  if (!normalized) return null;

  const base = scoreEventMatch(normalized, intent);
  const freshness = scoreEventFreshness(normalized);

  const reasons = [
    ...(base.reasons || []),
    freshness.reason ? freshness.reason : null,
  ].filter(Boolean);

  const reasoning = buildReasoningSummary(reasons);

  return {
    original: event,
    score: (base.score || 0) + (freshness.bonus || 0),
    reasoning,
  };
};

const scoreEventFreshness = (event) => {
  const dateValue = event?.date_start || event?.start_time;
  if (!dateValue) return { bonus: 0 };

  const eventDate = parseLooseDate(dateValue);
  if (!eventDate) return { bonus: 0 };

  const now = new Date();
  const diffDays = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays < -1) {
    return { bonus: -25, reason: 'Đã diễn ra trước đó.' };
  }

  if (diffDays < 0) {
    return { bonus: -10, reason: 'Sắp kết thúc, bạn cần quyết định ngay.' };
  }

  if (diffDays <= 7) {
    return { bonus: 20 - diffDays * 2, reason: 'Diễn ra trong tuần tới, rất phù hợp để tham gia sớm.' };
  }

  if (diffDays <= 30) {
    return { bonus: 10, reason: 'Lên lịch trong tháng tới, kịp chuẩn bị.' };
  }

  return { bonus: 3, reason: 'Đã lên lịch trước, giúp bạn chủ động sắp xếp.' };
};

const buildReasoningSummary = (reasons) => {
  if (!reasons || reasons.length === 0) return 'Phù hợp với mô tả mà bạn cung cấp.';
  const sanitized = reasons
    .map((reason) => reason.replace(/\*\*/g, '').trim())
    .filter(Boolean);
  return sanitized.slice(0, 2).join(' ');
};

export function formatEventDateDisplay(value, locale = 'vi-VN') {
  const date = parseLooseDate(value);
  if (date) {
    try {
      return date.toLocaleString(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (err) {
      return date.toISOString();
    }
  }

  return typeof value === 'string' && value.trim().length > 0 ? value : 'TBA';
}

function parseLooseDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const str = value.toString().trim();
  if (!str) return null;

  const direct = Date.parse(str);
  if (!Number.isNaN(direct)) return new Date(direct);

  const dateMatch = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (!dateMatch) return null;

  let [, dayStr, monthStr, yearStr] = dateMatch;
  let day = parseInt(dayStr, 10);
  let month = parseInt(monthStr, 10);
  let year = parseInt(yearStr, 10);

  if (year < 100) year += 2000;

  if (day > 31 || month > 12) {
    if (month <= 31 && day <= 12) {
      [day, month] = [month, day];
    } else {
      return null;
    }
  }

  const timeMatch = str.match(/(\d{1,2}):(\d{2})/);
  const hours = timeMatch ? parseInt(timeMatch[1], 10) : 0;
  const minutes = timeMatch ? parseInt(timeMatch[2], 10) : 0;

  const date = new Date(year, month - 1, day, hours, minutes);
  return Number.isNaN(date.getTime()) ? null : date;
}

