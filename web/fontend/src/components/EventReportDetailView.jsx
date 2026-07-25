import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Spin,
  Button,
  message,
  Collapse,
  Pagination,
  Dropdown,
  Tag,
  Space,
} from "antd";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

// Enable UTC plugin for dayjs
dayjs.extend(utc);
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  DownloadOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import axios from "axios";

// Constants
const CHART_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

const PAGE_SIZE = 10;

const EventReportDetailView = ({ eventId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    axios
      .get(`http://localhost:9999/api/events/${eventId}/report`)
      .then((res) => {
        setData(res.data);
      })
      .catch((error) => {
        console.error("Error loading event report:", error);
        console.error("Error response:", error.response?.data);
        message.error(
          `Không thể tải báo cáo sự kiện: ${
            error.response?.data?.message || error.message
          }`
        );
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  const revenueByDayData = useMemo(() => {
    if (!data?.orders?.length) return [];
    const dateKeyToTotals = new Map();
    data.orders.forEach(({ payment, finalAmount }) => {
      // Only include successful payments in charts (SUCCESS or paid)
      if (payment.status === "SUCCESS" || payment.status === "paid") {
        const dateKey = new Date(payment.created_at).toLocaleDateString();
        const existing = dateKeyToTotals.get(dateKey) || {
          revenue: 0,
          orders: 0,
        };
        existing.revenue += Number(finalAmount || payment.amount || 0);
        existing.orders += 1;
        dateKeyToTotals.set(dateKey, existing);
      }
    });
    return Array.from(dateKeyToTotals.entries())
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([date, v]) => ({ date, revenue: v.revenue, orders: v.orders }));
  }, [data]);

  const quantityByTypeData = useMemo(() => {
    const ticketQty = Number(data?.stats?.quantityByType?.ticket || 0);
    const merchQty = Number(data?.stats?.quantityByType?.merchandise || 0);
    const dataArray = [];
    if (ticketQty > 0)
      dataArray.push({ name: "Vé", value: ticketQty, key: "ticket" });
    if (merchQty > 0)
      dataArray.push({ name: "Merch", value: merchQty, key: "merchandise" });
    return dataArray;
  }, [data]);

  const productTypeMixData = useMemo(() => {
    if (!data?.orders?.length) return [];
    const typeToQty = new Map();
    data.orders.forEach(({ payment, items }) => {
      // Only include successful payments in charts (SUCCESS or paid)
      if (payment.status === "SUCCESS" || payment.status === "paid") {
        items.forEach((it) => {
          const type = it?.product?.type || "Khác";
          const qty = Number(it?.quantity || 0);
          typeToQty.set(type, (typeToQty.get(type) || 0) + qty);
        });
      }
    });
    return Array.from(typeToQty.entries()).map(([type, qty]) => ({
      name: type,
      value: qty,
    }));
  }, [data]);

  const [page, setPage] = useState(1);
  const paginatedOrders = useMemo(() => {
    const list = data?.orders || [];
    const start = (page - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  }, [data, page]);

  // Calculate scan statistics
  const scanStats = useMemo(() => {
    if (!data?.orders) return { scanned: 0, pending: 0 };

    let scanned = 0;
    let pending = 0;

    data.orders.forEach((order) => {
      order.items?.forEach((item) => {
        if (item.product?.type === "ticket") {
          if (item.scanStatus === "Scanned") {
            scanned++;
          } else {
            pending++;
          }
        }
      });
    });

    return { scanned, pending };
  }, [data]);

  // Export functions
  const exportToCSV = () => {
    if (!data) return;

    const csvData = [
      // Event Information
      ["THÔNG TIN SỰ KIỆN", ""],
      ["Tên sự kiện", data.event?.title || ""],
      ["Danh mục", data.event?.category_id?.name || ""],
      [
        "Bắt đầu",
        data.event?.start_time
          ? dayjs.utc(data.event.start_time).format("DD/MM/YYYY HH:mm") + " (UTC)"
          : "",
      ],
      [
        "Kết thúc",
        data.event?.end_time
          ? dayjs.utc(data.event.end_time).format("DD/MM/YYYY HH:mm") + " (UTC)"
          : "",
      ],
      ["Địa điểm", data.event?.location || ""],
      ["Trạng thái", data.event?.status || ""],
      ["", ""],

      // Statistics
      ["THỐNG KÊ DOANH THU", ""],
      ["Tổng đơn hàng", data.stats?.totalOrders || 0],
      ["Tổng sản phẩm", data.stats?.totalItems || 0],
      ["Doanh thu đã thanh toán", data.stats?.totalRevenuePaid || 0],
      ["Doanh thu chờ thanh toán", data.stats?.totalRevenuePending || 0],
      ["Vé đã bán", data.stats?.quantityByType?.ticket || 0],
      ["Merch đã bán", data.stats?.quantityByType?.merchandise || 0],
      ["", ""],

      // Products
      ["SẢN PHẨM", "", "", "", ""],
      ["Tên", "Loại", "Giá", "Tổng SL", "Đã bán"],
      ...(data.products?.map((p) => [
        p.name || "",
        p.type || "",
        p.price || 0,
        p.quantity_total || 0,
        p.quantity_sold || 0,
      ]) || []),
      ["", "", "", "", ""],

      // Orders
      ["ĐƠN HÀNG", "", "", "", "", "", ""],
      [
        "Người mua",
        "Thanh toán",
        "Ngày tạo",
        "Tổng đơn",
        "Sản phẩm",
        "SL",
        "Tổng",
      ],
      ...(data.orders?.flatMap(
        (order) =>
          order.items?.map((item, idx) => [
            idx === 0 ? order.order?.user_id?.full_name || "Ẩn danh" : "",
            idx === 0
              ? order.payment?.status === "SUCCESS" ||
                order.payment?.status === "paid"
                ? "Thành công"
                : "Chờ"
              : "",
            idx === 0
              ? order.payment?.created_at
                ? new Date(order.payment.created_at).toLocaleString()
                : ""
              : "",
            idx === 0 ? order.finalAmount || order.paymentAmount || 0 : "",
            item.product?.name || "",
            item.quantity || 1,
            item.total_price || item.price * (item.quantity || 1) || 0,
          ]) || []
      ) || []),
    ];

    // Create CSV content with proper UTF-8 encoding
    const csvContent = csvData
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    // Create blob with UTF-8 BOM for proper Excel compatibility
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `bao-cao-su-kien-${
      data.event?.title?.replace(/[^a-zA-Z0-9]/g, "-") || "unknown"
    }-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    message.success("Xuất file CSV thành công!");
  };

  const exportToExcel = () => {
    if (!data) return;

    // Prepare Excel data with proper formatting
    const excelData = [
      // Event Information
      ["THÔNG TIN SỰ KIỆN", ""],
      ["Tên sự kiện", data.event?.title || ""],
      ["Danh mục", data.event?.category_id?.name || ""],
      [
        "Bắt đầu",
        data.event?.start_time
          ? dayjs.utc(data.event.start_time).format("DD/MM/YYYY HH:mm") + " (UTC)"
          : "",
      ],
      [
        "Kết thúc",
        data.event?.end_time
          ? dayjs.utc(data.event.end_time).format("DD/MM/YYYY HH:mm") + " (UTC)"
          : "",
      ],
      ["Địa điểm", data.event?.location || ""],
      ["Trạng thái", data.event?.status || ""],
      ["", ""],

      // Statistics
      ["THỐNG KÊ DOANH THU", ""],
      ["Tổng đơn hàng", data.stats?.totalOrders || 0],
      ["Tổng sản phẩm", data.stats?.totalItems || 0],
      ["Doanh thu đã thanh toán", data.stats?.totalRevenuePaid || 0],
      ["Doanh thu chờ thanh toán", data.stats?.totalRevenuePending || 0],
      ["Vé đã bán", data.stats?.quantityByType?.ticket || 0],
      ["Merch đã bán", data.stats?.quantityByType?.merchandise || 0],
      ["", ""],

      // Products
      ["SẢN PHẨM", "", "", "", ""],
      ["Tên", "Loại", "Giá", "Tổng SL", "Đã bán"],
      ...(data.products?.map((p) => [
        p.name || "",
        p.type || "",
        p.price || 0,
        p.quantity_total || 0,
        p.quantity_sold || 0,
      ]) || []),
      ["", "", "", "", ""],

      // Orders
      ["ĐƠN HÀNG", "", "", "", "", "", ""],
      [
        "Người mua",
        "Thanh toán",
        "Ngày tạo",
        "Tổng đơn",
        "Sản phẩm",
        "SL",
        "Tổng",
      ],
      ...(data.orders?.flatMap(
        (order) =>
          order.items?.map((item, idx) => [
            idx === 0 ? order.order?.user_id?.full_name || "Ẩn danh" : "",
            idx === 0
              ? order.payment?.status === "SUCCESS" ||
                order.payment?.status === "paid"
                ? "Thành công"
                : "Chờ"
              : "",
            idx === 0
              ? order.payment?.created_at
                ? new Date(order.payment.created_at).toLocaleString()
                : ""
              : "",
            idx === 0 ? order.finalAmount || order.paymentAmount || 0 : "",
            item.product?.name || "",
            item.quantity || 1,
            item.total_price || item.price * (item.quantity || 1) || 0,
          ]) || []
      ) || []),
    ];

    // Create Excel content with proper CSV format (Excel opens CSV perfectly)
    const excelContent = excelData
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    // Create blob with UTF-8 BOM for proper Excel compatibility
    const blob = new Blob(["\uFEFF" + excelContent], {
      type: "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `bao-cao-su-kien-${
      data.event?.title?.replace(/[^a-zA-Z0-9]/g, "-") || "unknown"
    }-${new Date().toISOString().split("T")[0]}-excel.csv`;
    link.click();
    message.success("Xuất file Excel thành công!");
  };

  const exportMenuItems = [
    {
      key: "csv",
      icon: <DownloadOutlined />,
      label: "Xuất CSV",
      onClick: exportToCSV,
    },
    {
      key: "excel",
      icon: <FileExcelOutlined />,
      label: "Xuất Excel",
      onClick: exportToExcel,
    },
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0 }}>Báo Cáo Sự Kiện</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {data && (
            <Dropdown
              menu={{ items: exportMenuItems }}
              placement="bottomRight"
              trigger={["click"]}
            >
              <Button icon={<DownloadOutlined />} type="primary">
                Xuất báo cáo
              </Button>
            </Dropdown>
          )}
          {onBack && <Button onClick={onBack}>Quay lại</Button>}
        </div>
      </div>
      {loading ? (
        <Spin style={{ display: "block", margin: "24px auto" }} />
      ) : data ? (
        <>
          <Card size="small" title="Thông tin sự kiện">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <div>
                <b>Tên:</b> {data.event?.title}
              </div>
              <div>
                <b>Danh mục:</b> {data.event?.category_id?.name}
              </div>
              <div>
                <b>Bắt đầu:</b>{" "}
                {dayjs.utc(data.event?.start_time).format("DD/MM/YYYY HH:mm")} (UTC)
              </div>
              <div>
                <b>Kết thúc:</b>{" "}
                {dayjs.utc(data.event?.end_time).format("DD/MM/YYYY HH:mm")} (UTC)
              </div>
              <div>
                <b>Địa điểm:</b> {data.event?.location}
              </div>
              <div>
                <b>Trạng thái:</b> {data.event?.status}
              </div>
            </div>
          </Card>

          <Card
            size="small"
            title="Thống kê doanh thu"
            extra={
              <span
                style={{
                  fontSize: "12px",
                  color: "#666",
                  fontWeight: "normal",
                }}
              >
                * Doanh thu = Tổng số tiền đã thanh toán thành công
              </span>
            }
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
              }}
            >
              <div>
                <b>Đơn hàng thành công:</b> {data.stats?.totalOrders || 0}
              </div>
              <div>
                <b>Tổng sản phẩm đã bán:</b> {data.stats?.totalItems || 0}
              </div>
              <div style={{ gridColumn: "span 1" }}>
                <b>Doanh thu thực tế (đã thanh toán):</b>{" "}
                <span
                  style={{
                    color: "#52c41a",
                    fontSize: "16px",
                    fontWeight: "bold",
                  }}
                >
                  {new Intl.NumberFormat().format(
                    data.stats?.totalRevenuePaid || 0
                  )}{" "}
                  đ
                </span>
              </div>
              <div>
                <b>Chờ thanh toán:</b>{" "}
                <span style={{ color: "#faad14" }}>
                  {new Intl.NumberFormat().format(
                    data.stats?.totalRevenuePending || 0
                  )}{" "}
                  đ
                </span>
              </div>
              <div>
                <b>Vé đã bán:</b> {data.stats?.quantityByType?.ticket || 0}
              </div>
              <div>
                <b>Merch đã bán:</b>{" "}
                {data.stats?.quantityByType?.merchandise || 0}
              </div>
            </div>
          </Card>

          <Card size="small" title="Biểu đồ">
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}
            >
              <div style={{ height: 260 }}>
                <b style={{ display: "block", marginBottom: 8 }}>
                  Doanh thu theo ngày
                </b>
                {revenueByDayData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="90%">
                    <LineChart
                      data={revenueByDayData}
                      margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis
                        yAxisId="left"
                        tickFormatter={(v) => new Intl.NumberFormat().format(v)}
                      />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip
                        formatter={(value) =>
                          new Intl.NumberFormat().format(Number(value))
                        }
                      />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="revenue"
                        name="Doanh thu"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="orders"
                        name="Số đơn"
                        stroke="#10b981"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      color: "#888",
                    }}
                  >
                    Chưa có dữ liệu doanh thu theo ngày
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <div style={{ height: 260 }}>
                  <b style={{ display: "block", marginBottom: 8 }}>
                    Tỷ lệ số lượng theo loại
                  </b>
                  {quantityByTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="90%">
                      <PieChart>
                        <Pie
                          data={quantityByTypeData}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={80}
                          label
                        >
                          {quantityByTypeData.map((entry, idx) => (
                            <Cell
                              key={entry.key || idx}
                              fill={CHART_COLORS[idx % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        color: "#888",
                      }}
                    >
                      Chưa có dữ liệu số lượng
                    </div>
                  )}
                </div>

                <div style={{ height: 260 }}>
                  <b style={{ display: "block", marginBottom: 8 }}>
                    Cơ cấu sản phẩm đã bán
                  </b>
                  {productTypeMixData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="90%">
                      <BarChart
                        data={productTypeMixData}
                        margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="Số lượng" fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        color: "#888",
                      }}
                    >
                      Chưa có dữ liệu sản phẩm đã bán
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card size="small" title={`Sản phẩm (${data.products?.length || 0})`}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                gap: 8,
              }}
            >
              <b>Tên</b>
              <b>Loại</b>
              <b>Giá</b>
              <b>Tổng SL</b>
              <b>Đã bán</b>
              {data.products?.map((p) => (
                <React.Fragment key={p._id}>
                  <div>{p.name}</div>
                  <div>{p.type}</div>
                  <div>{new Intl.NumberFormat().format(p.price)} đ</div>
                  <div>{p.quantity_total || 0}</div>
                  <div>{p.quantity_sold || 0}</div>
                </React.Fragment>
              ))}
            </div>
          </Card>

          <Card
            size="small"
            title={`Đơn hàng (${data.orders?.length || 0})`}
            extra={
              scanStats.scanned + scanStats.pending > 0 && (
                <Space>
                  <span style={{ fontSize: "12px", color: "#666" }}>
                    Đã quét: {scanStats.scanned} | Chưa quét:{" "}
                    {scanStats.pending}
                  </span>
                </Space>
              )
            }
          >
            {data.orders?.length ? (
              <div style={{ display: "grid", gap: 12 }}>
                <Collapse>
                  {paginatedOrders.map(
                    (
                      {
                        payment,
                        order,
                        items,
                        finalAmount,
                        paymentAmount,
                        discountSavings,
                      },
                      idx
                    ) => (
                      <Collapse.Panel
                        key={payment._id || idx}
                        header={
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "2fr 1fr 1fr 1fr",
                              gap: 8,
                              width: "100%",
                            }}
                          >
                            <div>
                              <b>Người mua:</b>{" "}
                              {payment.user_id?.full_name ||
                                order.user_id?.full_name ||
                                "Ẩn danh"}
                              {(payment.user_id?.email ||
                                order.user_id?.email) &&
                              (payment.user_id?.email ||
                                order.user_id?.email) !== "N/A"
                                ? ` (${
                                    payment.user_id?.email ||
                                    order.user_id?.email
                                  })`
                                : ""}
                            </div>
                            <div>
                              <b>Thanh toán:</b>{" "}
                              {payment.status === "SUCCESS" ||
                              payment.status === "paid"
                                ? "✅ Thành công"
                                : payment.status === "PENDING" ||
                                  payment.status === "pending"
                                ? "⏳ Chờ"
                                : "❌ Thất bại"}
                            </div>
                            <div>
                              <b>Ngày tạo:</b>{" "}
                              {new Date(payment.created_at).toLocaleString()}
                            </div>
                            <div>
                              <b>Tổng đơn:</b>{" "}
                              {new Intl.NumberFormat().format(
                                finalAmount ||
                                  paymentAmount ||
                                  payment.amount ||
                                  0
                              )}{" "}
                              đ
                              {discountSavings > 0 && (
                                <span
                                  style={{ color: "#52c41a", fontSize: "12px" }}
                                >
                                  {" "}
                                  (-
                                  {new Intl.NumberFormat().format(
                                    discountSavings
                                  )}{" "}
                                  đ)
                                </span>
                              )}
                            </div>
                          </div>
                        }
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "2fr 1fr 1fr 1fr 140px",
                            gap: 8,
                          }}
                        >
                          <b>Sản phẩm</b>
                          <b>Loại</b>
                          <b>SL</b>
                          <b>Tổng</b>
                          <b>Trạng thái quét</b>
                          {items.map((it) => (
                            <React.Fragment key={it._id}>
                              <div>{it.product?.name}</div>
                              <div>{it.product?.type}</div>
                              <div>{it.quantity || 1}</div>
                              <div>
                                {new Intl.NumberFormat().format(
                                  it.total_price ||
                                    it.price * (it.quantity || 1)
                                )}{" "}
                                đ
                              </div>
                              <div>
                                {it.product?.type === "ticket" ? (
                                  it.scanStatus === "Scanned" ? (
                                    <Tag
                                      icon={<CheckCircleOutlined />}
                                      color="success"
                                    >
                                      Đã quét
                                    </Tag>
                                  ) : (
                                    <Tag
                                      icon={<ClockCircleOutlined />}
                                      color="warning"
                                    >
                                      Chưa quét
                                    </Tag>
                                  )
                                ) : (
                                  <span style={{ color: "#999" }}>-</span>
                                )}
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      </Collapse.Panel>
                    )
                  )}
                </Collapse>
                <Pagination
                  current={page}
                  pageSize={PAGE_SIZE}
                  total={data.orders.length}
                  onChange={(p) => setPage(p)}
                  showSizeChanger={false}
                />
              </div>
            ) : (
              <div style={{ color: "#888" }}>Chưa có đơn hàng.</div>
            )}
          </Card>
        </>
      ) : (
        <div style={{ color: "#888" }}>Không có dữ liệu báo cáo.</div>
      )}
    </div>
  );
};

export default EventReportDetailView;
