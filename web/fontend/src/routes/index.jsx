import Layout from "../component/Layout/Layout";
import Home from "../component/heroComponent/Home.jsx";
import Banner from "../component/heroComponent/Banner.jsx";
import ListEvent from "../component/listEvents/App.jsx";
import Detail from "../component/detailEvent/App.jsx";
import BuyProduct from "../component/buyProduct/App.jsx";
import Firm from "../component/confirm/Firm.jsx";
import Query from "../component/QueryTicket/App.jsx";
import MyTicket from "../component/myTickets/App.jsx";
import DetailTicket from "../component/detailTickets/App.jsx";
import SignIn from "../Pages/SignIn.jsx";
import SignUp from "../Pages/SignUp.jsx";
import { ForgotPassword } from "../Pages/ForgotPassword.jsx";
import ResetPassword from "../Pages/ResetPassword.jsx";
import PasswordSetup from "../Pages/PasswordSetup.jsx";

import Profile from "../Pages/Profile/Profile.jsx";
import UserPage from "../Pages/User/UserPage.jsx";

import Admin from "../Pages/Admin/index";
import Dashboard from "../Pages/Admin/Components/Dashboard/Dashboard";
import ManageEvents from "../Pages/Admin/Components/ManageEvents/ManageEvents";
import ViewEventsDetail from "../Pages/Admin/Components/ManageEvents/ViewEventsDetail.jsx";
import ManageUsers from "../Pages/Admin/Components/ManageUsers/ManageUsers";
import ManagerRechange from "../Pages/Admin/Components/ManagerRechange/ManagerRechange";

import Organizer from "../Pages/ogarnizerEventManage.jsx";

import AdminRoute from "./AdminRoute";
import PrivateRoute from "./PrivateRoute.jsx";
import EventSuggestions from "../component/renderAIEvent/EventSuggestions.jsx";
import ManageAdvertise from "../Pages/Admin/Components/ManageAdvertise/ManageAdvertise.jsx";
import SuggestAI from "../component/renderAIEvent/App.jsx";

import AccessDenied from "../Pages/SupportPages/AccessDenied/AccessDenied";
import NotFound from "../Pages/SupportPages/NotFound/NotFound";
import CheckIn from "../component/checkInTicket/App.jsx";
import WalletCallback from "../component/confirm/WalletCallback.jsx";
import FilterAI from "../component/filterAi/App.jsx";

export const publicRoutes = [
  {
    path: "/",
    element: <Layout />,
    children: [{ path: "", element: <Home /> }],
  },

  // --- Admin Routes ---
  {
    element: <AdminRoute />,
    children: [
      {
        path: "/admin",
        element: <Admin />,
        children: [
          { path: "dashboard", element: <Dashboard /> },
          { path: "users", element: <ManageUsers /> },
          { path: "events", element: <ManageEvents /> },
          { path: "events/:id", element: <ViewEventsDetail /> },
          { path: "transactions", element: <ManagerRechange /> },
          { path: "advertise", element: <ManageAdvertise /> },
        ],
      },
    ],
  },

  // --- Auth Routes ---
  { path: "/signin", element: <SignIn /> },
  { path: "/signup", element: <SignUp /> },

  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "/setup-password", element: <PasswordSetup /> },

  // --- User/Profile Routes ---
  {
    path: "/profile/*",
    element: (
      <PrivateRoute>
        <Profile />
      </PrivateRoute>
    ),
  },
  {
    path: "/profile/tickets",
    element: (
      <PrivateRoute>
        <MyTicket />
      </PrivateRoute>
    ),
  },
  {
    path: "/profile/tickets/detail/:id",
    element: (
      <PrivateRoute>
        <DetailTicket />
      </PrivateRoute>
    ),
  },
  { path: "/user/:id", element: <UserPage /> },

  // --- Event & Ticket Routes ---
  { path: "/events", element: <ListEvent /> },
  { path: "/event/:id", element: <Detail /> },
  { path: "/banner", element: <Banner /> },
  {
    path: "/query",
    element: (
      <PrivateRoute>
        <Query />
      </PrivateRoute>
    ),
  },
  {
    path: "/checkout",
    element: (
      <PrivateRoute>
        <BuyProduct />
      </PrivateRoute>
    ),
  },
  {
    path: "/wallet",
    element: (
      <PrivateRoute>
        <WalletCallback />
      </PrivateRoute>
    ),
  },
  {
    path: "/firm",
    element: (
      <PrivateRoute>
        <Firm />
      </PrivateRoute>
    ),
  },

  // --- Organizer ---
  {
    path: "/organizer/*",
    element: (
      <PrivateRoute>
        <Organizer />
      </PrivateRoute>
    ),
  },
  { path: "/organizer/events/:eventId/pending", element: <CheckIn /> },
  // --- Support Pages ---
  { path: "/access-denied", element: <AccessDenied /> },
  { path: "*", element: <NotFound /> },
  {
    path: "/suggestions",
    element: (
      <PrivateRoute>
        <SuggestAI />
      </PrivateRoute>
    ),
  },
  {
    path: "/filterAI",
    element: (
      <PrivateRoute>
        <FilterAI />
      </PrivateRoute>
    ),
  },
];
