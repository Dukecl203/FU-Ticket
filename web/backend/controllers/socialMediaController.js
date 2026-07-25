const Users = require("../models/Users");
const axios = require("axios");

// Facebook API Configuration
const FACEBOOK_CONFIG = {
  apiVersion: "v18.0",
  baseUrl: "https://graph.facebook.com",
  // Request permissions to read user posts for stats (not for posting)
  // We'll use Share Dialog for posting, not API
  scope: "public_profile,user_posts,user_likes"
};

// Get Facebook OAuth URL
const getOAuthUrls = (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Check if we have Facebook API keys
    const hasFacebookKeys = process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET;

    // Debug logging
    console.log("Facebook API Keys Check:", {
      hasAppId: !!process.env.FACEBOOK_APP_ID,
      hasAppSecret: !!process.env.FACEBOOK_APP_SECRET,
      appIdLength: process.env.FACEBOOK_APP_ID?.length || 0,
      hasFacebookKeys: hasFacebookKeys
    });

    if (hasFacebookKeys) {
      const facebookUrl = {
        url: `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(`${baseUrl}/api/social/facebook/callback`)}&scope=${FACEBOOK_CONFIG.scope}&state=${req.user._id}`,
        platform: "facebook",
        isMock: false,
        note: "Real Facebook API - Connect to your Facebook account"
      };

      return res.json({
        success: true,
        data: { facebook: facebookUrl },
        message: "Facebook API ready"
      });
    } else {
      // Use mock connection for development
      const facebookUrl = {
        url: `${baseUrl}/api/social/mock-connect?platform=facebook&userId=${req.user._id}`,
        platform: "facebook",
        isMock: true,
        note: "Demo Mode - Add Facebook API keys for real integration"
      };

      return res.json({
        success: true,
        data: { facebook: facebookUrl },
        message: "Demo Mode - Add Facebook API keys for real integration"
      });
    }
  } catch (error) {
    console.error("Error getting OAuth URLs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get OAuth URLs",
      error: error.message
    });
  }
};

