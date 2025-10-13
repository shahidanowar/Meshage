# P2P Mesh Network Implementation Guide

## Overview
This application implements a fully functional **Mesh Network using Google Nearby Connections API** for Android devices, enabling decentralized peer-to-peer communication without the need for internet or centralized servers.

### Why Nearby Connections?
- **Multi-Protocol**: Uses WiFi, Bluetooth, and BLE automatically
- **More Reliable**: Better than WiFi Direct (P2P) alone
- **Automatic Fallback**: Switches between protocols seamlessly
- **No BUSY Errors**: More stable than WiFi P2P Manager
- **Better Mesh Support**: Designed for P2P_CLUSTER strategy

## Features Implemented

### ✅ Core Mesh Network Capabilities
1. **Peer Discovery** - Scan and find nearby devices using Nearby Connections
2. **Peer Connection** - Connect to discovered peers to form a mesh network
3. **Auto-Accept** - Automatically accepts all connection requests for mesh
4. **Real-time Messaging** - Send and receive messages across the mesh
5. **Message Routing** - Messages are automatically forwarded to all connected peers (flood routing)
6. **Multi-hop Communication** - Messages reach devices not directly connected
7. **Connection Monitoring** - Track connected/disconnected peers in real-time
8. **Multi-Protocol** - Works over WiFi, Bluetooth, and BLE simultaneously

### 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│           ChatScreen.tsx (React Native)         │
│  - Discovery UI                                 │
│  - Peer List                                    │
│  - Chat Interface                               │
│  - Connection Status                            │
└────────────────┬────────────────────────────────┘
                 │ Bridge Events
┌────────────────▼────────────────────────────────┐
│       MeshNetworkModule.kt (Android)            │
│  - Nearby Connections Client                    │
│  - Endpoint Discovery Callback                  │
│  - Connection Lifecycle Callback                │
│  - Payload Callback (Messages)                  │
│  - Message Routing (Flood Algorithm)            │
│  - Auto-Accept Connections                      │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│    Google Nearby Connections API                │
│  - WiFi Direct                                  │
│  - Bluetooth Classic                            │
│  - Bluetooth Low Energy (BLE)                   │
│  - Automatic Protocol Selection                 │
└─────────────────────────────────────────────────┘
```

## How It Works

### 1. **Discovery Phase**
- Device A starts **advertising** (broadcasts itself) AND **discovery** (scans for others)
- Device B does the same
- Both devices discover each other via WiFi, Bluetooth, or BLE
- Nearby API automatically chooses the best protocol

### 2. **Connection Phase**
- Device A initiates connection to Device B (or vice versa)
- Connection request is **auto-accepted** by the receiver
- Nearby Connections establishes bidirectional communication channel
- Both devices can now exchange messages
- No Group Owner concept - all devices are peers

### 3. **Messaging Phase**
- Messages are sent as Payload (byte arrays)
- When a device receives a message, it:
  1. Emits the message to the UI
  2. **Forwards** it to all other connected peers (except sender)
- **Mesh Routing**: Messages automatically propagate through the network

### 4. **Multi-hop Mesh Example**
```
Device A ←→ Device B ←→ Device C
              ↓
          Device D

