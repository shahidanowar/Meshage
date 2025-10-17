import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Import your screens and the MainTabNavigator
import ChatScreen from '../screens/Chats/ChatScreen'; // This is your onboarding screen
import Onboarding from '../screens/Onboarding/Onboarding';
import { MainTabNavigator } from './MainTabNavigator'; // Assuming your tab navigator is in this file
import { StorageService } from '../utils/storage';

export type RootStackParamList = {
    Auth: undefined; // AuthStackNavigator
    Main: undefined; // MainTabNavigator
};

// Define types for navigation (optional but recommended in TS)
export type AuthStackParamList = {
    Onboarding: undefined
    Chats: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator = () => (
    <AuthStack.Navigator screenOptions={{ headerShown: true }}>
        <AuthStack.Screen name="Onboarding" component={Onboarding} />
    </AuthStack.Navigator>
);

const AppNavigator = () => {
    const [initialRoute, setInitialRoute] = useState<'Auth' | 'Main' | null>(null);

    useEffect(() => {
        const checkOnboardingStatus = async () => {
            try {
                const isComplete = await StorageService.isOnboardingComplete();
                
                if (isComplete) {
                    console.log('Onboarding complete - navigating to Main');
                    setInitialRoute('Main');
                } else {
                    console.log('Onboarding not complete - showing onboarding');
                    setInitialRoute('Auth');
                }
            } catch (error) {
                console.error('Error checking onboarding:', error);
                setInitialRoute('Auth'); // Default to onboarding on error
            }
        };

        checkOnboardingStatus();
    }, []);

    // Show loading screen while checking
    if (initialRoute === null) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007aff" />
            </View>
        );
    }

    return (
        <RootStack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{ headerShown: false }}
        >
            <RootStack.Screen name="Auth" component={AuthNavigator} />
            <RootStack.Screen name="Main" component={MainTabNavigator} />
        </RootStack.Navigator>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1c1c1e',
    },
});

export default AppNavigator;
