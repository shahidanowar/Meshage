import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import your screens and the MainTabNavigator
import ChatScreen from '../screens/Chats/ChatScreen'; // This is your onboarding screen
import Onboarding from '../screens/Onboarding/Onboarding';
import { MainTabNavigator } from './MainTabNavigator'; // Assuming your tab navigator is in this file

// Define types for navigation (optional but recommended in TS)
export type AuthStackParamList = {
    Onboarding: undefined
    Chats: undefined;
};

export type RootStackParamList = {
    Auth: undefined; // AuthStackNavigator
    Main: undefined; // MainTabNavigator
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

const AuthNavigator = () => (
    <AuthStack.Navigator screenOptions={{ headerShown: true }}>
        <AuthStack.Screen name="Onboarding" component={Onboarding} />
    </AuthStack.Navigator>
);

const AppNavigator = () => {
    return (
        <RootStack.Navigator
            initialRouteName="Auth" // Always start with the Auth flow
            screenOptions={{ headerShown: false }}
        >
            <RootStack.Screen name="Auth" component={AuthNavigator} />
            <RootStack.Screen name="Main" component={MainTabNavigator} />
        </RootStack.Navigator>
    );
};

export default AppNavigator;
