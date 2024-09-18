import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import FormUsers from './FormUsers'; // Ajuste os caminhos conforme necessário
import CostCalculation from './CostCalculation';


const Stack = createStackNavigator();

export default function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="FormUsers" component={FormUsers} />
        <Stack.Screen name="UserProfile" component={UserProfile} />
        <Stack.Screen name="CostCalculation" component={CostCalculation} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}