// Mock connection for development (no real API keys needed)
const mockConnect = async (req, res) => {
  try {
    const { platform, userId } = req.query;

    if (!platform) {
      return res.status(400).json({
        success: false,
        message: "Missing platform"
      });
    }

    // Check if we have real API keys (production mode)
    const isDevelopment = !process.env.FACEBOOK_APP_ID || process.env.NODE_ENV === 'development';

    if (isDevelopment) {
      // For development, update user connection status in database
      if (userId) {
        try {
          const updateData = {};

          // Add platform-specific mock data
          if (platform === 'facebook') {
            updateData['facebookTokens.pageId'] = 'mock_page_123';
            updateData['facebookTokens.accessToken'] = `mock_token_${Date.now()}`;
            updateData['facebookTokens.tokenExpiry'] = new Date(Date.now() + 86400000);
            updateData['facebookTokens.connected'] = true;
          } else if (platform === 'instagram') {
            updateData['socialMediaTokens.instagram.accountId'] = 'mock_account_456';
            updateData['socialMediaTokens.instagram.accessToken'] = `mock_token_${Date.now()}`;
            updateData['socialMediaTokens.instagram.tokenExpiry'] = new Date(Date.now() + 86400000);
            updateData['socialMediaTokens.instagram.connected'] = true;
          }

          const result = await Users.findByIdAndUpdate(userId, { $set: updateData }, { new: true });
          console.log(`✅ Updated user ${userId} with ${platform} connection (development)`);
          console.log(`Updated user data:`, {
            hasFacebookTokens: !!result?.facebookTokens,
            connected: result?.facebookTokens?.connected,
            hasAccessToken: !!result?.facebookTokens?.accessToken
          });
        } catch (dbError) {
          console.error(`❌ Could not update user ${userId}:`, dbError.message);
          console.error('DB Error details:', dbError);
        }
      } else {
        console.warn(`⚠️ No userId provided for ${platform} connection`);
      }
      console.log(`Mock connecting ${platform} for user ${userId || 'anonymous'}`);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/organizer?${platform}_connected=true&mock=true`);
    } else {
      // For production, try to update the user's connection status
      if (userId) {
        try {
          const updateData = {};

          // Add platform-specific mock data
          if (platform === 'facebook') {
            updateData['facebookTokens.pageId'] = 'mock_page_123';
            updateData['facebookTokens.accessToken'] = `mock_token_${Date.now()}`;
            updateData['facebookTokens.tokenExpiry'] = new Date(Date.now() + 86400000);
            updateData['facebookTokens.connected'] = true;
          } else if (platform === 'instagram') {
            updateData['socialMediaTokens.instagram.accountId'] = 'mock_account_456';
            updateData['socialMediaTokens.instagram.accessToken'] = `mock_token_${Date.now()}`;
            updateData['socialMediaTokens.instagram.tokenExpiry'] = new Date(Date.now() + 86400000);
            updateData['socialMediaTokens.instagram.connected'] = true;
          }

          await Users.findByIdAndUpdate(userId, { $set: updateData });
          console.log(`Updated user ${userId} with ${platform} connection`);
        } catch (dbError) {
          console.log(`Could not update user ${userId}:`, dbError.message);
        }
      }

      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/organizer?${platform}_connected=true&mock=true`);
    }
  } catch (error) {
    console.error("Mock connection error:", error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/organizer?error=mock_connection_failed`);
  }
};

// Generate Share Dialog URL (client-side sharing, not API posting)
const getShareDialogUrl = (eventUrl) => {
  // Facebook Share Dialog - just share the URL
  // User will type their own message in the Share Dialog
  const params = new URLSearchParams();
  params.append('u', eventUrl);
  
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
};

// Post to Facebook
const postToSocialMedia = async (req, res) => {
  try {
    const { content, imageUrl, eventId } = req.body;
    const userId = req.user._id;

    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check if user has Facebook connection
    if (!user.facebookTokens?.connected || !user.facebookTokens?.accessToken) {
      return res.status(400).json({
        success: false,
        message: "Facebook chưa được kết nối. Vui lòng kết nối Facebook trước."
      });
    }

    // Check if we have Facebook API keys and if user has real connection (not mock)
    const hasFacebookKeys = process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET;
    const isMockConnection = user.facebookTokens.accessToken?.startsWith('mock_token_');

    // Always use real API if connected (no fallback to mock)
    if (!hasFacebookKeys) {
      return res.status(400).json({
        success: false,
        message: "Facebook API keys not configured. Please set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in backend/.env"
      });
    }

    if (isMockConnection) {
      return res.status(400).json({
        success: false,
        message: "Mock connection detected. Please reconnect Facebook with real credentials."
      });
    }

    if (!user.facebookTokens.accessToken) {
      return res.status(400).json({
        success: false,
        message: "Facebook not connected. Please connect your Facebook account first."
      });
    }

    // Generate Share Dialog URL (user will share manually)
    const eventUrl = eventId 
      ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/event/${eventId}`
      : `${process.env.FRONTEND_URL || 'http://localhost:5173'}`;

    // Build share URL (no content - user will type in Share Dialog)
    const shareUrl = getShareDialogUrl(eventUrl);

    res.json({
      success: true,
      data: {
        platform: 'facebook',
        shareUrl: shareUrl,
        eventUrl: eventUrl,
        method: 'share_dialog'
      },
      message: "Share Dialog URL generated",
      isMock: false
    });
  } catch (error) {
    console.error("Facebook posting error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to post to Facebook",
      error: error.message
    });
  }
};

