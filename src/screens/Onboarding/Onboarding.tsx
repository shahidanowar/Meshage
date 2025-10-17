import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { TextInput, TouchableOpacity, Text, View, Button, Alert } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthStackParamList, RootStackParamList } from "../../navigation/AppNavigator";
import { StorageService } from "../../utils/storage";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Auth">;

const Onboarding = () => {
    const [name, setName] = useState('');
    const navigation = useNavigation<NavigationProp>();
    
    const handleConnect = async () => {
        if (!name.trim()) {
            Alert.alert('Name Required', 'Please enter your name to continue');
            return;
        }
        
        // Save username and set onboarding completed or not
        await StorageService.saveUsername(name.trim());
        
        // Navigate to main screen
        navigation.replace("Main");
    };
    
    return (
        <View>
            <Text>Enter your name: </Text>
            <Text>(this will be displayed to your friends)</Text>
            
            <TextInput
                placeholder="Your name"
                placeholderTextColor="gray"
                value={name}
                onChangeText={setName}
            />
            <Button title="CONNECT" onPress={handleConnect} />
        </View>
    )
}

export default Onboarding;