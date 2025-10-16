import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import ChatScreen from "../screens/Chats/ChatScreen";
import FriendsScreen from "../screens/Friends/FriendsScreen";
import PersonalChatScreen from "../screens/Friends/PersonalChatScreen";
import SettingsScreen from "../screens/Settings/SettingsScreen";

export type TabParamList = {
    Chats: undefined;
    Friends: undefined;
    Settings: undefined;
}

export type FriendsStackParamList = {
    FriendsList: undefined;
    PersonalChat: {
        friendId: string;
        friendName: string;
        friendAddress?: string;
    };
}

const Tab = createBottomTabNavigator<TabParamList>();
const FriendsStack = createNativeStackNavigator<FriendsStackParamList>();

const FriendsStackNavigator = () => (
    <FriendsStack.Navigator screenOptions={{ headerShown: false }}>
        <FriendsStack.Screen name="FriendsList" component={FriendsScreen} />
        <FriendsStack.Screen name="PersonalChat" component={PersonalChatScreen} />
    </FriendsStack.Navigator>
);

export const MainTabNavigator = () => (
  <Tab.Navigator>
    <Tab.Screen name="Chats" component={ChatScreen} />
    <Tab.Screen name="Friends" component={FriendsStackNavigator} options={{ headerShown: false }} />
    <Tab.Screen name="Settings" component={SettingsScreen} /> 
  </Tab.Navigator>
);