// Get Facebook statistics
// Get stats from user's posts (using user_posts permission)
const getSocialMediaStats = async (req, res) => {
  try {
    const { postUrl } = req.query; // Get URL to find matching post (can be event URL or Facebook post URL)
    const userId = req.user._id;

    console.log(`\n🔍 getSocialMediaStats called`);
    console.log(`   Post URL: ${postUrl}`);
    console.log(`   User ID: ${userId}`);

    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!user.facebookTokens?.accessToken) {
      return res.status(400).json({
        success: false,
        message: "Facebook not connected. Please connect your Facebook account first."
      });
    }

    console.log(`   Access token present: ${!!user.facebookTokens.accessToken}`);
    console.log(`   Access token length: ${user.facebookTokens.accessToken?.length || 0}`);

    let stats = { likes: 0, comments: 0, shares: 0, views: 0 };
    
    // Check if postUrl is a direct Facebook post URL
    // Supports both numeric IDs and pfbid format
    let directPostId = null;
    if (postUrl && postUrl.includes('facebook.com')) {
      try {
        console.log(`🔍 Analyzing Facebook URL: ${postUrl}`);
        
        // Pattern 1: https://www.facebook.com/{username}/posts/{pfbid} or {numeric_id}
        // Example: https://www.facebook.com/minh.uc.828393/posts/pfbid02YHDCKh7H456VcBNAiRnTMxWdUDtLedfkmYGafEdg8m5JDRC861tBhBbwSSCVC6yHl
        let urlMatch = postUrl.match(/facebook\.com\/[^\/]+\/posts\/([^\/\?]+)/);
        if (urlMatch && urlMatch[1]) {
          directPostId = urlMatch[1];
          console.log(`✅ Pattern 1 matched - Post ID: ${directPostId}`);
        } else {
          // Pattern 2: https://www.facebook.com/{username}/posts/{post_id} (numeric)
          urlMatch = postUrl.match(/facebook\.com\/[^\/]+\/posts\/(\d+)/);
          if (urlMatch && urlMatch[1]) {
            directPostId = urlMatch[1];
            console.log(`✅ Pattern 2 matched - Post ID: ${directPostId}`);
          } else {
            // Pattern 3: Direct numeric post ID
            urlMatch = postUrl.match(/facebook\.com\/(\d+)(?:\/|$|\?)/);
            if (urlMatch && urlMatch[1] && urlMatch[1].length > 10) {
              directPostId = urlMatch[1];
              console.log(`✅ Pattern 3 matched - Post ID: ${directPostId}`);
            } else {
              // Pattern 4: permalink.php with story_fbid
              urlMatch = postUrl.match(/story_fbid=([^&]+)/);
              if (urlMatch && urlMatch[1]) {
                directPostId = urlMatch[1];
                console.log(`✅ Pattern 4 matched - Post ID: ${directPostId}`);
              }
            }
          }
        }
        
        if (directPostId) {
          console.log(`🔗 Detected Facebook post ID from URL: ${directPostId}`);
        } else {
          console.log(`⚠️ Could not extract post ID from URL: ${postUrl}`);
        }
      } catch (e) {
        console.log(`⚠️ Error extracting post ID from URL: ${e.message}`);
      }
    }
    
    // If we have a direct post ID, try to fetch it directly
    if (directPostId) {
      try {
        console.log(`🔍 Attempting to fetch post directly by ID: ${directPostId}`);
        
        // Try to fetch with the extracted ID (could be numeric or pfbid)
        const postResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${directPostId}`,
          {
            params: {
              access_token: user.facebookTokens.accessToken,
              fields: 'id,message,link,created_time,likes.summary(true),comments.summary(true),shares'
            }
          }
        );
        
        const post = postResponse.data;
        console.log(`📝 Post data received:`, {
          id: post.id,
          hasLikes: !!post.likes,
          hasComments: !!post.comments,
          hasShares: !!post.shares,
          likesData: post.likes,
          commentsData: post.comments
        });
        
        // Extract stats from post data
        const likesCount = post.likes?.summary?.total_count || 
                          (Array.isArray(post.likes?.data) ? post.likes.data.length : 0) || 0;
        const commentsCount = post.comments?.summary?.total_count || 
                             (Array.isArray(post.comments?.data) ? post.comments.data.length : 0) || 0;
        const sharesCount = post.shares?.count || 0;
        
        stats = {
          likes: likesCount,
          comments: commentsCount,
          shares: sharesCount,
          views: 0,
          postId: post.id,
          postUrl: post.link || `https://www.facebook.com/${post.id}`
        };
        console.log(`✅ Found post directly by ID. Stats:`, stats);
        
        return res.json({
          success: true,
          data: stats
        });
      } catch (directError) {
        const errorDetails = directError.response?.data?.error || {};
        console.log(`⚠️ Could not fetch post directly by ID:`, {
          error: errorDetails.message || directError.message,
          errorType: errorDetails.type,
          errorCode: errorDetails.code,
          status: directError.response?.status,
          postId: directPostId,
          fullError: errorDetails
        });
        
        // If it's a pfbid and direct fetch failed, try to find it in user's posts
        if (directPostId.startsWith('pfbid')) {
          console.log(`💡 Post ID is pfbid format, will try to find in user's posts list`);
        }
        // Fall through to search method
      }
    }

    try {
      // Try multiple endpoints to find the post
      // 1. Try /me/posts first
      let posts = [];
      try {
        console.log(`📡 Calling Facebook API: /me/posts`);
        const postsResponse = await axios.get(
          `https://graph.facebook.com/v18.0/me/posts`,
          {
            params: {
              access_token: user.facebookTokens.accessToken,
              fields: 'id,message,link,created_time,likes.summary(true),comments.summary(true),shares',
              limit: 50 // Increase limit to get more posts
            }
          }
        );
        posts = postsResponse.data.data || [];
        console.log(`📝 Found ${posts.length} posts from /me/posts`);
        // Log first few posts for debugging
        if (posts.length > 0) {
          console.log(`   First post:`, {
            id: posts[0].id,
            hasLink: !!posts[0].link,
            link: posts[0].link,
            hasMessage: !!posts[0].message,
            messagePreview: posts[0].message?.substring(0, 50),
            created: posts[0].created_time
          });
        }
      } catch (postsError) {
        console.log("⚠️ /me/posts failed, trying /me/feed:", postsError.response?.data?.error?.message || postsError.message);
      }

      // 2. If no posts found or postUrl provided, try /me/feed
      if (posts.length === 0 || postUrl) {
        try {
          console.log(`📡 Calling Facebook API: /me/feed`);
          const feedResponse = await axios.get(
            `https://graph.facebook.com/v18.0/me/feed`,
            {
              params: {
                access_token: user.facebookTokens.accessToken,
                fields: 'id,message,link,created_time,likes.summary(true),comments.summary(true),shares',
                limit: 50 // Increase limit
              }
            }
          );
          const feedPosts = feedResponse.data.data || [];
          console.log(`📝 Found ${feedPosts.length} posts from /me/feed`);
          // Merge with posts from /me/posts (avoid duplicates)
          const existingIds = new Set(posts.map(p => p.id));
          posts = [...posts, ...feedPosts.filter(p => !existingIds.has(p.id))];
        } catch (feedError) {
          console.log("⚠️ /me/feed failed:", feedError.response?.data?.error?.message || feedError.message);
        }
      }

      // Sort posts by created_time (newest first)
      posts.sort((a, b) => {
        const timeA = new Date(a.created_time || 0).getTime();
        const timeB = new Date(b.created_time || 0).getTime();
        return timeB - timeA;
      });

      console.log(`📊 Total posts found: ${posts.length}`);
      if (posts.length > 0) {
        console.log(`📅 Most recent post: ${posts[0].created_time}, ID: ${posts[0].id}`);
        console.log(`   Recent posts details (first 5):`);
        posts.slice(0, 5).forEach((p, idx) => {
          console.log(`   ${idx + 1}. ID: ${p.id}, Created: ${p.created_time}`);
          console.log(`      Link: ${p.link || 'no link'}`);
          console.log(`      Message: ${p.message ? p.message.substring(0, 100) : 'no message'}`);
        });
      } else {
        console.log(`⚠️ No posts found at all. This could mean:`);
        console.log(`   1. User has no posts`);
        console.log(`   2. Posts are private and not accessible via API`);
        console.log(`   3. Permission issues with user_posts`);
      }
      
      // Try to find post by URL or use most recent
      if (postUrl) {
        // Extract pathname and pfbid from postUrl for matching
        let postUrlPath = '';
        let postUrlPfbid = null;
        try {
          const urlObj = new URL(postUrl);
          postUrlPath = urlObj.pathname;
          // Extract pfbid if present
          const pfbidMatch = postUrlPath.match(/posts\/(pfbid[^\/\?]+)/);
          if (pfbidMatch && pfbidMatch[1]) {
            postUrlPfbid = pfbidMatch[1];
            console.log(`🔍 Extracted pfbid from URL: ${postUrlPfbid}`);
          }
        } catch (e) {
          postUrlPath = postUrl;
        }

        // Find post that matches the URL exactly
        // Normalize URLs for comparison
        const normalizeUrl = (url) => {
          try {
            const urlObj = new URL(url);
            // Remove trailing slashes and normalize
            return urlObj.href.replace(/\/$/, '').toLowerCase();
          } catch (e) {
            return url.toLowerCase().replace(/\/$/, '');
          }
        };

        const normalizedPostUrl = normalizeUrl(postUrl);
        console.log(`🔍 Searching for post with URL: ${postUrl}`);
        console.log(`   Pathname: ${postUrlPath}`);
        console.log(`   Pfbid: ${postUrlPfbid || 'none'}`);
        
        const matchingPost = posts.find(post => {
          // Check both link and message fields
          const postLink = post.link || '';
          const postMessage = post.message || '';
          
          // Check if URL is in link field
          if (postLink) {
            const normalizedPostLink = normalizeUrl(postLink);
            
            // Exact match
            if (normalizedPostLink === normalizedPostUrl) {
              console.log(`   ✅ Exact match found in link!`);
              return true;
            }
            
            // Check if post URL contains event URL path or vice versa
            try {
              const postUrlObj = new URL(postUrl);
              const postLinkObj = new URL(postLink);
              
              // Match by pathname (e.g., /event/123)
              if (postLinkObj.pathname === postUrlObj.pathname) {
                console.log(`   ✅ Pathname match found in link!`);
                return true;
              }
              
              // Match if one URL contains the other's pathname
              if (postLinkObj.pathname.includes(postUrlObj.pathname) || 
                  postUrlObj.pathname.includes(postLinkObj.pathname)) {
                console.log(`   ✅ Pathname contains match found in link!`);
                return true;
              }
            } catch (e) {
              // If URL parsing fails, try string matching
              if (postLink.includes(postUrl) || postUrl.includes(postLink)) {
                console.log(`   ✅ String contains match found in link!`);
                return true;
              }
            }
          }
          
        // Check if URL is in message field (common for Share Dialog posts)
        if (postMessage && postMessage.includes(postUrl)) {
          console.log(`   ✅ URL found in message!`);
          return true;
        }
        
        // Also check if message contains the pathname
        try {
          const postUrlObj = new URL(postUrl);
          if (postMessage.includes(postUrlObj.pathname)) {
            console.log(`   ✅ Pathname found in message!`);
            return true;
          }
        } catch (e) {
          // Ignore
        }
        
        // Check if post URL contains pfbid from the search URL
        if (postUrlPfbid && postLink) {
          // Check if post link contains the same pfbid
          if (postLink.includes(postUrlPfbid)) {
            console.log(`   ✅ Pfbid match found in link!`);
            return true;
          }
          // Also check in pathname
          try {
            const postLinkObj = new URL(postLink);
            if (postLinkObj.pathname.includes(postUrlPfbid)) {
              console.log(`   ✅ Pfbid match found in pathname!`);
              return true;
            }
          } catch (e) {
            // Ignore
          }
        }
        
        // Check if post link matches the search URL pathname (for pfbid URLs)
        if (postUrlPath && postLink) {
          try {
            const postLinkObj = new URL(postLink);
            // Compare pathnames
            if (postLinkObj.pathname === postUrlPath) {
              console.log(`   ✅ Exact pathname match!`);
              return true;
            }
            // Check if one contains the other
            if (postLinkObj.pathname.includes(postUrlPath) || postUrlPath.includes(postLinkObj.pathname)) {
              console.log(`   ✅ Pathname contains match!`);
              return true;
            }
          } catch (e) {
            // If URL parsing fails, try string matching
            if (postLink.includes(postUrlPath) || postUrlPath.includes(postLink)) {
              console.log(`   ✅ String contains match!`);
              return true;
            }
          }
        }
        
        return false;
      });
        
        if (matchingPost) {
          const postId = matchingPost.id;
          const facebookPostUrl = `https://www.facebook.com/${postId}`;
          
          stats = {
            likes: matchingPost.likes?.summary?.total_count || matchingPost.likes?.data?.length || 0,
            comments: matchingPost.comments?.summary?.total_count || matchingPost.comments?.data?.length || 0,
            shares: matchingPost.shares?.count || 0,
            views: 0, // Facebook doesn't provide views for user posts
            postId: postId,
            postUrl: facebookPostUrl
          };
          console.log(`✅ Found matching post by URL. Stats:`, stats);
          console.log(`   Post ID: ${postId}`);
          console.log(`   Facebook Post URL: ${facebookPostUrl}`);
          console.log(`   Post Link: ${matchingPost.link}`);
          console.log(`   Searched URL: ${postUrl}`);
        } else {
          console.log(`⚠️ No matching post found for URL: ${postUrl}`);
          console.log(`   Searched URL pathname:`, (() => {
            try {
              return new URL(postUrl).pathname;
            } catch (e) {
              return 'invalid URL';
            }
          })());
          console.log(`   Available post links (first 10):`, posts.slice(0, 10).map(p => {
            const linkPath = p.link ? (() => {
              try {
                return new URL(p.link).pathname;
              } catch (e) {
                return p.link;
              }
            })() : 'no link';
            return {
              id: p.id,
              link: p.link || 'no link',
              linkPathname: linkPath,
              message: p.message ? p.message.substring(0, 50) : 'no message',
              created: p.created_time
            };
          }));
          console.log(`\n💡 TIPS:`);
          console.log(`   - If post is set to "Only Me" (private), it may not appear in API`);
          console.log(`   - Try sharing the post as "Public" or "Friends"`);
          console.log(`   - Wait a few minutes after posting for it to appear in API`);
          // Return zeros - don't use fallback post
          stats = { likes: 0, comments: 0, shares: 0, views: 0 };
        }
      } else {
        // If no URL, return stats from most recent post
        if (posts.length > 0) {
          const recentPost = posts[0];
          stats = {
            likes: recentPost.likes?.summary?.total_count || recentPost.likes?.data?.length || 0,
            comments: recentPost.comments?.summary?.total_count || recentPost.comments?.data?.length || 0,
            shares: recentPost.shares?.count || 0,
            views: 0
          };
          console.log(`✅ Using most recent post stats:`, stats);
        }
      }
    } catch (error) {
      console.error("❌ Error fetching user posts:", error.response?.data || error.message);
      // Return zeros if API fails
    }

    // Log final stats for debugging
    console.log(`📊 Final stats returned:`, stats);
    console.log(`🔗 Post URL searched:`, postUrl || 'none');
    console.log(`📈 Stats summary:`, {
      likes: stats.likes,
      comments: stats.comments,
      shares: stats.shares,
      views: stats.views,
      hasPostId: !!stats.postId,
      hasPostUrl: !!stats.postUrl
    });
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Facebook stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get Facebook statistics",
      error: error.message
    });
  }
};