Message from A:
1. A sends to B
2. B receives, forwards to C and D
3. C receives from B, forwards to its peers
4. All devices eventually receive the message
```

## Testing Instructions

### Prerequisites
- 2 or more Android devices (Android 4.0+, recommended Android 8.0+)
- WiFi enabled on all devices
- Location permissions granted
- App installed on all devices

### Step-by-Step Testing

#### **Test 1: Two Device Connection**
1. **Device A:**
   - Open app
   - Tap "Discover Peers"
   - Wait for Device B to appear
   - Tap "Connect" on Device B

2. **Device B:**
   - Open app
   - Should automatically see connection request
   - Connection establishes

3. **Verify:**
   - Both devices show "Connected" status
   - One shows "👑 Group Owner"
   - Other shows "🔗 Connected"

4. **Test Messaging:**
   - Type message on Device A → Send
   - Verify message appears on Device B
   - Reply from Device B
   - Verify bidirectional communication

#### **Test 2: Three Device Mesh**
1. **Setup:**
   - Device A connects to Device B (B becomes GO)
   - Device C discovers and connects to Device B

2. **Topology:**
   ```
   A ←→ B (GO) ←→ C
   ```

3. **Test Mesh Routing:**
   - Send message from A
   - Verify: B receives it, C receives it
   - Send message from C
   - Verify: B receives it, A receives it
   - **A and C communicate through B (mesh routing)**

#### **Test 3: Disconnect/Reconnect**
1. Disconnect Device A
2. Verify other devices show "Peer disconnected"
3. Reconnect Device A
4. Verify mesh reforms and messaging resumes

### Expected Behavior

#### Discovery States
- **"Initialized"** - App started
- **"Discovery Started"** - Scanning for peers
- **"Discovery Stopped"** - Scan completed
- **"Discovery Failed"** - WiFi P2P unavailable or busy

#### Connection States
- **"Connection initiated"** - Attempting to connect
- **"Connected as Group Owner"** - This device is the hub
- **"Connected to [IP]"** - This device is a client
- **"Peer connected: [IP]"** - Another device joined
- **"Disconnected"** - Connection lost

## Troubleshooting

### Common Issues

#### 1. **"Discovery Failed: System busy"**
- **Cause:** Android's WiFi P2P is in use
- **Solution:** Wait 5-10 seconds, try again

#### 2. **Peers not appearing**
- **Cause:** Location permissions not granted
- **Solution:** Go to Settings → Apps → Meshage → Permissions → Enable Location

#### 3. **Connection fails immediately**
- **Cause:** WiFi Direct not supported or disabled
- **Solution:** Enable WiFi, restart app

#### 4. **Messages not received**
- **Cause:** Socket connection dropped
- **Solution:** Disconnect and reconnect

#### 5. **App crashes on send**
- **Cause:** No active connection
- **Solution:** Ensure status shows "Connected"

### Permissions Required

#### Android 13+ (API 33+)
```xml
- NEARBY_WIFI_DEVICES
- BLUETOOTH_ADVERTISE
- BLUETOOTH_CONNECT
- BLUETOOTH_SCAN
```

#### Android 12 (API 31-32)
```xml
- BLUETOOTH_ADVERTISE
- BLUETOOTH_CONNECT
- BLUETOOTH_SCAN
- ACCESS_FINE_LOCATION
```

#### Android 11 and below (API 30-)
```xml
- ACCESS_FINE_LOCATION
- ACCESS_COARSE_LOCATION
```

**Note**: Location permissions are NOT needed on Android 13+ thanks to `neverForLocation` flag!

## Technical Details

### Nearby Connections Callbacks

#### 1. **EndpointDiscoveryCallback**
- `onEndpointFound` - New peer discovered
- `onEndpointLost` - Peer disappeared

#### 2. **ConnectionLifecycleCallback**
- `onConnectionInitiated` - Connection request received (auto-accepted)
- `onConnectionResult` - Connection succeeded or failed
- `onDisconnected` - Peer disconnected

#### 3. **PayloadCallback**
- `onPayloadReceived` - Message received from peer
- `onPayloadTransferUpdate` - Transfer progress (not used for simple messages)

### React Native Events Emitted
- `onPeersFound` - List of discovered peers
- `onDiscoveryStateChanged` - Discovery status updates
- `onConnectionChanged` - Connection status
- `onPeerConnected` - New peer joined
- `onPeerDisconnected` - Peer left
- `onMessageReceived` - Message from peer
- `onMessageSent` - Message sent confirmation
- `onConnectionError` - Connection errors
- `onConnectionInitiated` - Incoming connection request

### Native Module Methods
```kotlin
MeshNetwork.init()                      // Initialize Nearby Connections
MeshNetwork.discoverPeers()            // Start advertising + discovery
MeshNetwork.stopDiscovery()            // Stop advertising + discovery
MeshNetwork.connectToPeer(address)     // Connect to peer (endpoint ID)
MeshNetwork.disconnect()               // Disconnect from all peers
MeshNetwork.sendMessage(msg, target?)  // Send message (broadcast or targeted)
```

## Mesh Routing Algorithm

### Current Implementation: Flood Routing
- Simple and reliable for small networks
- Messages forwarded to all connected peers except sender
- Ensures message delivery even in multi-hop scenarios
- May cause duplicate messages (acceptable for small networks)

### Code Reference
```kotlin
// MeshNetworkModule.kt:161
private fun forwardMessageToOthers(message: String, senderEndpointId: String) {
    // Forward to all connected peers except the sender (mesh routing)
    connectedEndpoints.forEach { endpointId ->
        if (endpointId != senderEndpointId) {
            val payload = Payload.fromBytes(message.toByteArray(StandardCharsets.UTF_8))
            connectionsClient.sendPayload(endpointId, payload)
            Log.d(TAG, "Forwarded message to $endpointId")
        }
    }
}
```

## Performance Characteristics

### Network Limits
- **Max devices:** No hard limit (depends on protocol used)
- **WiFi Direct connections:** ~8 devices per group
- **Bluetooth connections:** ~7 devices simultaneously
- **Message throughput:** Varies by protocol (WiFi fastest, BLE slowest)
- **Discovery range:** 
  - WiFi: ~100 meters
  - Bluetooth: ~30-100 meters
  - BLE: ~10-50 meters
- **Strategy:** P2P_CLUSTER (optimized for mesh networks)

### Scalability
- **Small networks (2-5 devices):** Excellent performance
- **Medium networks (6-15 devices):** Good performance (automatic protocol switching)
- **Large networks (>15 devices):** May experience slower discovery/connection

## Future Enhancements

### Potential Improvements
1. **Message Deduplication** - Track message IDs to prevent duplicates
2. **Routing Tables** - Implement smarter routing (AODV, OLSR)
3. **File Transfer** - Send files through the mesh
4. **Encryption** - End-to-end encrypted messaging
5. **Group Discovery** - Auto-join existing groups
6. **Bluetooth Fallback** - Use Bluetooth when WiFi unavailable
7. **Battery Optimization** - Reduce scanning frequency
8. **Compression** - Compress messages for bandwidth efficiency

## Building and Running

### Install Dependencies
```bash
npm install
```

### Run on Android
```bash
npm run android
```

### Build APK
```bash
cd android
./gradlew assembleDebug
```

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

## Code Structure

```
meshage/
├── src/
│   └── screens/
│       └── Chats/
│           └── ChatScreen.tsx          # Main UI
├── android/
│   └── app/
│       └── src/
│           └── main/
│               ├── java/com/meshage/
│               │   ├── MeshNetworkModule.kt    # P2P logic
│               │   └── MeshNetworkPackage.kt   # Registration
│               └── AndroidManifest.xml         # Permissions
└── MESH_NETWORK_GUIDE.md                      # This file
```

## Key Differences from WiFi P2P

### ✅ Advantages of Nearby Connections
1. **No BUSY errors** - More stable than WiFi P2P Manager
2. **Multi-protocol** - Automatically uses WiFi, Bluetooth, or BLE
3. **Better range** - Can use Bluetooth when WiFi is out of range
4. **Simpler API** - No need to manage sockets manually
5. **Auto-fallback** - Switches protocols seamlessly
6. **No Group Owner** - True peer-to-peer, all devices equal
7. **Better mesh support** - P2P_CLUSTER strategy designed for mesh
8. **Fewer permissions** - No location needed on Android 13+

### ⚠️ Trade-offs
1. **Google Play Services** - Requires GMS (not available on all devices)
2. **Larger APK** - Nearby Connections library adds ~2MB
3. **Opaque protocol** - Less control over which protocol is used

## Dependencies Added

### build.gradle
```gradle
implementation("com.google.android.gms:play-services-nearby:19.0.0")
```

### AndroidManifest.xml
- Bluetooth permissions (ADVERTISE, CONNECT, SCAN)
- WiFi state permissions
- Location permissions (only for Android 12 and below)
- NEARBY_WIFI_DEVICES (Android 13+)

## License & Credits
This implementation uses:
- **Google Nearby Connections API** - Multi-protocol P2P networking
- **React Native** - Cross-platform mobile framework
- **Kotlin** - Modern Android development language

---

**Ready to test your mesh network!** 🚀

The migration from WiFi P2P to Nearby Connections is complete. Build and test on real devices!

For issues or questions, check the Troubleshooting section above.
