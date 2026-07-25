import React, { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, View } from "react-native";

import OnboardingScreen1 from "../components/OnboardingScreen1";
import OnboardingScreen2 from "../components/OnboardingScreen2";
import OnboardingScreen3 from "../components/OnboardingScreen3";
import TabNavigator from "./TabNavigator";
import LoginScreen from "../components/auth/SignIn"; 
import RegisterScreen from "../components/auth/SignUp";
import ForgotPassword from "../components/auth/ForgotPassword";
import EventDetailScreen from "../components/usersScreen/EventDetailScreen";
import TicketPurchase from "../components/usersScreen/TicketPurchase";
import OTabNavigator from "./OTabNavigator";
import OEventDetail from "../components/usersScreen/OEventDetail";
const Stack = createNativeStackNavigator();

export default function StackNavigator() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    const checkAppState = async () => {
      try {
        const tutorialDone = await AsyncStorage.getItem("tutorialTKB");
        const userToken = await AsyncStorage.getItem("userToken");

        if (!tutorialDone) {
          setInitialRoute("Onboarding1");
        } else if (!userToken) {
          setInitialRoute("Login");
        } else {
          setInitialRoute("MainTabs");
        }
      } catch (error) {
        console.error("Error checking app state:", error);
        setInitialRoute("Onboarding1");
      }
    };

    checkAppState();
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#ea580c" />
      </View>
    );
  }

  return (
    
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRoute}
    >
      {/* Onboarding */}
      <Stack.Screen name="Onboarding1" component={OnboardingScreen1} />
      <Stack.Screen name="Onboarding2" component={OnboardingScreen2} />
      <Stack.Screen name="Onboarding3" component={OnboardingScreen3} />

      {/* Auth */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
      {/* Main */}
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="OMainTabs" component={OTabNavigator} />



      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="TicketChoose" component={TicketPurchase} />
      <Stack.Screen name="OEventCheck" component={OEventDetail} />
      
    </Stack.Navigator>

  );
}
