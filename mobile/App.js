import { NavigationContainer } from "@react-navigation/native";
import StackNavigator from "./src/navigation/StackNavigator";
import Toast from "react-native-toast-message";
export default function App() {
  return (<>
    <NavigationContainer>
      <StackNavigator />
    </NavigationContainer>
    
    <Toast />
    </>
  );
}
