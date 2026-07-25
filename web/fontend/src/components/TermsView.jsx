
import React, { useState } from "react";
import { Typography, Button } from "antd";
import { ArrowLeftOutlined, RightOutlined } from "@ant-design/icons";
import pdfProhibitedBusiness from "../assets/legal/6. Ticketbox_Danh_muc_hang_hoa_dich_cam_kinh_doanh_va_kinh_doanh_co_dieu_kien_19 12 2023.docx.pdf";
import pdfProhibitedAds from "../assets/legal/8. Ticketbox_Hang_hoa_dich_vu_cam_quang_cao_BTC_20 12 2023.docx.pdf";
import pdfContentApproval from "../assets/legal/ed68c21a99ea30caff3e1d8da88fc7b9.pdf";
const { Title, Paragraph } = Typography;

const TermsView = () => {
  const [activePdfUrl, setActivePdfUrl] = useState("");

  const items = [
    {
      key: "1",
      title: "1. Danh mục hàng hoá, dịch vụ cấm kinh doanh",
      url: pdfProhibitedBusiness,
    },
    {
      key: "2",
      title: "2. Danh mục hàng hoá, dịch vụ cấm quảng cáo",
      url: pdfProhibitedAds,
    },
    {
      key: "3",
      title: "3. Quy định kiểm duyệt nội dung & hình ảnh",
      url: pdfContentApproval,
    },
  ];

  const isViewingPdf = Boolean(activePdfUrl);

  const handleOpenItem = (item) => {
    setActivePdfUrl(item.url);
  };

  return (
    <div>
      <Title level={3} style={{ color: "#000000ff", marginBottom: 16 }}>
        Điều khoản cho Ban tổ chức
      </Title>

      {!isViewingPdf && (
        <div
          style={{
            background: "#fff",
            borderRadius: 8,
            padding: 12,
          }}
        >
          {items.map((item) => (
            <div
              key={item.key}
              onClick={() => handleOpenItem(item)}
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 12px",
                border: "1px solid #f0f0f0",
                borderRadius: 6,
                background: "#fff",
                marginBottom: 12,
              }}
            >
              <Paragraph style={{ margin: 0 }}>{item.title}</Paragraph>
              <RightOutlined style={{ color: "#8c8c8c" }} />
            </div>
          ))}
        </div>
      )}

      {isViewingPdf && (
        <div
          style={{
            background: "#fff",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => setActivePdfUrl("")}
            >
              Quay lại
            </Button>
          </div>
          <div style={{ height: "80vh" }}>
            <iframe
              title="Điều khoản PDF"
              src={activePdfUrl}
              style={{ border: 0, width: "100%", height: "100%" }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TermsView;
