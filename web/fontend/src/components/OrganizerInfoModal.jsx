import React from "react";
import { Modal, Typography, Divider, Space, Button } from "antd";
import { MailOutlined, PhoneOutlined, InfoCircleOutlined } from "@ant-design/icons";

const { Title, Paragraph, Text } = Typography;

const OrganizerInfoModal = ({ visible, onClose }) => {
  return (
    <Modal
      title={
        <Space>
          <InfoCircleOutlined style={{ color: "#fa8c16" }} />
          <span>Thông tin liên hệ Organizer</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          Đã hiểu
        </Button>,
      ]}
      width={600}
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div>
          <Title level={4}>Quy định tạo sự kiện</Title>
          <Paragraph>
            Để tạo sự kiện trên nền tảng FUEvent, bạn cần có quyền Organizer.
            Hiện tại tài khoản của bạn không có quyền này.
          </Paragraph>
          <Paragraph>
            <Text strong>Nếu bạn muốn trở thành Organizer:</Text>
          </Paragraph>
          <ul>
            <li>Liên hệ với đội ngũ quản trị viên qua email hoặc hotline</li>
            <li>Điền form đăng ký và gửi yêu cầu</li>
            <li>Chờ phê duyệt từ quản trị viên</li>
            <li>Sau khi được phê duyệt, bạn sẽ có quyền tạo và quản lý sự kiện</li>
          </ul>
        </div>

        <Divider />

        <div>
          <Title level={4}>Thông tin liên hệ</Title>
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div>
              <Space>
                <MailOutlined style={{ color: "#fa8c16" }} />
                <Text strong>Email hỗ trợ:</Text>
              </Space>
              <div style={{ marginLeft: 24, marginTop: 4 }}>
                <Text copyable>support@fuevent.com</Text>
              </div>
            </div>

            <div>
              <Space>
                <PhoneOutlined style={{ color: "#fa8c16" }} />
                <Text strong>Hotline:</Text>
              </Space>
              <div style={{ marginLeft: 24, marginTop: 4 }}>
                <Text copyable>1900-xxxx</Text>
              </div>
            </div>

            <div>
              <Space>
                <MailOutlined style={{ color: "#fa8c16" }} />
                <Text strong>Email Organizer:</Text>
              </Space>
              <div style={{ marginLeft: 24, marginTop: 4 }}>
                <Text copyable>organizer@fuevent.com</Text>
              </div>
            </div>
          </Space>
        </div>

        <Divider />

        <div>
          <Title level={4}>Form đăng ký</Title>
          <Paragraph>
            Vui lòng gửi email đến địa chỉ trên với các thông tin sau:
          </Paragraph>
          <ul>
            <li>Họ và tên</li>
            <li>Email đăng ký</li>
            <li>Số điện thoại</li>
            <li>Lý do muốn trở thành Organizer</li>
            <li>Kinh nghiệm tổ chức sự kiện (nếu có)</li>
          </ul>
        </div>
      </Space>
    </Modal>
  );
};

export default OrganizerInfoModal;

