import React, { useState, useEffect } from "react";
import {
  Modal,
  Button,
  message,
  Tabs,
  Card,
  Row,
  Col,
  Statistic,
  Space,
  Spin,
  Divider,
  Typography,
  Input,
} from "antd";
import {
  FacebookOutlined,
  LikeOutlined,
  MessageOutlined,
  ShareAltOutlined,
  EyeOutlined,
  LinkOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useSelector } from "react-redux";
import axios from "axios";
import cookies from "js-cookie";
import { requestAuth } from "../config/request";

const { Text, Link } = Typography;

const AdvertisingPromotionModal = ({
  visible,
  onClose,
  eventId,
  eventTitle,
}) => {
  // Get user from Redux auth state
  const user = useSelector((state) => state.auth.user);
  const userId = user?._id || user?.id;
  const token = useSelector((state) => state.auth.token);
  const [activeTab, setActiveTab] = useState("posts");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [oauthUrls, setOauthUrls] = useState(null);
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [newPostUrl, setNewPostUrl] = useState("");

  // Fetch OAuth URLs, check Facebook connection, and load posts when modal opens
  useEffect(() => {
    if (visible && eventId) {
      fetchOAuthUrls();
      loadEventPosts();
      // Add a small delay to ensure any recent redirects have been processed
      const timer = setTimeout(() => {
        checkFacebookConnection();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [visible, eventId, userId, token]);

  // Also check connection status when URL parameters change (after OAuth redirect)
  useEffect(() => {
    if (visible) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("facebook_connected") === "true") {
        // Refresh connection status after redirect with retry mechanism
        let retryCount = 0;
        const maxRetries = 3;
        
        const checkWithRetry = () => {
          setTimeout(() => {
            checkFacebookConnection();
            retryCount++;
            if (retryCount < maxRetries) {
              checkWithRetry();
            }
          }, 1000 * (retryCount + 1)); // Increasing delay: 1s, 2s, 3s
        };
        
        checkWithRetry();
      }
    }
  }, [visible]);

  const fetchOAuthUrls = async () => {
    try {
      if (!userId || !token) {
        console.error("User not logged in");
        return;
      }

      const response = await axios.get(
        "http://localhost:9999/api/social/oauth-urls",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("OAuth URLs response:", response.data);
      setOauthUrls(response.data.data);
      
      // Check if we're in demo mode or real mode
      const facebookUrl = response.data.data?.facebook;
      if (facebookUrl) {
        setIsDemoMode(facebookUrl.isMock === true);
        console.log("Facebook mode:", facebookUrl.isMock ? "Demo" : "Real");
      }
    } catch (error) {
      console.error("Error fetching OAuth URLs:", error);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      }
    }
  };

  const checkFacebookConnection = async () => {
    try {
      console.log("Checking Facebook connection status...", { userId, hasToken: !!token });

      // First, check URL parameters for connection status (from OAuth callback)
      const urlParams = new URLSearchParams(window.location.search);
      const isUrlConnected = urlParams.get("facebook_connected") === "true";
      const isPartialConnection = urlParams.get("facebook_connected") === "partial";
      const isMockConnection = urlParams.get("mock") === "true";
      const hasWarning = urlParams.get("warning") === "no_page";

      // Show info if partial connection (legacy - no longer needed but keep for compatibility)
      if (isPartialConnection && hasWarning) {
        // No longer needed - we post to user profile now
        console.log("Legacy partial connection detected - will use user profile posting");
      }

      // If URL shows full connection, update localStorage immediately
      if (isUrlConnected) {
        localStorage.setItem("facebook_connected", "true");
        setFacebookConnected(true); // Set immediately for better UX
        console.log(
          `Facebook connection status: Connected${
            isMockConnection ? " (Mock)" : ""
          }`
        );
      } else if (isPartialConnection) {
        // Partial connection - don't set as connected, let backend check handle it
        console.log("Facebook OAuth successful but no page found");
        localStorage.removeItem("facebook_connected"); // Clear any old connection
      }
      
      // Clear URL parameters after processing
      const newUrl = new URL(window.location);
      newUrl.searchParams.delete("facebook_connected");
      newUrl.searchParams.delete("mock");
      newUrl.searchParams.delete("warning");
      window.history.replaceState({}, "", newUrl);

      // Always check backend for actual connection status (but prioritize URL/localStorage first)
      if (userId && token) {
        try {
          console.log("Calling backend to check connection status...", { userId });
          const response = await axios.get(
            "http://localhost:9999/api/social/connection-status",
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          console.log("Backend connection status response:", response.data);
          const responseData = response.data?.data || {};
          const isBackendConnected = responseData.connected === true;
          const hasPageId = responseData.hasPageId === true;
          const pageName = responseData.pageName;
          const errorMessage = responseData.message;
          
          // Show warning if connected but no page found
          if (responseData.hasAccessToken && !hasPageId && errorMessage) {
            message.warning(errorMessage, 5);
          }
          
          // If URL showed connection but backend doesn't yet, keep the connection status
          // (database update might be in progress) - but only for a short time
          if (isUrlConnected && !isBackendConnected) {
            console.log("URL shows connected but backend not yet updated, waiting...");
            // Wait a bit and check again
            setTimeout(async () => {
              try {
                const retryResponse = await axios.get(
                  "http://localhost:9999/api/social/connection-status",
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  }
                );
                const retryData = retryResponse.data?.data || {};
                const retryConnected = retryData.connected === true;
                setFacebookConnected(retryConnected);
                if (retryConnected) {
                  localStorage.setItem("facebook_connected", "true");
                } else {
                  localStorage.removeItem("facebook_connected");
                  if (retryData.message) {
                    message.warning(retryData.message, 5);
                  }
                }
              } catch (retryError) {
                console.error("Retry check failed:", retryError);
              }
            }, 2000);
            
            // Set optimistic connection for now
            setFacebookConnected(true);
            localStorage.setItem("facebook_connected", "true");
          } else {
            setFacebookConnected(isBackendConnected);

            // Update localStorage based on backend status
            if (isBackendConnected) {
              localStorage.setItem("facebook_connected", "true");
              console.log(`Facebook connection status: Connected (verified from backend)${pageName ? ` - Page: ${pageName}` : ''}`);
            } else {
              // Only remove if URL didn't show connection (to avoid race condition)
              if (!isUrlConnected) {
                localStorage.removeItem("facebook_connected");
              }
              console.log("Facebook connection status: Not connected (verified from backend)", responseData);
              if (errorMessage) {
                console.warn("Connection issue:", errorMessage);
              }
            }
          }
        } catch (apiError) {
          console.error("Error checking backend connection status:", apiError);
          console.error("Error details:", apiError.response?.data || apiError.message);
          // If URL shows connected, trust it even if backend check fails
          const isLocalStorageConnected =
            localStorage.getItem("facebook_connected") === "true";
          const finalStatus = isLocalStorageConnected || isUrlConnected;
          setFacebookConnected(finalStatus);
          console.log("Using fallback status:", finalStatus);
        }
      } else {
        console.warn("No userId or token available, using localStorage fallback", { userId, hasToken: !!token });
        // Fallback to localStorage if no user/token
        const isLocalStorageConnected =
          localStorage.getItem("facebook_connected") === "true";
        setFacebookConnected(isLocalStorageConnected || isUrlConnected);
      }
    } catch (error) {
      console.error("Error checking Facebook connection:", error);
      // Fallback to localStorage
      const isLocalStorageConnected =
        localStorage.getItem("facebook_connected") === "true";
      setFacebookConnected(isLocalStorageConnected);
    }
  };

  const connectFacebook = () => {
    if (oauthUrls && oauthUrls.facebook) {
      // Open in same window for better OAuth flow handling
      window.location.href = oauthUrls.facebook.url;
    }
  };


  const exportToCSV = () => {
    if (posts.length === 0) {
      message.warning("Không có dữ liệu để xuất!");
      return;
    }

    // Prepare CSV data
    const csvHeaders = [
      "Ngày đăng",
      "Nội dung bài đăng",
      "Nền tảng",
      "Likes",
      "Comments",
      "Shares",
      "Views",
      "Trạng thái",
      "URL bài đăng",
    ];

    const csvData = posts.map((post) => [
      new Date(post.postedAt).toLocaleString("vi-VN"),
      post.content,
      post.platform,
      post.likes,
      post.comments,
      post.shares,
      post.views,
      post.status,
      post.realPostUrl || "N/A",
    ]);

    // Calculate totals
    const totalStats = posts.reduce(
      (acc, post) => ({
        likes: acc.likes + post.likes,
        comments: acc.comments + post.comments,
        shares: acc.shares + post.shares,
        views: acc.views + post.views,
      }),
      { likes: 0, comments: 0, shares: 0, views: 0 }
    );

    // Create CSV content
    let csvContent = csvHeaders.join(",") + "\n";
    csvData.forEach((row) => {
      csvContent += row.map((field) => `"${field}"`).join(",") + "\n";
    });

    // Add summary section
    csvContent += "\n";
    csvContent += '"TỔNG KẾT",,,,,\n';
    csvContent += `"Tổng số bài đăng","${posts.length}",,,,\n`;
    csvContent += `"Tổng Likes","${totalStats.likes}",,,,\n`;
    csvContent += `"Tổng Comments","${totalStats.comments}",,,,\n`;
    csvContent += `"Tổng Shares","${totalStats.shares}",,,,\n`;
    csvContent += `"Tổng Views","${totalStats.views}",,,,\n`;
    csvContent += `"Tỷ lệ tương tác","${(
      ((totalStats.likes + totalStats.comments + totalStats.shares) /
        totalStats.views) *
      100
    ).toFixed(2)}%",,,,\n`;

    // Download CSV file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `promotion_report_${eventTitle}_${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    message.success("Đã xuất báo cáo thành công!");
  };

  const exportToExcel = () => {
    if (posts.length === 0) {
      message.warning("Không có dữ liệu để xuất!");
      return;
    }

    // Prepare Excel data with proper formatting
    const csvHeaders = [
      "Ngày đăng",
      "Nội dung bài đăng",
      "Nền tảng",
      "Likes",
      "Comments",
      "Shares",
      "Views",
      "Trạng thái",
      "URL bài đăng",
    ];

    const csvData = posts.map((post) => [
      new Date(post.postedAt).toLocaleString("vi-VN"),
      post.content,
      post.platform,
      post.likes,
      post.comments,
      post.shares,
      post.views,
      post.status,
      post.realPostUrl || "N/A",
    ]);

    // Calculate totals
    const totalStats = posts.reduce(
      (acc, post) => ({
        likes: acc.likes + post.likes,
        comments: acc.comments + post.comments,
        shares: acc.shares + post.shares,
        views: acc.views + post.views,
      }),
      { likes: 0, comments: 0, shares: 0, views: 0 }
    );

    // Create Excel content with proper formatting
    let excelContent = csvHeaders.join("\t") + "\n";
    csvData.forEach((row) => {
      excelContent += row.map((field) => `"${field}"`).join("\t") + "\n";
    });

    // Add summary section
    excelContent += "\n";
    excelContent += "TỔNG KẾT\t\t\t\t\t\t\t\t\n";
    excelContent += `Tổng số bài đăng\t${posts.length}\t\t\t\t\t\t\t\n`;
    excelContent += `Tổng Likes\t${totalStats.likes}\t\t\t\t\t\t\t\n`;
    excelContent += `Tổng Comments\t${totalStats.comments}\t\t\t\t\t\t\t\n`;
    excelContent += `Tổng Shares\t${totalStats.shares}\t\t\t\t\t\t\t\n`;
    excelContent += `Tổng Views\t${totalStats.views}\t\t\t\t\t\t\t\n`;
    excelContent += `Tỷ lệ tương tác\t${(
      ((totalStats.likes + totalStats.comments + totalStats.shares) /
        totalStats.views) *
      100
    ).toFixed(2)}%\t\t\t\t\t\t\t\n`;

    // Download Excel file (.xls format)
    const blob = new Blob([excelContent], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `promotion_report_${eventTitle}_${
        new Date().toISOString().split("T")[0]
      }.xls`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    message.success("Đã xuất báo cáo Excel thành công!");
  };

  const handleShareToFacebook = async () => {
    console.log(`🚀 handleShareToFacebook called`);
    setLoading(true);
    try {
      // Check if Facebook is connected
      if (!facebookConnected) {
        console.log(`❌ Facebook not connected`);
        message.error("Vui lòng kết nối Facebook trước khi chia sẻ!");
        setLoading(false);
        return;
      }

      console.log(`✅ Facebook connected. Getting share URL from backend...`);
      console.log(`   Event ID: ${eventId}`);

      // Get Share Dialog URL from backend
      const response = await axios.post(
        "http://localhost:9999/api/social/post",
        {
          content: "", // No content - user will type in Share Dialog
          imageUrl: null,
          eventId: eventId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`✅ Backend response:`, response.data);
      
      const postData = response.data.data;
      const shareUrl = postData.shareUrl;
      const eventUrl = postData.eventUrl;
      
      console.log(`📋 Share URL: ${shareUrl}`);
      console.log(`📋 Event URL: ${eventUrl}`);

      // Open Facebook Share Dialog
      window.open(
        shareUrl,
        'facebook-share',
        'width=600,height=400,left=' + (window.innerWidth / 2 - 300) + ',top=' + (window.innerHeight / 2 - 200)
      );

      message.success("Cửa sổ chia sẻ Facebook đã mở. Sau khi chia sẻ, copy link bài đăng và dán vào ô 'Thêm bài đăng' bên dưới.");
    } catch (error) {
      console.error("Error sharing to Facebook:", error);
      message.error("Chia sẻ thất bại: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const refreshPostStats = async (post) => {
    // Use Facebook post URL if available, otherwise use event URL
    const urlToCheck = post.facebookPostUrl || post.realPostUrl || post.eventUrl || post.shareUrl;
    
    console.log("🔄 Refreshing post stats:", {
      postId: post.id,
      urlToCheck: urlToCheck,
      hasFacebookPostUrl: !!post.facebookPostUrl,
      hasRealPostUrl: !!post.realPostUrl,
      hasEventUrl: !!post.eventUrl,
    });
    
    if (!urlToCheck) {
      message.warning("Vui lòng nhập link bài đăng Facebook hoặc đảm bảo đã chia sẻ sự kiện.");
      return;
    }

    try {
      const apiUrl = `http://localhost:9999/api/social/stats?postUrl=${encodeURIComponent(urlToCheck)}`;
      console.log("📡 Calling API:", apiUrl);
      
      const response = await axios.get(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("✅ API Response:", response.data);
      const stats = response.data.data;
      console.log("📊 Stats received:", stats);
      
      // Always update stats, even if zeros (post might exist but no engagement yet)
      if (stats) {
        // Update the post with real statistics and post URL
        const updatedPost = {
          ...post,
          likes: stats.likes || 0,
          comments: stats.comments || 0,
          shares: stats.shares || 0,
          views: stats.views || 0,
          status: stats.postId ? "published" : "pending",
          postId: stats.postId || null,
          realPostUrl: stats.postUrl || post.facebookPostUrl || null,
        };

        setPosts((prevPosts) =>
          prevPosts.map((p) =>
            p.id === post.id ? updatedPost : p
          )
        );
        
        // Save to database
        await savePostToDatabase(updatedPost);
        
        if (stats.postId || stats.likes > 0 || stats.comments > 0 || stats.shares > 0) {
          message.success("Đã cập nhật thống kê thành công!");
        } else {
          message.info("Đã làm mới. Chưa tìm thấy bài đăng hoặc chưa có tương tác.");
        }
      } else {
        message.info("Chưa tìm thấy bài đăng. Vui lòng thử lại sau hoặc nhập link bài đăng trực tiếp.");
      }
    } catch (error) {
      console.error("Error fetching real stats:", error);
      message.warning("Không thể cập nhật thống kê. Vui lòng kiểm tra link bài đăng hoặc thử lại sau.");
    }
  };

  const handleFacebookPostUrlChange = async (postId, url) => {
    const updatedPost = posts.find(p => p.id === postId);
    if (!updatedPost) return;

    const newPost = {
      ...updatedPost,
      facebookPostUrl: url,
      realPostUrl: url, // Also update realPostUrl if user manually enters it
    };

    setPosts((prevPosts) =>
      prevPosts.map((p) =>
        p.id === postId ? newPost : p
      )
    );

    // Save to database
    await savePostToDatabase(newPost);
  };

  // Load posts from database
  const loadEventPosts = async () => {
    if (!eventId) return;
    
    try {
      const response = await axios.get(
        `http://localhost:9999/api/events/${eventId}/social-posts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        // Ensure all post IDs are strings
        const posts = (response.data.data || []).map(post => ({
          ...post,
          id: String(post.id || post._id || Date.now())
        }));
        setPosts(posts);
      }
    } catch (error) {
      console.error("Error loading posts:", error);
      // If event doesn't have posts yet, start with empty array
      setPosts([]);
    }
  };

  // Save post to database
  const savePostToDatabase = async (post) => {
    if (!eventId) return;

    try {
      await axios.post(
        `http://localhost:9999/api/events/${eventId}/social-posts`,
        post,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error("Error saving post to database:", error);
    }
  };

  // Delete post from database
  const deletePostFromDatabase = async (postId) => {
    if (!eventId) return;

    try {
      await axios.delete(
        `http://localhost:9999/api/events/${eventId}/social-posts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          data: { postId },
        }
      );
    } catch (error) {
      console.error("Error deleting post from database:", error);
    }
  };

  const handleAddPostFromUrl = async () => {
    if (!newPostUrl || !newPostUrl.trim()) {
      message.warning("Vui lòng nhập link bài đăng Facebook.");
      return;
    }

    if (!newPostUrl.includes('facebook.com')) {
      message.warning("Link không hợp lệ. Vui lòng nhập link bài đăng Facebook.");
      return;
    }

    setLoading(true);
    try {
      // Get event URL from the share button context (we need to get it from backend)
      const response = await axios.post(
        "http://localhost:9999/api/social/post",
        {
          content: "",
          imageUrl: null,
          eventId: eventId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const postData = response.data.data;
      const eventUrl = postData.eventUrl;

      // Try to get stats from the Facebook post URL
      const statsResponse = await axios.get(
        `http://localhost:9999/api/social/stats?postUrl=${encodeURIComponent(newPostUrl)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const stats = statsResponse.data.data;

      // Create new post with the Facebook URL and stats
      const newPost = {
        id: Date.now().toString(),
        platform: "facebook",
        content: "",
        image: null,
        likes: stats?.likes || 0,
        comments: stats?.comments || 0,
        shares: stats?.shares || 0,
        views: stats?.views || 0,
        postedAt: new Date().toISOString(),
        status: stats?.postId ? "published" : "pending",
        shareUrl: postData.shareUrl,
        eventUrl: eventUrl,
        facebookPostUrl: newPostUrl.trim(),
        realPostUrl: stats?.postUrl || newPostUrl.trim(),
        postId: stats?.postId || null,
        isMock: false,
      };

      setPosts((prevPosts) => [newPost, ...prevPosts]);
      await savePostToDatabase(newPost);
      setNewPostUrl("");
      message.success("Đã thêm bài đăng thành công!");
    } catch (error) {
      console.error("Error adding post from URL:", error);
      message.error("Không thể thêm bài đăng: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchMockStats = async (post) => {
    // Generate realistic mock Facebook statistics
    const baseStats = { likes: 45, comments: 12, shares: 8, views: 1200 };

    // Add some randomness
    const mockStats = {
      likes: baseStats.likes + Math.floor(Math.random() * 30),
      comments: baseStats.comments + Math.floor(Math.random() * 8),
      shares: baseStats.shares + Math.floor(Math.random() * 5),
      views: baseStats.views + Math.floor(Math.random() * 200),
    };

    // Update the post with mock statistics
    setPosts((prevPosts) =>
      prevPosts.map((p) =>
        p.id === post.id
          ? {
              ...p,
              likes: mockStats.likes,
              comments: mockStats.comments,
              shares: mockStats.shares,
              views: mockStats.views,
            }
          : p
      )
    );
  };


  const renderShareButton = () => (
    <Card title="Chia sẻ sự kiện lên Facebook" style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        {/* Facebook Connection Status */}
        <div
          style={{
            padding: 12,
            backgroundColor: "#f5f5f5",
            borderRadius: 6,
          }}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            <Space>
              <FacebookOutlined style={{ color: "#1877f2", fontSize: 20 }} />
              <div style={{ flex: 1 }}>
                <Text strong>Facebook</Text>
                <br />
                <Text type={facebookConnected ? "success" : "danger"}>
                  {facebookConnected ? "Đã kết nối" : "Chưa kết nối"}
                </Text>
                {!facebookConnected && (
                  <Button
                    type="link"
                    size="small"
                    onClick={connectFacebook}
                    style={{ padding: 0, marginLeft: 8 }}
                  >
                    Kết nối
                  </Button>
                )}
                {facebookConnected && (
                  <Button
                    type="link"
                    size="small"
                    onClick={checkFacebookConnection}
                    style={{ padding: 0, marginLeft: 8 }}
                  >
                    Làm mới
                  </Button>
                )}
              </div>
            </Space>
            {facebookConnected && isDemoMode && (
              <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
                💡 Để chia sẻ lên Facebook thật, vui lòng:
                <br />
                1. Thêm FACEBOOK_APP_ID và FACEBOOK_APP_SECRET vào backend/.env
                <br />
                2. Khởi động lại backend server
                <br />
                3. Ngắt kết nối và kết nối lại Facebook để nhận token thật
                <br />
                Hiện tại đang ở chế độ demo.
              </Text>
            )}
            {facebookConnected && !isDemoMode && (
              <Text type="success" style={{ fontSize: 12, marginTop: 4 }}>
                ✅ Đã kết nối. Nhấn nút bên dưới để chia sẻ sự kiện.
              </Text>
            )}
            {!facebookConnected && (
              <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
                💡 Kết nối Facebook để chia sẻ sự kiện và xem thống kê.
              </Text>
            )}
          </Space>
        </div>

        <Button
          type="primary"
          size="large"
          loading={loading}
          disabled={!facebookConnected}
          icon={<ShareAltOutlined />}
          onClick={handleShareToFacebook}
          block
        >
          Chia sẻ lên Facebook
        </Button>
        <Text type="secondary" style={{ fontSize: 12, textAlign: "center", display: "block" }}>
          Nhấn nút để mở cửa sổ chia sẻ Facebook. Bạn có thể thêm nội dung tùy chỉnh trong cửa sổ đó.
        </Text>
        
        <Divider>Hoặc thêm bài đăng đã chia sẻ</Divider>
        
        <Space.Compact style={{ width: "100%" }}>
          <Input
            placeholder="Dán link bài đăng Facebook"
            value={newPostUrl}
            onChange={(e) => setNewPostUrl(e.target.value)}
            onPressEnter={handleAddPostFromUrl}
          />
          <Button
            type="primary"
            onClick={handleAddPostFromUrl}
            loading={loading}
          >
            Thêm bài đăng
          </Button>
        </Space.Compact>
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
          💡 Sau khi chia sẻ trên Facebook, copy link bài đăng và dán vào đây để thêm vào danh sách
        </Text>
      </Space>
    </Card>
  );

  const renderPostCard = (post) => (
    <Card
      key={post.id}
      style={{ marginBottom: 16 }}
      extra={
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={() => refreshPostStats(post)}
          size="small"
        >
          Làm mới
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <div>
          <Space>
            <FacebookOutlined style={{ color: "#1877f2" }} />
            <Text strong>Facebook</Text>
            <Text type="secondary">
              {new Date(post.postedAt).toLocaleString()}
            </Text>
            {post.status === "pending" && (
              <Text type="warning" style={{ fontSize: 12 }}>
                (Chưa cập nhật thống kê)
              </Text>
            )}
          </Space>
        </div>

        <Text>{post.content}</Text>

        {post.image && (
          <img
            src={post.image}
            alt="Post"
            style={{ width: "100%", maxWidth: 400, borderRadius: 8 }}
          />
        )}

        {/* Input for Facebook post URL */}
        <div style={{ marginBottom: 12 }}>
          <Space.Compact style={{ width: "100%" }}>
            <Input
              placeholder="Dán link bài đăng Facebook (nếu có)"
              value={post.facebookPostUrl || post.realPostUrl || ""}
              onChange={(e) => handleFacebookPostUrlChange(post.id, e.target.value)}
              onPressEnter={() => refreshPostStats(post)}
            />
            <Button
              type="primary"
              onClick={() => refreshPostStats(post)}
            >
              Lưu & Làm mới
            </Button>
          </Space.Compact>
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
            💡 Sau khi chia sẻ, copy link bài đăng từ Facebook và dán vào đây, sau đó nhấn "Lưu & Làm mới"
          </Text>
        </div>

        {post.realPostUrl && (
          <div>
            <Link href={post.realPostUrl} target="_blank" rel="noopener noreferrer">
              <LinkOutlined /> Xem bài đăng trên Facebook
            </Link>
          </div>
        )}

        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Likes"
              value={post.likes}
              prefix={<LikeOutlined />}
              valueStyle={{ color: "#cf1322" }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Comments"
              value={post.comments}
              prefix={<MessageOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Shares"
              value={post.shares}
              prefix={<ShareAltOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Views"
              value={post.views}
              prefix={<EyeOutlined />}
              valueStyle={{ color: "#722ed1" }}
            />
          </Col>
        </Row>
      </Space>
    </Card>
  );

  const renderPostsTab = () => (
    <div>
      {renderShareButton()}

      <Divider>Bài đăng đã tạo</Divider>

      {posts.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <FacebookOutlined
              style={{ fontSize: 48, color: "#ccc", marginBottom: 16 }}
            />
            <Text type="secondary">Chưa có bài đăng nào</Text>
          </div>
        </Card>
      ) : (
        posts.map(renderPostCard)
      )}
    </div>
  );

  const renderStatsTab = () => {
    const totalStats = posts.reduce(
      (acc, post) => ({
        likes: acc.likes + post.likes,
        comments: acc.comments + post.comments,
        shares: acc.shares + post.shares,
        views: acc.views + post.views,
      }),
      { likes: 0, comments: 0, shares: 0, views: 0 }
    );

    return (
      <div>
        <Card
          title="Tổng quan thống kê"
          style={{ marginBottom: 24 }}
          extra={
            <Space>
              <Button
                icon={<DownloadOutlined />}
                onClick={exportToCSV}
                disabled={posts.length === 0}
                size="small"
              >
                Xuất CSV
              </Button>
              <Button
                icon={<FileExcelOutlined />}
                onClick={exportToExcel}
                disabled={posts.length === 0}
                size="small"
                type="primary"
              >
                Xuất Excel
              </Button>
            </Space>
          }
        >
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="Tổng Likes"
                value={totalStats.likes}
                prefix={<LikeOutlined />}
                valueStyle={{ color: "#cf1322" }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Tổng Comments"
                value={totalStats.comments}
                prefix={<MessageOutlined />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Tổng Shares"
                value={totalStats.shares}
                prefix={<ShareAltOutlined />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Tổng Views"
                value={totalStats.views}
                prefix={<EyeOutlined />}
                valueStyle={{ color: "#722ed1" }}
              />
            </Col>
          </Row>

          {posts.length > 0 && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                backgroundColor: "#f6ffed",
                borderRadius: 6,
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="Tổng số bài đăng"
                    value={posts.length}
                    valueStyle={{ color: "#52c41a" }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Tỷ lệ tương tác"
                    value={(
                      ((totalStats.likes +
                        totalStats.comments +
                        totalStats.shares) /
                        totalStats.views) *
                      100
                    ).toFixed(2)}
                    suffix="%"
                    valueStyle={{ color: "#1890ff" }}
                  />
                </Col>
              </Row>
            </div>
          )}
        </Card>

        <Divider>Thống kê theo bài đăng</Divider>

        {posts.length === 0 ? (
          <Card>
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <FacebookOutlined
                style={{ fontSize: 48, color: "#ccc", marginBottom: 16 }}
              />
              <Text type="secondary">Chưa có dữ liệu thống kê</Text>
            </div>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: "100%" }}>
                <Text strong>{post.content.substring(0, 50)}...</Text>
                <Text type="secondary">
                  {new Date(post.postedAt).toLocaleString()}
                </Text>
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic
                      title="Likes"
                      value={post.likes}
                      prefix={<LikeOutlined />}
                      valueStyle={{ color: "#cf1322" }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Comments"
                      value={post.comments}
                      prefix={<MessageOutlined />}
                      valueStyle={{ color: "#1890ff" }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Shares"
                      value={post.shares}
                      prefix={<ShareAltOutlined />}
                      valueStyle={{ color: "#52c41a" }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Views"
                      value={post.views}
                      prefix={<EyeOutlined />}
                      valueStyle={{ color: "#722ed1" }}
                    />
                  </Col>
                </Row>
              </Space>
            </Card>
          ))
        )}
      </div>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <FacebookOutlined style={{ color: "#1877f2" }} />
          Quản lý quảng cáo Facebook - {eventTitle}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      style={{ top: 20 }}
    >
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          {
            key: 'posts',
            label: 'Bài đăng',
            children: renderPostsTab(),
          },
          {
            key: 'stats',
            label: 'Thống kê',
            children: renderStatsTab(),
          },
        ]}
      />
    </Modal>
  );
};

export default AdvertisingPromotionModal;
