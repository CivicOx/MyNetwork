import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import PeopleScreen from './src/screens/PeopleScreen';
import PersonDetailScreen from './src/screens/PersonDetailScreen';
import AddPersonScreen from './src/screens/AddPersonScreen';
import NetworkGraphScreen from './src/screens/NetworkGraphScreen';
import AddConnectionScreen from './src/screens/AddConnectionScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import DiscoverScreen from './src/screens/DiscoverScreen';

const Tab = createBottomTabNavigator();
const PeopleStack = createNativeStackNavigator();
const GraphStack = createNativeStackNavigator();

const screenOpts = {
  headerStyle: { backgroundColor: '#1e293b' },
  headerTintColor: '#f1f5f9',
  headerTitleStyle: { fontWeight: '700' },
};

function PeopleNavigator() {
  return (
    <PeopleStack.Navigator screenOptions={screenOpts}>
      <PeopleStack.Screen name="People" component={PeopleScreen} options={{ title: 'My Network' }} />
      <PeopleStack.Screen name="PersonDetail" component={PersonDetailScreen} options={{ title: 'Person' }} />
      <PeopleStack.Screen name="AddPerson" component={AddPersonScreen} options={{ title: 'Add Person' }} />
    </PeopleStack.Navigator>
  );
}

function GraphNavigator() {
  return (
    <GraphStack.Navigator screenOptions={screenOpts}>
      <GraphStack.Screen
        name="NetworkGraph"
        component={NetworkGraphScreen}
        options={{ headerShown: false }}
      />
      <GraphStack.Screen name="PersonDetail" component={PersonDetailScreen} options={{ title: 'Person' }} />
      <GraphStack.Screen name="AddPerson" component={AddPersonScreen} options={{ title: 'Add Person' }} />
      <GraphStack.Screen name="AddConnection" component={AddConnectionScreen} options={{ title: 'Add Connection' }} />
      <GraphStack.Screen name="Discover" component={DiscoverScreen} options={{ title: 'Discover Connections', ...screenOpts }} />
    </GraphStack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: { backgroundColor: '#1e293b', borderTopColor: '#334155' },
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: '#64748b',
          tabBarIcon: ({ color, size }) => {
            const icons = { Network: 'people', Graph: 'git-network', Profile: 'person-circle' };
            return <Ionicons name={icons[route.name]} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Network" component={PeopleNavigator} />
        <Tab.Screen name="Graph" component={GraphNavigator} />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ headerShown: true, ...screenOpts }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
