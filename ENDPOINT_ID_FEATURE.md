# Endpoint ID Display Feature

## Overview

Added the current temporary **endpoint ID** to the Settings screen, allowing users to see both their permanent device ID and temporary endpoint ID used for mesh network connections.

## What is an Endpoint ID?

### Persistent Device ID (Permanent)
```
Format: UUID v4
Example: "a3f8c2e1-4b6d-4xyz-9abc-123456789def"
Purpose: Permanent identifier for friends system
Storage: AsyncStorage (never changes)
```

### Endpoint ID (Temporary)
```
Format: "local-{timestamp}"
Example: "local-1697456789123"
Purpose: Temporary identifier for current mesh session
Storage: In-memory (changes on app restart)
```

## Changes Made

### 1. Native Module (Kotlin)

**File:** `android/app/src/main/java/com/meshage/MeshNetworkModule.kt`

Added method to expose endpoint ID:
```kotlin
@ReactMethod
fun getLocalEndpointId(promise: Promise) {
    try {
        // Return the local endpoint ID (may be empty if not connected yet)
        promise.resolve(localEndpointId)
    } catch (e: Exception) {
        promise.reject("ERROR", "Failed to get local endpoint ID", e)
    }
}
```

### 2. Settings Screen (React Native)

**File:** `src/screens/Settings/SettingsScreen.tsx`

#### Added Import
```typescript
import { NativeModules } from "react-native";
const { MeshNetwork } = NativeModules;
```

#### Added State
```typescript
const [endpointId, setEndpointId] = useState<string>('');
```

#### Load Endpoint ID
```typescript
// Load endpoint ID from native module
try {
    const localEndpointId = await MeshNetwork.getLocalEndpointId();
    setEndpointId(localEndpointId || 'Not connected yet');
} catch (error) {
    console.log('Error getting endpoint ID:', error);
    setEndpointId('Not available');
}
```

#### Display in UI
```typescript
<View style={styles.infoRow}>
    <Text style={styles.infoLabel}>Endpoint ID:</Text>
    <Text style={styles.infoValueSmall} numberOfLines={1}>
        {endpointId}
    </Text>
</View>
```

## Device Information Card (Updated)

```
┌───────────────────────────────────────┐
│ Device Information                    │
│  ┌─────────────────────────────────┐ │
│  │ Username:        Alice          │ │
│  ├─────────────────────────────────┤ │
│  │ Device ID:   abc12345...6789    │ │
│  ├─────────────────────────────────┤ │
│  │ Full ID:     abc-123-def-456... │ │
│  ├─────────────────────────────────┤ │
│  │ Endpoint ID: local-1697456789   │ │ ← NEW
│  ├─────────────────────────────────┤ │
│  │ Friends:     3                  │ │
│  └─────────────────────────────────┘ │
└───────────────────────────────────────┘
```

## Use Cases

### 1. **Debugging**
- See current endpoint ID for troubleshooting
- Verify if mesh network is initialized
- Check if endpoint ID changes after reconnection

### 2. **Network Status**
- "Not connected yet" = Mesh network not started
- "local-{timestamp}" = Active mesh session
- "Not available" = Error getting endpoint ID

### 3. **Understanding IDs**
Users can now see the difference between:
- **Persistent ID:** Never changes (for friends)
- **Endpoint ID:** Changes each session (for connections)

## Endpoint ID States

### State 1: Not Connected
```
Endpoint ID: "Not connected yet"
```
**Meaning:** App just opened, mesh network not initialized

### State 2: Connected
```
Endpoint ID: "local-1697456789123"
```
**Meaning:** Mesh network active, this is your temporary ID

### State 3: Error
```
Endpoint ID: "Not available"
```
**Meaning:** Error fetching from native module

## How Endpoint ID is Generated

**In Native Module:**
```kotlin
// Generated when first connection is made
if (localEndpointId.isEmpty()) {
    localEndpointId = "local-${System.currentTimeMillis()}"
    Log.d(TAG, "Local endpoint ID set to: $localEndpointId")
}
```

**Characteristics:**
- ✅ Generated on first connection
- ✅ Unique per session
- ✅ Prefixed with "local-"
- ✅ Uses timestamp for uniqueness
- ❌ Not persistent (changes on restart)

