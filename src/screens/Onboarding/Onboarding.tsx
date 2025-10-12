import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { TextInput, TouchableOpacity, Text, View, Button } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthStackParamList, RootStackParamList } from "../../navigation/AppNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Auth">;

const Onboarding = () => {
    const [name, setName] = useState('');
    const navigation = useNavigation<NavigationProp>();
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
            <Button title="CONNECT" onPress={() => navigation.replace("Main")} />
        </View>

    )
}

export default Onboarding;