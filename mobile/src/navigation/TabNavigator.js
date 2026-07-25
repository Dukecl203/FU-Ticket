import React from "react";
import { Text, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, List, Ticket, User, Bell } from "lucide-react-native"; // import icon từ lucide
import HomeScreen from "../screens/HomeScreen";
import EventScreen from "../screens/EventScreen";
import TicketScreen from "../screens/TicketScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();
export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#E57C04",
        tabBarInactiveTintColor: "#616161",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        tabBarStyle: {
          height: 65,
          margin: 10,
          borderRadius: 20,
          paddingBottom: 6,
          paddingTop: 6,
          position: "absolute",
          backgroundColor: "#fff",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 8,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const iconProps = {
            color,
            size: 24,
            strokeWidth: focused ? 2.5 : 2,
          };

          switch (route.name) {
            case "Trang Chủ":
              return <Home {...iconProps} />;
            case "Sự Kiện":
              return <List {...iconProps} />;
            case "Vé Của Tôi":
              return <Ticket {...iconProps} />;
            case "Hồ Sơ":
              return <User {...iconProps} />;
            case "Thông Báo":
              return <Bell {...iconProps} />;
            default:
              return null;
          }
        },
      })}
    >
      <Tab.Screen name="Trang Chủ" component={HomeScreen} />
      <Tab.Screen name="Sự Kiện" component={EventScreen} />
      <Tab.Screen name="Vé Của Tôi" component={TicketScreen} />
      <Tab.Screen name="Hồ Sơ" component={ProfileScreen} />
      <Tab.Screen name="Thông Báo" component={NotificationsScreen} />
    </Tab.Navigator>
  );
}
