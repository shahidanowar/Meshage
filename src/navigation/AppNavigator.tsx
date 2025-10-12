import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import your screens and the MainTabNavigator
import HomeScreen from '../screens/Home/HomeScreen'; // This is your onboarding screen
import { MainTabNavigator } from './MainTabNavigator'; // Assuming your tab navigator is in this file

// Define types for navigation (optional but recommended in TS)
export type RootStackParamList = {
  Home: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <RootStack.Navigator
      initialRouteName="Home" // Always start with the Auth flow
      screenOptions={{ headerShown: true }}
    >
      <RootStack.Screen name="Home" component={HomeScreen} />
      {/* <RootStack.Screen name="Main" component={MainTabNavigator} /> */}
    </RootStack.Navigator>
  );
};

export default AppNavigator;