## Why Both IDs?

### Persistent Device ID
- **Purpose:** Friend recognition
- **Lifetime:** Forever
- **Storage:** AsyncStorage
- **Use:** Friend requests, personal chats
- **Example:** "abc-123-def-456"

### Endpoint ID
- **Purpose:** Mesh network routing
- **Lifetime:** Current session only
- **Storage:** In-memory
- **Use:** Message forwarding, connection tracking
- **Example:** "local-1697456789"

## Message Flow Example

```
Alice sends message to Bob:

1. Alice's Persistent ID: "alice-persistent-123"
2. Alice's Endpoint ID: "local-1697456789"

Message format:
"local-1697456789|||DIRECT_MSG:bob-persistent-456:Hello"
 ^^^^^^^^^^^^^^^^^    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 Endpoint ID          Persistent ID (target)
 (for routing)        (for filtering)

Bob receives:
- Checks: Is target "bob-persistent-456" == my ID? ✓
- Shows message in personal chat
```

## Testing

### Test 1: Before Connection
```
1. Open app (fresh start)
2. Go to Settings
3. Check Endpoint ID
4. Should show: "Not connected yet"
```

### Test 2: After Connection
```
1. Open app
2. Wait for mesh network to start
3. Connect to a peer
4. Go to Settings
5. Check Endpoint ID
6. Should show: "local-{timestamp}"
```

### Test 3: After Restart
```
1. Note current Endpoint ID: "local-1697456789"
2. Close app completely
3. Reopen app
4. Go to Settings
5. Check Endpoint ID
6. Should be different: "local-1697456800" (new timestamp)
```

### Test 4: Persistent ID Unchanged
```
1. Note Persistent Device ID
2. Restart app multiple times
3. Endpoint ID changes each time
4. Persistent Device ID stays the same ✓
```

## Console Logs

### When Endpoint ID is Set
```
Local endpoint ID set to: local-1697456789123
```

### When Retrieved in Settings
```
Getting endpoint ID from native module
Endpoint ID: local-1697456789123
```

### If Error
```
Error getting endpoint ID: [error details]
Endpoint ID set to: Not available
```

## Comparison Table

| Feature | Persistent Device ID | Endpoint ID |
|---------|---------------------|-------------|
| **Format** | UUID v4 | local-{timestamp} |
| **Example** | abc-123-def-456 | local-1697456789 |
| **Lifetime** | Forever | Current session |
| **Storage** | AsyncStorage | In-memory |
| **Changes** | Never | Every restart |
| **Used For** | Friends, QR code | Routing, connections |
| **Visible** | Settings, QR | Settings only |
| **Length** | 36 chars | ~18 chars |

## Benefits

### ✅ **Transparency**
- Users can see both IDs
- Understand the difference
- Better debugging

### ✅ **Debugging**
- Verify mesh network status
- Check if endpoint is assigned
- Troubleshoot connection issues

### ✅ **Education**
- Learn how mesh network works
- Understand temporary vs permanent IDs
- See ID changes on restart

## Future Enhancements

### 1. **Copy to Clipboard**
```typescript
import Clipboard from '@react-native-clipboard/clipboard';

const copyEndpointId = () => {
  Clipboard.setString(endpointId);
  Alert.alert('Copied', 'Endpoint ID copied to clipboard');
};
```

### 2. **Refresh Button**
```typescript
const refreshEndpointId = async () => {
  const id = await MeshNetwork.getLocalEndpointId();
  setEndpointId(id || 'Not connected yet');
};
```

### 3. **Connection Status Indicator**
```typescript
const isConnected = endpointId.startsWith('local-');

<View style={styles.statusIndicator}>
  <View style={[styles.dot, isConnected && styles.dotGreen]} />
  <Text>{isConnected ? 'Connected' : 'Not Connected'}</Text>
</View>
```

## Summary

✅ **Added endpoint ID display to Settings screen**  
✅ **Shows temporary session identifier**  
✅ **Helps distinguish from persistent device ID**  
✅ **Useful for debugging and understanding**  
✅ **Updates on each app session**  

---

**Settings screen now shows both permanent and temporary IDs!** 🎉

Users can see:
- **Persistent Device ID:** For friends (never changes)
- **Endpoint ID:** For current session (changes on restart)
