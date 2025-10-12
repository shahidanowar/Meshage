import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import ChatScreen from "../screens/Chats/ChatScreen";
import FriendsScreen from "../screens/Friends/FriendsScreen";
import SettingsScreen from "../screens/Settings/SettingsScreen";
export type TabParamList = {
    Chats: undefined;
    Friends: undefined;
    Settings: undefined;
}

const Tab = createBottomTabNavigator<TabParamList>();

export const MainTabNavigator = () => (
  <Tab.Navigator>
    <Tab.Screen name="Chats" component={ChatScreen} />
    <Tab.Screen name="Friends" component={FriendsScreen} />
    <Tab.Screen name="Settings" component={SettingsScreen} /> 
  </Tab.Navigator>
);