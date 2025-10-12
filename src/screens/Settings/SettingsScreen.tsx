import React, { useEffect, useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";

const SettingsScreen = () => {
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        setTimeout(() => {
            setUserId("USER-987654");
        }, 1000);
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.name}>Faruk Khan</Text>
            {userId ? (
                <>
                    <Text style={styles.id}>ID - {userId}</Text>
                    <QRCode value={userId} size={200} />
                </>
            ) : (
                <Text>Loading user ID...</Text>
            )}
            <View style={styles.card}>
                <Text style={styles.title}>Stay connected to the network</Text>
                <Text>WARNING: Disconnecting will lead to loss in messages and connectivity</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
    },
    name: {
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 10,
    },
    id: {
        fontSize: 16,
        marginBottom: 20,
    },
     card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    elevation: 4, // shadow for Android
    shadowColor: '#000', // shadow for iOS
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
   title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#222',
  },
});

export default SettingsScreen;
