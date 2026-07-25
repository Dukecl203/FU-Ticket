import React from "react";
import { View, Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, QrCode, Lightbulb, Settings, User } from "lucide-react-native";
import OEventScreen from "../screens/OEventScreen";
import AIScreen from "../screens/AIScreen";
import OProfileScreen from "../screens/OProfileScreen";

const Tab = createBottomTabNavigator();

export default function OTabNavigator() {
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
          marginTop: 2,
        },
        tabBarStyle: {
          height: 70,
          marginHorizontal: 10,
          marginBottom: 10,
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
            case "Dashboard":
              return <Home {...iconProps} />;
            case "Check-in":
              return <QrCode {...iconProps} />;
            case "AI":
              return (
                <View>
                  <Lightbulb {...iconProps} />
                  <View
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -10,
                      backgroundColor: "#E63946",
                      borderRadius: 8,
                      minWidth: 18,
                      height: 18,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: "700",
                      }}
                    >
                      9
                    </Text>
                  </View>
                </View>
              );
            case "Cài đặt":
              return <Settings {...iconProps} />;
            case "Hồ sơ":
              return <User {...iconProps} />;
            default:
              return null;
          }
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={OEventScreen} />
      <Tab.Screen name="AI" component={AIScreen} />
      <Tab.Screen name="Hồ sơ" component={OProfileScreen} />
    </Tab.Navigator>
  );
}