// Mock posting for development
const mockPost = async (content, imageUrl, eventId) => {
  // Simulate posting delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    platform: "facebook",
    postId: `mock_post_${Date.now()}`,
    url: `https://facebook.com/mock_page/posts/mock_post_${Date.now()}`
  };
};

// Mock stats for development
const mockStats = async (postId) => {
  // Generate realistic mock Facebook statistics
  const baseStats = { likes: 45, comments: 12, shares: 8, views: 1200 };

  // Add some randomness
  return {
    likes: baseStats.likes + Math.floor(Math.random() * 30),
    comments: baseStats.comments + Math.floor(Math.random() * 8),
    shares: baseStats.shares + Math.floor(Math.random() * 5),
    views: baseStats.views + Math.floor(Math.random() * 200)
  };
};

// Real Facebook API function - Post to user's connected Page
// Post to user's Facebook Page (Facebook doesn't allow posting to personal timeline)
const postToFacebook = async (user, content, imageUrl, eventId) => {
  const { accessToken, pageId, pageAccessToken } = user.facebookTokens;

  if (!accessToken) {
    throw new Error("Facebook not connected - no access token");
  }

  if (!pageId) {
    throw new Error("No Facebook Page found. Please reconnect Facebook and ensure you have a Page.");
  }

  // Use page access token for posting
  const tokenToUse = pageAccessToken || accessToken;

  const postData = {
    message: content
  };

  // Handle image upload
  if (imageUrl) {
    if (imageUrl.startsWith('data:')) {
      console.warn("Data URL images cannot be posted directly to Facebook. Please upload image to a hosting service first.");
    } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      postData.link = imageUrl;
    }
  }

  try {
    // Post to user's Page
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${pageId}/feed`,
      postData,
      {
        params: {
          access_token: tokenToUse
        }
      }
    );

    // Extract post ID from response
    const postId = response.data.id;

    // Format Facebook post URL correctly
    // Facebook post IDs are usually in format: {userId}_{postId}
    let postUrl = `https://facebook.com/${postId}`;
    if (postId.includes('_')) {
      const [page, post] = postId.split('_');
      postUrl = `https://facebook.com/${page}/posts/${post}`;
    }

    return {
      platform: 'facebook',
      postId: postId,
      url: postUrl
    };
  } catch (error) {
    console.error("Facebook API Error:", error.response?.data || error.message);
    const errorMessage = error.response?.data?.error?.message || error.message;
    throw new Error(`Facebook API Error: ${errorMessage}`);
  }
};

