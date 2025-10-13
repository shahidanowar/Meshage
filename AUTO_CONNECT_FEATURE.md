# Auto-Connect Feature

## Overview
The app now **automatically discovers and connects** to nearby devices when it opens, creating a seamless zero-config mesh network experience.

## How It Works

### 1. **Auto-Start Discovery on App Launch**
- When the app opens, it automatically requests permissions
- After permissions are granted, discovery starts automatically after 1 second
- No need to tap "Discover Peers" button manually

### 2. **Auto-Connect to Discovered Peers**
- When peers are discovered, the app automatically connects to them
- Only connects to **available** peers (status = 3)
- Skips peers that are already connected
- Works for multiple peers simultaneously (mesh network)

### 3. **User Control with Toggle Switch**
- **Auto-Connect toggle** in the header
- Turn ON (default): Automatically connects to all discovered peers
- Turn OFF: Discover only, manual connection required (tap Connect button)

## Code Changes

### useChatScreen.ts
```typescript
// New state
const [autoConnectEnabled, setAutoConnectEnabled] = useState<boolean>(true);
const hasAutoStarted = useRef<boolean>(false);

// Auto-start discovery on mount
const autoStartDiscovery = async () => {
  if (!hasAutoStarted.current) {
    hasAutoStarted.current = true;
    const hasPermission = await requestPermissions();
    if (hasPermission) {
      setTimeout(() => {
        MeshNetwork.discoverPeers();
      }, 1000);
    }
  }
};

// Auto-connect in onPeersFound listener
if (autoConnectEnabled && !isConnected && event.length > 0) {
  event.forEach((peer: Peer) => {
    if (peer.status === 3 && !connectedPeers.includes(peer.deviceAddress)) {
      MeshNetwork.connectToPeer(peer.deviceAddress);
    }
  });
}
```

### ChatScreen.tsx
```tsx
// Toggle Switch in Header
<View style={styles.toggleContainer}>
  <Text style={styles.toggleLabel}>Auto-Connect</Text>
  <Switch
    value={autoConnectEnabled}
    onValueChange={setAutoConnectEnabled}
    trackColor={{ false: '#767577', true: '#007aff' }}
    thumbColor={autoConnectEnabled ? '#fff' : '#f4f3f4'}
  />
</View>
```

## User Experience

### **Before** (Manual Mode)
1. Open app
2. Tap "Discover Peers"
3. Wait for peers to appear
4. Tap "Connect" on each peer
5. Start chatting

### **After** (Auto Mode) ✨
1. Open app
2. *(Automatically discovers and connects)*
3. Start chatting immediately!

## Benefits

✅ **Zero-config** - No manual setup required  
✅ **Faster connection** - Saves 3-4 taps per session  
✅ **Better UX** - Seamless mesh network formation  
✅ **User control** - Toggle to disable auto-connect if needed  
✅ **Multi-device** - Connects to multiple peers automatically  

## Customization Options

### Delay Discovery Start
Change the delay in `useChatScreen.ts`:
```typescript
setTimeout(() => {
  MeshNetwork.discoverPeers();
}, 2000); // Increase to 2 seconds
```

### Disable Auto-Connect by Default
```typescript
const [autoConnectEnabled, setAutoConnectEnabled] = useState<boolean>(false);
```

### Limit Number of Auto-Connections
```typescript
if (autoConnectEnabled && !isConnected && event.length > 0) {
  // Only connect to first peer
  const firstPeer = event.find(p => p.status === 3);
  if (firstPeer && !connectedPeers.includes(firstPeer.deviceAddress)) {
    MeshNetwork.connectToPeer(firstPeer.deviceAddress);
  }
}
```

## Testing

1. Install app on 2+ devices
2. Open app on Device 1 - should see "Auto-starting discovery..."
3. Open app on Device 2 - should automatically discover Device 1
4. Both devices should auto-connect within 2-5 seconds
5. Start sending messages!

**Toggle Test:**
- Turn OFF auto-connect toggle
- Reset discovery
- Discover peers again
- Peers appear but don't auto-connect (manual connection required)

## Troubleshooting

**Discovery doesn't start automatically:**
- Check permissions are granted
- Look for "Permissions required" message
- Try tapping "Discover Peers" manually

**Auto-connect not working:**
- Check toggle is ON
- Ensure peers have status "Available" (not "Connected" already)
- Reset discovery and try again

**Too many connection requests:**
- Turn OFF auto-connect toggle
- Use manual connection mode

---

**Enjoy your zero-config mesh network!** 🚀
