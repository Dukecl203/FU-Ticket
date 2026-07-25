import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Typography,
  Input,
  Select,
  Card,
  Row,
  Col,
  Space,
  Spin,
  message,
  Button,
  Pagination,
} from "antd";
import { ShareAltOutlined } from "@ant-design/icons";
import { useSelector } from "react-redux";
import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import AdvertisingPromotionModal from "./AdvertisingPromotionModal";
import useDebounce from "../hooks/useDebounce";

// Enable UTC plugin for dayjs
dayjs.extend(utc);
const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;

const sortOptions = [
  { value: "start_time", label: "Ngày" },
  { value: "title", label: "Tên sự kiện" },
  { value: "location", label: "Địa điểm" },
];

const statusTabs = [
  { key: "all", label: "Tất cả" },
  { key: "completed", label: "Đã kết thúc" },
  { key: "ongoing", label: "Đang diễn ra" },
  { key: "approved", label: "Sắp tới" },
  { key: "draft", label: "Chưa công khai" },
];

const ReportManageView = ({ onViewReport }) => {
  // Get user from Redux auth state
  const user = useSelector((state) => state.auth.user);
  const USER_ID = user?._id || user?.id;
  const [eventsData, setEventsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearchValue = useDebounce(searchValue, 300); // Debounce search by 300ms
  const [sortBy, setSortBy] = useState("start_time");
  const [activeStatus, setActiveStatus] = useState("all");
  const [promotionModalVisible, setPromotionModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8); // Show 8 events per page
  const [totalEvents, setTotalEvents] = useState(0);

  // Fetch events with server-side pagination and filtering
  useEffect(() => {
    if (!USER_ID) {
      setLoading(false);
      console.warn("User ID not available, skipping data fetch");
      return;
    }

    const abortController = new AbortController();

    // Build URL with pagination and status filter
    // For report management, we exclude draft events since they can't have reports
    let url = `http://localhost:9999/api/events/user/${USER_ID}?page=${currentPage}&limit=${pageSize}`;
    const filterType = activeStatus === "all" ? "excludeDraft" : activeStatus;

    if (activeStatus === "all") {
      // When "all" is selected, exclude draft events (only show reportable events)
      url += `&excludeStatus=draft`;
    } else {
      // When specific status is selected, filter by that status
      url += `&status=${activeStatus}`;
    }

    setLoading(true);

    axios
      .get(url, { signal: abortController.signal })
      .then((res) => {
        const events = res.data.data || [];
        const pagination = res.data.pagination || {};

        console.log(
          `📊 Fetched ${events.length} events for page ${currentPage}, Total: ${pagination.total}`,
          {
            activeStatus,
            filterType,
            url,
          }
        );

        setEventsData(events);
        setTotalEvents(pagination.total || 0);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError" || err.code === "ERR_CANCELED") return;
        console.error("Error loading data:", err);
        message.error("Không thể tải dữ liệu!");
        setLoading(false);
      });

    return () => abortController.abort();
  }, [USER_ID, currentPage, pageSize, activeStatus]);

  // Reset to page 1 when changing status or search
  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatus, debouncedSearchValue]);

  // Client-side search filter only (for instant feedback)
  const filteredEvents = useMemo(() => {
    if (!debouncedSearchValue) return eventsData;

    return eventsData.filter(
      (event) =>
        event.title
          ?.toLowerCase()
          .includes(debouncedSearchValue.toLowerCase()) ||
        event.location
          ?.toLowerCase()
          .includes(debouncedSearchValue.toLowerCase())
    );
  }, [eventsData, debouncedSearchValue]);

  const openReport = (eventId) => {
    if (onViewReport) onViewReport(eventId);
  };

  const handleOpenPromotionModal = (event) => {
    setSelectedEvent(event);
    setPromotionModalVisible(true);
  };

  const handleClosePromotionModal = () => {
    setPromotionModalVisible(false);
    setSelectedEvent(null);
  };

  // Show message if user is not logged in
  if (!USER_ID) {
    return (
      <div style={{ width: "100%", textAlign: "center", padding: "50px" }}>
        <Title level={3}>Vui lòng đăng nhập để xem báo cáo</Title>
        <p>Bạn cần đăng nhập để quản lý và xem báo cáo sự kiện.</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <Space
        direction="vertical"
        size="large"
        style={{ width: "100%", marginBottom: 24 }}
      >
        <Title level={3} style={{ marginBottom: 0 }}>
          Quản Lý Báo Cáo Sự Kiện
        </Title>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Search
              placeholder="Tìm kiếm sự kiện"
              allowClear
              enterButton="Tìm kiếm"
              size="large"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              style={{ maxWidth: 350 }}
            />
          </Col>
          <Col flex="auto">
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {statusTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveStatus(tab.key)}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    background:
                      activeStatus === tab.key ? "#fa8c16" : "#f5f5f5",
                    color: activeStatus === tab.key ? "#fff" : "#444",
                    border: "none",
                    borderRadius: 4,
                    fontWeight: activeStatus === tab.key ? "bold" : "normal",
                    fontSize: "16px",
                    transition: "background 0.2s, color 0.2s",
                    outline: "none",
                    cursor: "pointer",
                    boxShadow:
                      activeStatus === tab.key ? "0 0 0 2px #fa8c16" : "none",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </Col>
          <Col>
            <Select
              value={sortBy}
              onChange={setSortBy}
              size="large"
              style={{ minWidth: 150 }}
            >
              {sortOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  Sắp xếp theo {opt.label}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Space>
      {loading ? (
        <Spin style={{ display: "block", margin: "40px auto" }} />
      ) : (
        <>
          <Row gutter={[24, 24]}>
            {filteredEvents.length === 0 ? (
              <Col span={24} style={{ textAlign: "center", color: "#888" }}>
                {debouncedSearchValue
                  ? "Không tìm thấy sự kiện nào phù hợp."
                  : "Không có sự kiện nào."}
              </Col>
            ) : (
              filteredEvents.map((event) => (
                <Col key={event._id || event.id} xs={24} sm={12} md={8} lg={6}>
                  <Card
                    hoverable
                    title={event.title}
                    styles={{
                      header: {
                        color: "#fa8c16",
                        fontWeight: 600,
                        borderBottom: "1px solid #fa8c16",
                        background: "#fff",
                      },
                      body: {
                        color: "#333",
                      },
                    }}
                    style={{
                      border: "1px solid #fa8c16",
                      background: "#fff",
                      color: "#333",
                      boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)",
                      transition: "all 0.2s ease",
                      overflow: "hidden",
                    }}
                    cover={
                      event.poster_url ? (
                        <img
                          alt="poster"
                          src={event.poster_url}
                          loading="lazy"
                          style={{
                            width: "100%",
                            height: "180px",
                            objectFit: "cover",
                            display: "block",
                            borderRadius: "8px 8px 0px 0px",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "180px",
                            background: "#f0f0f0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#aaa",
                            fontSize: 18,
                            borderRadius: "8px 8px 0px 0px",
                          }}
                        >
                          Không có ảnh
                        </div>
                      )
                    }
                  >
                    <p>
                      <b>Ngày bắt đầu:</b>{" "}
                      {dayjs.utc(event.start_time).format("DD/MM/YYYY HH:mm")} (UTC)
                    </p>
                    <p>
                      <b>Ngày kết thúc:</b>{" "}
                      {dayjs.utc(event.end_time).format("DD/MM/YYYY HH:mm")} (UTC)
                    </p>
                    <p>
                      <b>Địa điểm:</b> {event.location}
                    </p>
                    <p>
                      <b>Trạng thái:</b>{" "}
                      {statusTabs.find((tab) => tab.key === event.status)
                        ?.label || event.status}
                    </p>
                    <Space direction="vertical" style={{ width: "100%" }}>
                      <Button
                        type="primary"
                        onClick={() => openReport(event._id || event.id)}
                        style={{ width: "100%" }}
                      >
                        Xem Báo Cáo
                      </Button>
                      <Button
                        icon={<ShareAltOutlined />}
                        onClick={() => handleOpenPromotionModal(event)}
                        style={{ width: "100%" }}
                      >
                        Quản Lý Quảng Cáo
                      </Button>
                    </Space>
                  </Card>
                </Col>
              ))
            )}
          </Row>
          {!debouncedSearchValue && totalEvents > pageSize && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 32,
              }}
            >
              <Pagination
                current={currentPage}
                total={totalEvents}
                pageSize={pageSize}
                onChange={(page) => setCurrentPage(page)}
                showSizeChanger={false}
                showTotal={(total) => `Tổng ${total} sự kiện`}
              />
            </div>
          )}
        </>
      )}

      {/* Advertising Promotion Modal */}
      <AdvertisingPromotionModal
        visible={promotionModalVisible}
        onClose={handleClosePromotionModal}
        eventId={selectedEvent?._id || selectedEvent?.id}
        eventTitle={selectedEvent?.title}
      />
    </div>
  );
};

export default ReportManageView;