const getFacebookStats = async (user, postId) => {
  const { accessToken } = user.facebookTokens;

  const response = await axios.get(
    `https://graph.facebook.com/v18.0/${postId}`,
    {
      params: {
        access_token: accessToken,
        fields: 'likes.summary(true),comments.summary(true),shares,reactions.summary(true)'
      }
    }
  );

  const data = response.data;

  return {
    likes: data.reactions?.summary?.total_count || data.likes?.summary?.total_count || 0,
    comments: data.comments?.summary?.total_count || 0,
    shares: data.shares?.count || 0,
    views: 0 // Facebook doesn't provide views in basic API
  };
};

// Facebook OAuth Callback for real integration
const facebookCallback = async (req, res) => {
  try {
    const { code, state: userId, error, error_code, error_message, error_reason } = req.query;

    console.log("Facebook OAuth Callback received:", {
      code: !!code,
      state: userId,
      error,
      error_code,
      error_message,
      error_reason,
      error_description: req.query.error_description
    });

    // Handle Facebook OAuth errors
    if (error || error_code) {
      const errorMsg = error_message || error || error_code;
      const errorDesc = req.query.error_description || error_reason || `Facebook OAuth Error: ${error_code || error}`;

      console.error("Facebook OAuth Error:", {
        error,
        error_code,
        error_message: errorMsg,
        error_reason,
        error_description: errorDesc
      });

      // Common error codes and their meanings
      let userFriendlyMessage = errorDesc;
      if (error_code === '100') {
        userFriendlyMessage = "Invalid redirect URI or scope. Please check Facebook App settings.";
      } else if (error === 'access_denied') {
        userFriendlyMessage = "User denied access to the app.";
      } else if (error === 'redirect_uri_mismatch') {
        userFriendlyMessage = "Redirect URI mismatch. Check Facebook App OAuth settings.";
      }

      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:5173'}/organizer?error=facebook_connection_failed&message=${encodeURIComponent(userFriendlyMessage)}`
      );
    }

    if (!code) {
      console.error("No authorization code provided in callback");
      return res.status(400).json({
        success: false,
        message: "Authorization code not provided. Facebook may have rejected the OAuth request."
      });
    }

    // Exchange code for access token
    const tokenResponse = await axios.get(
      `https://graph.facebook.com/v18.0/oauth/access_token`,
      {
        params: {
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          redirect_uri: `${req.protocol}://${req.get('host')}/api/social/facebook/callback`,
          code: code
        }
      }
    );

    const { access_token, expires_in } = tokenResponse.data;

    // Get user info and pages
    const userResponse = await axios.get(
      `https://graph.facebook.com/v18.0/me`,
      {
        params: {
          access_token: access_token,
          fields: 'id,name'
        }
      }
    );

    const userInfo = userResponse.data;
    console.log(`✅ User authenticated: ${userInfo.name} (${userInfo.id})`);

    // Simple: Just save user token for reading posts/stats
    // We'll use Share Dialog for posting, not API
    if (userId) {
      await Users.findByIdAndUpdate(userId, {
        $set: {
          "facebookTokens.accessToken": access_token,
          "facebookTokens.tokenExpiry": new Date(Date.now() + (expires_in || 5184000) * 1000),
          "facebookTokens.userId": userInfo.id,
          "facebookTokens.pageId": null,
          "facebookTokens.pageName": null,
          "facebookTokens.connected": true
        }
      });

      console.log(`✅ Facebook connected: ${userInfo.name} (${userInfo.id})`);
      console.log(`✅ Will use Share Dialog for posting, API for reading stats`);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/organizer?facebook_connected=true`);
    } else {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/organizer?error=facebook_connection_failed`);
    }
  } catch (error) {
    console.error("Facebook OAuth error:", error);

    // If Facebook OAuth fails, fallback to mock connection for testing
    if (process.env.NODE_ENV === 'development' || !process.env.FACEBOOK_APP_ID) {
      console.log("Falling back to mock connection for testing");
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/organizer?facebook_connected=true&mock=true`);
    } else {
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/organizer?error=facebook_connection_failed`);
    }
  }
};

