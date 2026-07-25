import {
  BarChartOutlined,
  CarryOutOutlined,
  DollarOutlined,
  HomeOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Layout, Menu } from "antd";
import classNames from "classnames/bind";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  Outlet,
} from "react-router-dom";
import AdminHeader from "./Components/HeaderAdmin/AdminHeader";
import styles from "./Index.module.scss";

const { Sider, Content } = Layout;
const cx = classNames.bind(styles);

function Admin() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedKey = location.pathname.split("/")[2] || "dashboard";

  if (location.pathname === "/admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const menuItems = [
    {
      key: "dashboard",
      icon: <HomeOutlined />,
      label: "Quản trị hệ thống",
      onClick: () => navigate("/admin/dashboard"),
    },
    {
      key: "users",
      icon: <UserOutlined />,
      label: "Quản lý người dùng",
      onClick: () => navigate("/admin/users"),
    },
    {
      key: "events",
      icon: <CarryOutOutlined />,
      label: "Quản lý sự kiện",
      onClick: () => navigate("/admin/events"),
    },
    {
      key: "transactions",
      icon: <DollarOutlined />,
      label: "Quản lý giao dịch",
      onClick: () => navigate("/admin/transactions"),
    },
    // {
    //   key: "advertise",
    //   icon:<BarChartOutlined />,
    //   label:"Quản lý quảng cáo",
    //   onClick: () => navigate("/admin/advertise"),
    // }
  ];

  return (
    <Layout className={cx("admin-layout")}>
      
      <Sider className={cx("sider")} width={280}>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          className={cx("menu")}
        />
      </Sider>

      <Layout>
        <AdminHeader />
        <Content className={cx("content")}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default Admin;

