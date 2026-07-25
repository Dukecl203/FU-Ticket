import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Space,
  Tag,
  Input,
  DatePicker,
  Select,
  Button,
  Tooltip,
} from "antd";
import {
  SearchOutlined,
  UserOutlined,
  TeamOutlined,
  ReloadOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  TagOutlined,
  NumberOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import axios from "axios";
import moment from "moment";

const { RangePicker } = DatePicker;
const { Option } = Select;

function ManagerRechange() {
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalRevenue: 0,
    totalTicketsSold: 0,
  });
  const [allTransactions, setAllTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Sửa: Tách riêng current page và pageSize
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // State cho bộ lọc
  const [eventNameSearch, setEventNameSearch] = useState("");
  const [buyerNameSearch, setBuyerNameSearch] = useState("");
  const [organizerNameSearch, setOrganizerNameSearch] = useState("");
  const [dateRange, setDateRange] = useState([]);
  const [statusFilter, setStatusFilter] = useState(undefined);

  // State cho table filters
  const [tableFilters, setTableFilters] = useState({
    category: [],
    paymentMethod: [],
    status: [],
  });

  const isInitialMount = useRef(true);

  // Hàm áp dụng tất cả filters
  const applyAllFilters = (transactions, filters) => {
    let filtered = [...transactions];

    // Áp dụng search filters từ input
    if (filters.eventNameSearch) {
      filtered = filtered.filter((t) =>
        t.eventName
          .toLowerCase()
          .includes(filters.eventNameSearch.toLowerCase())
      );
    }
    if (filters.buyerNameSearch) {
      filtered = filtered.filter((t) =>
        t.buyer.toLowerCase().includes(filters.buyerNameSearch.toLowerCase())
      );
    }
    if (filters.organizerNameSearch) {
      filtered = filtered.filter((t) =>
        t.organizer
          .toLowerCase()
          .includes(filters.organizerNameSearch.toLowerCase())
      );
    }
    if (filters.statusFilter) {
      filtered = filtered.filter((t) => t.status === filters.statusFilter);
    }
    if (filters.dateRange && filters.dateRange.length === 2) {
      const startDate = filters.dateRange[0].startOf("day");
      const endDate = filters.dateRange[1].endOf("day");
      filtered = filtered.filter((t) => {
        const transactionDate = moment(t.createdAt);
        return transactionDate.isBetween(startDate, endDate, null, "[]");
      });
    }

    // Áp dụng table filters
    if (
      filters.tableFilters.category &&
      filters.tableFilters.category.length > 0
    ) {
      filtered = filtered.filter((t) =>
        filters.tableFilters.category.includes(t.category)
      );
    }
    if (
      filters.tableFilters.paymentMethod &&
      filters.tableFilters.paymentMethod.length > 0
    ) {
      filtered = filtered.filter((t) =>
        filters.tableFilters.paymentMethod.includes(t.paymentMethod)
      );
    }
    if (filters.tableFilters.status && filters.tableFilters.status.length > 0) {
      filtered = filtered.filter((t) =>
        filters.tableFilters.status.includes(t.status)
      );
    }

    return filtered;
  };

  // Hàm tính toán stats từ filtered transactions
  const calculateStats = (transactions) => {
    const paidTransactions = transactions.filter(
      (t) => t.status === "paid" || t.status === "SUCCESS"
    );
    const refundedTransactions = transactions.filter(
      (t) => t.status === "refunded"
    );

    const totalRevenue = paidTransactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0
    );
    const totalRefunded = refundedTransactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0
    );

    const totalTicketsSold =
      paidTransactions.reduce((sum, t) => sum + (t.quantity || 0), 0) +
      refundedTransactions.reduce((sum, t) => sum + (t.quantity || 0), 0);

    return {
      totalTransactions: transactions.length,
      totalRevenue,
      totalRefunded,
      totalTicketsSold,
    };
  };

  const columns = [
    {
      title: "STT",
      key: "index",
      width: 60,
      align: "center",
      render: (_, __, index) => {
        return (currentPage - 1) * pageSize + index + 1;
      },
    },
    {
      title: "Sự kiện",
      dataIndex: "eventName",
      key: "eventName",
      width: 200,
      ellipsis: {
        showTitle: false,
      },
      render: (eventName) => (
        <Tooltip placement="topLeft" title={eventName}>
          {eventName}
        </Tooltip>
      ),
    },
    {
      title: "Danh mục",
      dataIndex: "category",
      key: "category",
      width: 120,
      render: (category) => (
        <Tag color="blue" icon={<TagOutlined />}>
          {category}
        </Tag>
      ),
      filters: Array.from(new Set(allTransactions.map((t) => t.category))).map(
        (cat) => ({
          text: cat,
          value: cat,
        })
      ),
      filteredValue: tableFilters.category,
      onFilter: (value, record) => record.category === value,
      filterMultiple: true,
    },
    {
      title: "Nhà tổ chức",
      dataIndex: "organizer",
      key: "organizer",
      width: 150,
      ellipsis: {
        showTitle: false,
      },
      render: (organizer) => (
        <Tooltip placement="topLeft" title={organizer}>
          {organizer}
        </Tooltip>
      ),
    },
    {
      title: "Người mua",
      dataIndex: "buyer",
      key: "buyer",
      width: 120,
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
      align: "center",
      render: (quantity) => (
        <Tag color="green" icon={<NumberOutlined />}>
          {quantity}
        </Tag>
      ),
      sorter: (a, b) => a.quantity - b.quantity,
    },
    {
      title: "Tổng tiền",
      dataIndex: "amount",
      key: "amount",
      width: 130,
      render: (amount) => (
        <span style={{ fontWeight: "bold", color: "#52c41a" }}>
          {amount?.toLocaleString("vi-VN")} VNĐ
        </span>
      ),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: "Phương thức",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      width: 100,
      render: (method) => {
        const methodColors = {
          MOMO: "purple",
          VNPAY: "blue",
          STRIPE: "geekblue",
          WALLET: "orange",
        };
        return <Tag color={methodColors[method] || "default"}>{method}</Tag>;
      },
      filters: [
        { text: "MOMO", value: "MOMO" },
        { text: "VNPAY", value: "VNPAY" },
        { text: "STRIPE", value: "STRIPE" },
        { text: "WALLET", value: "WALLET" },
      ],
      filteredValue: tableFilters.paymentMethod,
      onFilter: (value, record) => record.paymentMethod === value,
      filterMultiple: true,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status) => {
        const statusConfig = {
          paid: { color: "green", text: "Thành công" },
          SUCCESS: { color: "green", text: "Thành công" },
          refunded: { color: "orange", text: "Đã hoàn tiền" },
          cancelled: { color: "red", text: "Thất bại" },
          FAILED: { color: "red", text: "Thất bại" },
          PENDING: { color: "yellow", text: "Đang xử lý" },
        };

        const config = statusConfig[status] || {
          color: "default",
          text: status,
        };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
      filters: [
        { text: "Thành công", value: "paid" },
        { text: "Đã hoàn tiền", value: "refunded" },
        { text: "Thất bại", value: "cancelled" },
      ],
      filteredValue: tableFilters.status,
      onFilter: (value, record) => {
        if (value === "paid") {
          return record.status === "paid" || record.status === "SUCCESS";
        }
        return record.status === value;
      },
      filterMultiple: true,
    },
    {
      title: "Ngày giao dịch",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (date) => moment(date).format("DD/MM/YYYY HH:mm"),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
  ];

  // Xử lý thay đổi phân trang và filters - SỬA LẠI
  const handleTableChange = (newPagination, filters, sorter) => {
    console.log("📄 Table change:", {
      pagination: newPagination,
      filters,
      sorter,
    });

    // Chỉ cập nhật page và pageSize khi người dùng thực sự thay đổi phân trang
    if (newPagination.current !== currentPage) {
      setCurrentPage(newPagination.current);
    }
    if (newPagination.pageSize !== pageSize) {
      setPageSize(newPagination.pageSize);
      setCurrentPage(1); // Reset về trang 1 khi thay đổi pageSize
    }

    // Cập nhật table filters
    setTableFilters({
      category: filters.category || [],
      paymentMethod: filters.paymentMethod || [],
      status: filters.status || [],
    });
  };

  // Hàm gọi API với caching
  const fetchEventTransactions = async (currentFilters) => {
    try {
      setLoading(true);

      const params = {};

      if (currentFilters.eventNameSearch) {
        params.eventName = currentFilters.eventNameSearch;
      }
      if (currentFilters.buyerNameSearch) {
        params.buyerName = currentFilters.buyerNameSearch;
      }
      if (currentFilters.organizerNameSearch) {
        params.organizerName = currentFilters.organizerNameSearch;
      }
      if (currentFilters.statusFilter) {
        params.status = currentFilters.statusFilter;
      }
      if (currentFilters.dateRange && currentFilters.dateRange.length === 2) {
        params.startDate = currentFilters.dateRange[0].format("YYYY-MM-DD");
        params.endDate = currentFilters.dateRange[1].format("YYYY-MM-DD");
      }

      // Check cache (2 minute TTL)
      const cacheKey = `transactions_${JSON.stringify(params)}`;
      const cached = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);

      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < 2 * 60 * 1000) {
          // 2 minutes
          console.log("📦 Using cached transactions data");
          const cachedData = JSON.parse(cached);
          setAllTransactions(cachedData.transactions || []);

          const currentAllFilters = {
            eventNameSearch,
            buyerNameSearch,
            organizerNameSearch,
            dateRange,
            statusFilter,
            tableFilters,
          };

          const newlyFiltered = applyAllFilters(
            cachedData.transactions || [],
            currentAllFilters
          );
          setFilteredTransactions(newlyFiltered);

          const newStats = calculateStats(newlyFiltered);
          setStats(newStats);
          setLoading(false);
          return;
        }
      }

      const res = await axios.get(
        "http://localhost:9999/api/events/transactions",
        { params }
      );

      const { data } = res.data;

      // Cache the results
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());

      setAllTransactions(data?.transactions || []);

      // Áp dụng filters ngay sau khi nhận dữ liệu
      const currentAllFilters = {
        eventNameSearch,
        buyerNameSearch,
        organizerNameSearch,
        dateRange,
        statusFilter,
        tableFilters,
      };

      const newlyFiltered = applyAllFilters(
        data?.transactions || [],
        currentAllFilters
      );
      setFilteredTransactions(newlyFiltered);

      const newStats = {
        totalTransactions: data?.totalTransactions || 0,
        totalRevenue: data?.totalRevenue || 0,
        totalRefunded: data?.totalRefunded || 0,
        totalTicketsSold: data?.totalTicketsSold || 0,
      };
      setStats(newStats);
    } catch (error) {
      console.error("❌ Lỗi khi tải giao dịch:", error);
      setAllTransactions([]);
      setFilteredTransactions([]);
      setStats({
        totalTransactions: 0,
        totalRevenue: 0,
        totalTicketsSold: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // Clear cache and reset filters
  const handleResetFilters = () => {
    // Clear cache
    const keys = Object.keys(sessionStorage);
    keys.forEach((key) => {
      if (key.startsWith("transactions_")) {
        sessionStorage.removeItem(key);
      }
    });

    setEventNameSearch("");
    setBuyerNameSearch("");
    setOrganizerNameSearch("");
    setDateRange([]);
    setStatusFilter(undefined);
    setTableFilters({
      category: [],
      paymentMethod: [],
      status: [],
    });
    setCurrentPage(1);
  };

  const handleDateRangeChange = (dates) => {
    setDateRange(dates || []);
    setCurrentPage(1); // QUAN TRỌNG: Reset về trang 1 khi thay đổi date range
  };

  // Effect để áp dụng filters khi có thay đổi - SỬA: Thêm currentPage vào dependency
  useEffect(() => {
    if (allTransactions.length > 0) {
      const currentAllFilters = {
        eventNameSearch,
        buyerNameSearch,
        organizerNameSearch,
        dateRange,
        statusFilter,
        tableFilters,
      };

      const newlyFiltered = applyAllFilters(allTransactions, currentAllFilters);
      setFilteredTransactions(newlyFiltered);

      const newStats = calculateStats(newlyFiltered);
      setStats(newStats);

      // KHÔNG reset currentPage ở đây nữa, chỉ reset khi filter thay đổi
    }
  }, [
    eventNameSearch,
    buyerNameSearch,
    organizerNameSearch,
    dateRange,
    statusFilter,
    tableFilters,
    allTransactions,
  ]);

  // Effect để gọi API - SỬA: Thêm currentPage vào dependency
  useEffect(() => {
    const currentFilters = {
      eventNameSearch,
      buyerNameSearch,
      organizerNameSearch,
      dateRange,
      statusFilter,
    };

    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchEventTransactions(currentFilters);
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchEventTransactions(currentFilters);
    }, 800); // Increased debounce for less API calls

    return () => clearTimeout(timeoutId);
  }, [
    eventNameSearch,
    buyerNameSearch,
    organizerNameSearch,
    dateRange,
    statusFilter,
  ]);

  // Lấy danh sách filters đang active
  const getActiveFilters = () => {
    const activeFilters = [];

    if (eventNameSearch)
      activeFilters.push({
        type: "event",
        value: eventNameSearch,
        color: "blue",
        display: `Sự kiện: "${eventNameSearch}"`,
      });
    if (buyerNameSearch)
      activeFilters.push({
        type: "buyer",
        value: buyerNameSearch,
        color: "green",
        display: `Người mua: "${buyerNameSearch}"`,
      });
    if (organizerNameSearch)
      activeFilters.push({
        type: "organizer",
        value: organizerNameSearch,
        color: "purple",
        display: `Người tổ chức: "${organizerNameSearch}"`,
      });
    if (dateRange && dateRange.length > 0)
      activeFilters.push({
        type: "date",
        value: dateRange,
        color: "orange",
        display: `Ngày: ${dateRange[0].format(
          "DD/MM/YYYY"
        )} - ${dateRange[1].format("DD/MM/YYYY")}`,
      });
    if (statusFilter)
      activeFilters.push({
        type: "status",
        value: statusFilter,
        color: "red",
        display: `Trạng thái: ${
          statusFilter === "paid"
            ? "Thành công"
            : statusFilter === "refunded"
            ? "Đã hoàn tiền"
            : "Thất bại"
        }`,
      });

    if (tableFilters.category && tableFilters.category.length > 0) {
      activeFilters.push({
        type: "category",
        value: tableFilters.category,
        color: "cyan",
        display: `Danh mục: ${tableFilters.category.join(", ")}`,
      });
    }

    if (tableFilters.paymentMethod && tableFilters.paymentMethod.length > 0) {
      activeFilters.push({
        type: "payment",
        value: tableFilters.paymentMethod,
        color: "geekblue",
        display: `Phương thức: ${tableFilters.paymentMethod.join(", ")}`,
      });
    }

    if (tableFilters.status && tableFilters.status.length > 0) {
      const statusDisplay = tableFilters.status
        .map((s) => (s === "paid" ? "Thành công" : "Thất bại"))
        .join(", ");
      activeFilters.push({
        type: "tableStatus",
        value: tableFilters.status,
        color: "volcano",
        display: `Trạng thái: ${statusDisplay}`,
      });
    }

    return activeFilters;
  };

  const activeFilters = getActiveFilters();

  return (
    <div style={{ padding: "24px" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* Thống kê tổng quan */}
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Tổng giao dịch"
                value={stats.totalTransactions}
                loading={loading}
                prefix={<ShoppingCartOutlined style={{ color: "#722ed1" }} />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Tổng doanh thu"
                value={stats.totalRevenue}
                loading={loading}
                prefix={<DollarOutlined style={{ color: "#52c41a" }} />}
                valueStyle={{ color: "#52c41a" }}
                formatter={(value) =>
                  `${Number(value).toLocaleString("vi-VN")} VNĐ`
                }
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Tổng tiền đã hoàn"
                value={stats.totalRefunded}
                loading={loading}
                prefix={<DollarOutlined style={{ color: "#ff4d4f" }} />}
                valueStyle={{ color: "#ff4d4f" }}
                formatter={(value) =>
                  `${Number(value).toLocaleString("vi-VN")} VNĐ`
                }
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Tổng số lượng vé đã bán"
                value={stats.totalTicketsSold}
                loading={loading}
                prefix={<NumberOutlined style={{ color: "#13c2c2" }} />}
                valueStyle={{ color: "#eb2f96" }}
              />
            </Card>
          </Col>
        </Row>

        {/* Bộ lọc và tìm kiếm */}
        <Card title="Bộ lọc giao dịch">
          <Space size="middle" wrap style={{ width: "100%" }}>
            <Input
              placeholder="Tên sự kiện..."
              prefix={<SearchOutlined />}
              style={{ width: 200 }}
              value={eventNameSearch}
              onChange={(e) => {
                setEventNameSearch(e.target.value);
                setCurrentPage(1); // Reset về trang 1 khi search
              }}
              allowClear
            />

            <Input
              placeholder="Người mua..."
              prefix={<UserOutlined />}
              style={{ width: 200 }}
              value={buyerNameSearch}
              onChange={(e) => {
                setBuyerNameSearch(e.target.value);
                setCurrentPage(1);
              }}
              allowClear
            />

            <Input
              placeholder="Người tổ chức..."
              prefix={<TeamOutlined />}
              style={{ width: 200 }}
              value={organizerNameSearch}
              onChange={(e) => {
                setOrganizerNameSearch(e.target.value);
                setCurrentPage(1);
              }}
              allowClear
            />

            <RangePicker
              placeholder={["Từ ngày", "Đến ngày"]}
              format="DD/MM/YYYY"
              value={dateRange}
              onChange={handleDateRangeChange}
              allowClear
              style={{ width: 250 }}
            />

            <Select
              placeholder="Trạng thái"
              style={{ width: 150 }}
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
              allowClear
            >
              <Option value="paid">Thành công</Option>
              <Option value="refunded">Đã hoàn tiền</Option>
              <Option value="cancelled">Thất bại</Option>
            </Select>

            <Button
              icon={<ReloadOutlined />}
              onClick={handleResetFilters}
              style={{ background: "#f0f0f0" }}
            >
              Reset
            </Button>

            <Tooltip title="Làm mới dữ liệu (xóa cache)">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  // Clear all cache
                  const keys = Object.keys(sessionStorage);
                  keys.forEach((key) => {
                    if (key.startsWith("transactions_")) {
                      sessionStorage.removeItem(key);
                    }
                  });
                  // Refetch
                  const currentFilters = {
                    eventNameSearch,
                    buyerNameSearch,
                    organizerNameSearch,
                    dateRange,
                    statusFilter,
                  };
                  fetchEventTransactions(currentFilters);
                }}
                type="primary"
              >
                Làm mới
              </Button>
            </Tooltip>
          </Space>

          {/* Hiển thị thông tin bộ lọc đang áp dụng */}
          {activeFilters.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Space size="small" wrap>
                <FilterOutlined />
                <span>Bộ lọc đang áp dụng:</span>
                {activeFilters.map((filter, index) => (
                  <Tag
                    key={index}
                    color={filter.color}
                    closable
                    onClose={() => {
                      switch (filter.type) {
                        case "event":
                          setEventNameSearch("");
                          break;
                        case "buyer":
                          setBuyerNameSearch("");
                          break;
                        case "organizer":
                          setOrganizerNameSearch("");
                          break;
                        case "date":
                          setDateRange([]);
                          break;
                        case "status":
                          setStatusFilter(undefined);
                          break;
                        case "category":
                          setTableFilters((prev) => ({
                            ...prev,
                            category: [],
                          }));
                          break;
                        case "payment":
                          setTableFilters((prev) => ({
                            ...prev,
                            paymentMethod: [],
                          }));
                          break;
                        case "tableStatus":
                          setTableFilters((prev) => ({ ...prev, status: [] }));
                          break;
                        default:
                          break;
                      }
                      setCurrentPage(1); // Reset về trang 1 khi đóng filter
                    }}
                  >
                    {filter.display}
                  </Tag>
                ))}
                <span style={{ color: "#1890ff" }}>
                  ({filteredTransactions.length} kết quả)
                </span>
              </Space>
            </div>
          )}
        </Card>

        {/* Bảng danh sách giao dịch */}
        <Card
          title={
            <Space>
              <span>Danh sách giao dịch sự kiện</span>
              {filteredTransactions.length > 0 && (
                <Tag color="processing">
                  Hiển thị {filteredTransactions.length} giao dịch
                </Tag>
              )}
            </Space>
          }
        >
          <Table
            columns={columns}
            dataSource={filteredTransactions}
            rowKey={(record) => record._id}
            loading={{
              spinning: loading,
              tip: loading
                ? "Đang tải giao dịch... (lần đầu có thể mất vài giây)"
                : undefined,
            }}
            pagination={{
              current: currentPage, // Sử dụng currentPage state
              pageSize: pageSize, // Sử dụng pageSize state
              total: filteredTransactions.length,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} của ${total} giao dịch`,
            }}
            onChange={handleTableChange}
            scroll={{ x: 1200 }}
            size="middle"
          />
        </Card>
      </Space>
    </div>
  );
}

export default ManagerRechange;