// Check Facebook connection status
const checkConnectionStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await Users.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Simple: Check if connected
    const hasAccessToken = !!user.facebookTokens?.accessToken;
    const isConnected = hasAccessToken;

    return res.json({
      success: true,
      data: {
        connected: isConnected,
        platform: "facebook"
      }
    });
  } catch (error) {
    console.error("Error checking connection status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check connection status",
      error: error.message
    });
  }
};

// Data Deletion Callback (required by Facebook)
const dataDeletionCallback = async (req, res) => {
  try {
    const { signed_request } = req.body;

    // Facebook sends a signed_request when requesting data deletion
    // For development, we'll just acknowledge the request
    if (signed_request) {
      // In production, you should:
      // 1. Verify the signed_request
      // 2. Delete user's data from your database
      // 3. Return confirmation_url

      console.log("Data deletion request received from Facebook");

      return res.status(200).json({
        url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/organizer`,
        confirmation_code: `deletion_${Date.now()}`
      });
    }

    // If no signed_request, return a simple HTML page
    return res.send(`
      <html>
        <head><title>Data Deletion</title></head>
        <body>
          <h1>Data Deletion Request</h1>
          <p>To delete your data, please contact us or use the app's delete account feature.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Data deletion callback error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing data deletion request"
    });
  }
};

module.exports = {
  getOAuthUrls,
  postToSocialMedia,
  getSocialMediaStats,
  mockConnect,
  facebookCallback,
  checkConnectionStatus,
  dataDeletionCallback
};