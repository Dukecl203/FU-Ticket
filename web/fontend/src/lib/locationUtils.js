/**
 * Normalize location string to handle variations
 * Removes diacritics, converts to lowercase, removes special characters
 * 
 * @param {string} location - Location string to normalize
 * @returns {string} Normalized location string
 */
export const normalizeLocation = (location) => {
    if (!location) return "";

    return location
        .toLowerCase()
        .normalize("NFD") // Decompose Vietnamese characters
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
        .replace(/đ/g, "d") // Handle Vietnamese đ
        .replace(/[^a-z0-9]/g, "") // Remove all non-alphanumeric characters
        .trim();
};

/**
 * Location keywords for flexible matching
 * Maps normalized location keys to their various spelling/format variations
 * This handles Vietnamese diacritics, English spellings, abbreviations, etc.
 * 
 * Examples:
 * - "Hà Nội" matches "hanoi"
 * - "FPT University Hà Nội - Đường D1..." matches "hanoi" 
 * - "HCM" matches "hochiminh"
 */
export const locationKeywords = {
    "hanoi": ["hanoi", "hànội", "hà nội", "ha noi", "hanoicampus", "fpthanoi", "cosohanoi"],
    "hochiminh": ["hochiminh", "hồ chí minh", "ho chi minh", "hcm", "saigon", "sài gòn", "hochiminhcampus", "fpthcm", "cosohcm", "cososaigon"],
    "danang": ["danang", "đà nẵng", "da nang", "danangcampus", "fptdanang", "cosodanang"],
    "cantho": ["cantho", "cần thơ", "can tho", "canthocampus", "fptcantho", "cosocantho"],
    "quynhon": ["quynhon", "quy nhơn", "quy nhon", "quinhon", "quynhoncampus", "fptquynhon", "cosoquynhon"]
};

/**
 * Extract key location identifier from a location string
 * Returns the main city/campus name from a potentially long address
 * 
 * Example:
 * - Input: "FPT University Hà Nội - Đường D1, Khu CNC Hòa Lạc, Thạch Thất, Hà Nội"
 * - Output: "hanoi"
 * 
 * @param {string} location - Location string (can be full address)
 * @returns {string} Key location identifier (e.g., "hanoi", "hochiminh")
 */
export const extractLocationKey = (location) => {
    if (!location) return "";

    const normalized = normalizeLocation(location);

    // Check which key location this address contains
    // Iterates through all location keywords and their variations
    for (const [key, variations] of Object.entries(locationKeywords)) {
        for (const variation of variations) {
            const normalizedVariation = normalizeLocation(variation);
            if (normalized.includes(normalizedVariation)) {
                return key; // Return the key (e.g., "hanoi") when match found
            }
        }
    }

    // If no match found in predefined keywords, return the normalized location
    return normalized;
};

/**
 * Check if two locations match (case-insensitive, diacritic-insensitive)
 * 
 * @param {string} location1 - First location string
 * @param {string} location2 - Second location string
 * @returns {boolean} True if locations match
 */
export const locationsMatch = (location1, location2) => {
    const normalized1 = normalizeLocation(location1);
    const normalized2 = normalizeLocation(location2);

    return normalized1.includes(normalized2) || normalized2.includes(normalized1);
};

/**
 * Filter location name by checking if it contains the search term
 * Intelligently handles various formats and full addresses:
 * 
 * Examples that will match:
 * - Filter: "FPT University Hanoi Campus" 
 *   Event: "FPT University Hà Nội - Đường D1, Khu CNC Hòa Lạc..." ✓
 * 
 * - Filter: "Hà Nội"
 *   Event: "Trường Đại học FPT cơ sở Hà Nội" ✓
 * 
 * - Filter: "HCM"
 *   Event: "FPT University Hồ Chí Minh Campus" ✓
 * 
 * @param {string} eventLocation - The event's location (can be full address)
 * @param {string} filterLocation - The filter location to match
 * @returns {boolean} True if the location matches the filter
 */
export const matchLocation = (eventLocation, filterLocation) => {
    // Allow "all" to match everything
    if (!filterLocation || filterLocation.toLowerCase() === "all") {
        return true;
    }

    // Extract key location identifiers (e.g., "hanoi", "hochiminh")
    // This handles: "FPT University Hà Nội - Đường D1..." -> "hanoi"
    const eventLocationKey = extractLocationKey(eventLocation);
    const filterLocationKey = extractLocationKey(filterLocation);

    // If both resolved to the same known location key, they match
    // Example: both "Hà Nội" and "FPT Hanoi Campus" resolve to "hanoi"
    if (eventLocationKey === filterLocationKey) {
        return true;
    }

    // Fallback: check if normalized strings match directly
    // This handles edge cases and custom location names
    const normalizedEventLocation = normalizeLocation(eventLocation);
    const normalizedFilterLocation = normalizeLocation(filterLocation);

    return normalizedEventLocation.includes(normalizedFilterLocation) ||
        normalizedFilterLocation.includes(normalizedEventLocation);
};

