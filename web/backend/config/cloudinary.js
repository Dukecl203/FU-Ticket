const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload base64 image to Cloudinary
 * @param {string} base64String - Base64 encoded image (with or without data:image prefix)
 * @param {string} folder - Folder name in Cloudinary (default: 'events')
 * @returns {Promise<string>} - Cloudinary URL
 */
async function uploadBase64Image(base64String, folder = 'events') {
  try {
    // Remove data:image prefix if present
    const base64Data = base64String.includes('base64,') 
      ? base64String.split('base64,')[1] 
      : base64String;
    
    const result = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${base64Data}`,
      {
        folder: folder,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 800, crop: 'limit' }, // Max dimensions
          { quality: 'auto' }, // Auto quality optimization
          { fetch_format: 'auto' } // Auto format (webp if supported)
        ]
      }
    );

    console.log(`✅ Image uploaded to Cloudinary: ${result.secure_url}`);
    return result.secure_url;
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error.message);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

/**
 * Delete image from Cloudinary
 * @param {string} imageUrl - Cloudinary URL
 * @returns {Promise<boolean>}
 */
async function deleteImage(imageUrl) {
  try {
    // Extract public_id from URL
    // Example: https://res.cloudinary.com/xxx/image/upload/v123/events/abc.jpg
    const parts = imageUrl.split('/');
    const filename = parts[parts.length - 1].split('.')[0];
    const folder = parts[parts.length - 2];
    const publicId = `${folder}/${filename}`;

    await cloudinary.uploader.destroy(publicId);
    console.log(`✅ Image deleted from Cloudinary: ${publicId}`);
    return true;
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error.message);
    return false;
  }
}

/**
 * Check if a URL is a Cloudinary URL
 * @param {string} url
 * @returns {boolean}
 */
function isCloudinaryUrl(url) {
  return url && url.includes('cloudinary.com');
}

/**
 * Check if a string is base64 encoded
 * @param {string} str
 * @returns {boolean}
 */
function isBase64Image(str) {
  return str && (str.startsWith('data:image') || str.startsWith('/9j/'));
}

/**
 * Process HTML content and convert all base64 images to Cloudinary URLs
 * @param {string} htmlContent - HTML string that may contain base64 images
 * @param {string} folder - Folder name in Cloudinary (default: 'events')
 * @returns {Promise<string>} - HTML with Cloudinary URLs
 */
async function processHtmlImages(htmlContent, folder = 'events') {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return htmlContent;
  }

  // Regular expression to find all img tags with base64 src
  const base64ImageRegex = /<img[^>]+src=["'](data:image\/[^"']+)["'][^>]*>/gi;
  const matches = [...htmlContent.matchAll(base64ImageRegex)];
  
  if (matches.length === 0) {
    return htmlContent; // No base64 images found
  }

  let processedHtml = htmlContent;
  const replacements = new Map(); // Track replacements to avoid duplicate uploads
  
  // Process each base64 image
  for (const match of matches) {
    const fullMatch = match[0];
    const base64Data = match[1];
    
    // Skip if we've already processed this exact image
    if (replacements.has(fullMatch)) {
      continue;
    }
    
    try {
      // Upload base64 image to Cloudinary
      const cloudinaryUrl = await uploadBase64Image(base64Data, folder);
      
      // Create replacement string
      const replacement = fullMatch.replace(base64Data, cloudinaryUrl);
      replacements.set(fullMatch, replacement);
      
      console.log(`✅ Converted base64 image to Cloudinary: ${cloudinaryUrl.substring(0, 50)}...`);
    } catch (error) {
      console.error(`⚠️  Failed to convert base64 image to Cloudinary:`, error.message);
      // Keep base64 if upload fails (graceful degradation)
      // Don't add to replacements map, so it stays as base64
    }
  }
  
  // Apply all replacements
  for (const [original, replacement] of replacements) {
    processedHtml = processedHtml.split(original).join(replacement);
  }
  
  return processedHtml;
}

module.exports = {
  cloudinary,
  uploadBase64Image,
  deleteImage,
  isCloudinaryUrl,
  isBase64Image,
  processHtmlImages
};

