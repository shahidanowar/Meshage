import React, { useEffect, useState } from "react";
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, Alert, NativeModules } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { StorageService } from "../../utils/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { MeshNetwork } = NativeModules;

const SettingsScreen = () => {
    const [username, setUsername] = useState<string>('');
    const [persistentId, setPersistentId] = useState<string>('');
    const [endpointId, setEndpointId] = useState<string>('');
    const [deviceIdentifier, setDeviceIdentifier] = useState<string>('');
    const [friendsCount, setFriendsCount] = useState<number>(0);
    const [friendRequestsCount, setFriendRequestsCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            setLoading(true);
            
            // Load username
            const savedUsername = await StorageService.getUsername();
            setUsername(savedUsername || 'User');
            
            // Load persistent ID
            const savedPersistentId = await StorageService.getPersistentId();
            setPersistentId(savedPersistentId);
            
            // Load friends count
            const friends = await StorageService.getFriends();
            setFriendsCount(friends.length);
            
            // Load friend requests count
            const requests = await StorageService.getFriendRequests();
            setFriendRequestsCount(requests.length);
            
            // Create device identifier (username|persistentId)
            const identifier = `${savedUsername || 'User'}|${savedPersistentId}`;
            setDeviceIdentifier(identifier);
            
            // Load endpoint ID from native module
            try {
                const localEndpointId = await MeshNetwork.getLocalEndpointId();
                setEndpointId(localEndpointId || 'Not connected yet');
            } catch (error) {
                console.log('Error getting endpoint ID:', error);
                setEndpointId('Not available');
            }
            
            setLoading(false);
        } catch (error) {
            console.error('Error loading user data:', error);
            setLoading(false);
        }
    };

    const handleClearData = () => {
        Alert.alert(
            'Clear All Data',
            'This will delete your username, friends list, and all app data. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.clear();
                        Alert.alert('Success', 'All data cleared. Please restart the app.');
                    }
                }
            ]
        );
    };

    const formatDeviceId = (id: string) => {
        // Show first 8 and last 4 characters for readability
        if (id.length > 12) {
            return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`;
        }
        return id;
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {loading ? (
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            ) : (
                <>
                    {/* User Profile Section */}
                    <View style={styles.profileSection}>
                        <View style={styles.avatarContainer}>
                            <Text style={styles.avatarText}>
                                {username.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <Text style={styles.name}>{username}</Text>
                        <Text style={styles.subtitle}>Mesh Network User</Text>
                    </View>

                    {/* QR Code Section */}
                    <View style={styles.qrSection}>
                        <Text style={styles.sectionTitle}>Your QR Code</Text>
                        <Text style={styles.sectionSubtitle}>
                            Share this with friends to connect
                        </Text>
                        <View style={styles.qrContainer}>
                            <QRCode 
                                value={persistentId} 
                                size={200}
                                backgroundColor="white"
                            />
                        </View>
                        <Text style={styles.qrLabel}>Scan to add me as friend</Text>
                    </View>

                    {/* Device Info Section */}
                    <View style={styles.infoSection}>
                        <Text style={styles.sectionTitle}>Device Information - for testing</Text>
                        
                        <View style={styles.infoCard}>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Username:</Text>
                                <Text style={styles.infoValue}>{username}</Text>
                            </View>
                            
                            <View style={styles.infoDivider} />
                            
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Full UUID:</Text>
                                <Text style={styles.infoValueTiny} numberOfLines={2}>
                                    {persistentId}
                                </Text>
                            </View>
                            
                            <View style={styles.infoDivider} />
                            
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Session Local ID:</Text>
                                <Text style={styles.infoValueSmall} numberOfLines={1}>
                                    {endpointId}
                                </Text>
                            </View>
                            
                            <View style={styles.infoDivider} />
                            
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Device Identifier:</Text>
                                <Text style={styles.infoValueTiny} numberOfLines={2}>
                                    {deviceIdentifier}
                                </Text>
                            </View>
                            
                            <View style={styles.infoDivider} />
                            
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Friends:</Text>
                                <Text style={styles.infoValue}>{friendsCount}</Text>
                            </View>
                            
                            <View style={styles.infoDivider} />
                            
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Friend Requests:</Text>
                                <Text style={styles.infoValue}>{friendRequestsCount}</Text>
                            </View>
                            
                            <View style={styles.infoNote}>
                                <Text style={styles.infoNoteText}>
                                    💡 Real endpoint IDs (like "2mxk") are shown in the peer list
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Network Info Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>📡 Mesh Network Status</Text>
                        <Text style={styles.cardText}>
                            Stay connected to discover nearby devices and chat with friends.
                        </Text>
                        <Text style={styles.warningText}>
                            ⚠️ Disconnecting will stop message delivery
                        </Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.actionsSection}>
                        <TouchableOpacity 
                            style={styles.dangerButton}
                            onPress={handleClearData}
                        >
                            <Text style={styles.dangerButtonText}>Clear All Data</Text>
                        </TouchableOpacity>
                        <Text style={styles.dangerHint}>
                            This will reset the app to initial state
                        </Text>
                    </View>
                </>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    contentContainer: {
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
    },
    profileSection: {
        alignItems: 'center',
        paddingVertical: 30,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#007aff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    avatarText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#222',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
    },
    qrSection: {
        backgroundColor: '#fff',
        padding: 20,
        marginTop: 20,
        marginHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#222',
        marginBottom: 5,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
    },
    qrContainer: {
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    qrLabel: {
        marginTop: 15,
        fontSize: 12,
        color: '#666',
    },
    infoSection: {
        marginTop: 20,
        marginHorizontal: 16,
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginTop: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    infoLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 16,
        color: '#222',
        fontWeight: '600',
    },
    infoValueSmall: {
        fontSize: 12,
        color: '#222',
        fontWeight: '600',
        maxWidth: '60%',
    },
    infoValueTiny: {
        fontSize: 10,
        color: '#666',
        maxWidth: '60%',
        textAlign: 'right',
    },
    infoDivider: {
        height: 1,
        backgroundColor: '#e0e0e0',
    },
    infoNote: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#f0f8ff',
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#007aff',
    },
    infoNoteText: {
        fontSize: 12,
        color: '#666',
        lineHeight: 18,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginTop: 20,
        marginHorizontal: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#222',
    },
    cardText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 10,
    },
    warningText: {
        fontSize: 13,
        color: '#ff9500',
        fontWeight: '500',
    },
    actionsSection: {
        marginTop: 30,
        marginHorizontal: 16,
        alignItems: 'center',
    },
    dangerButton: {
        backgroundColor: '#ff3b30',
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
    },
    dangerButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    dangerHint: {
        marginTop: 10,
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
    },
});

export default SettingsScreen;
