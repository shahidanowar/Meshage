# Peer Connection Event Fix

## Issue Found

The "Add Friend" button was never showing because the `onPeerConnected` event listener was not correctly parsing the data from the native module.

## Root Cause

### Native Module (Kotlin)
```kotlin
// MeshNetworkModule.kt sends an OBJECT
sendEvent("onPeerConnected", Arguments.createMap().apply {
    putString("address", endpointId)
})
// Sends: { address: "endpoint_id_123" }
```

### React Native Listener (Before Fix)
```typescript
// useChatScreen.ts expected a STRING
const onPeerConnectedListener = MeshNetworkEvents.addListener(
  'onPeerConnected',
  (address: string) => {  // ❌ Wrong! Received object, not string
    console.log('Peer connected:', address);
    setConnectedPeers(prev => [...new Set([...prev, address])]);
  }
);
```

**Result:** The `address` variable contained the entire object `{address: "..."}`, not the string value. This caused:
- `connectedPeers` array contained objects instead of strings
- `connectedPeers.includes(item.deviceAddress)` always returned `false`
- "Add Friend" button never appeared

## The Fix

### Updated Event Listeners

#### onPeerConnected
```typescript
const onPeerConnectedListener = MeshNetworkEvents.addListener(
  'onPeerConnected',
  (data: { address: string } | string) => {
    // Handle both object and string formats
    const address = typeof data === 'string' ? data : data.address;
    console.log('Peer connected:', address);
    setConnectedPeers(prev => [...new Set([...prev, address])]);
    setStatus(`Peer connected: ${address}`);
  }
);
```

#### onPeerDisconnected
```typescript
const onPeerDisconnectedListener = MeshNetworkEvents.addListener(
  'onPeerDisconnected',
  (data: { address: string } | string) => {
    // Handle both object and string formats
    const address = typeof data === 'string' ? data : data.address;
    console.log('Peer disconnected:', address);
    setConnectedPeers(prev => prev.filter(p => p !== address));
    setStatus(`Peer disconnected: ${address}`);
  }
);
```

## Files Modified

### 1. `src/screens/Chats/useChatScreen.ts`
- ✅ Fixed `onPeerConnected` listener (line 315)
- ✅ Fixed `onPeerDisconnected` listener (line 334)

### 2. `src/screens/Friends/PersonalChatScreen.tsx`
- ✅ Already correct (was handling object format properly)

## How It Works Now

### Connection Flow
```
1. Native module: Peer connects
   └─> Emits: { address: "endpoint_123" }

2. React Native listener: Receives object
   └─> Extracts: address = data.address
   └─> Adds to: connectedPeers = ["endpoint_123"]

3. UI renders peer list
   └─> Checks: connectedPeers.includes(item.deviceAddress)
   └─> Returns: true ✓
   └─> Shows: "Add Friend" button ✓
```

## Testing

### Before Fix ❌
```
1. Discover peer → Status: "Available"
2. Auto-connect → Status: "✓ Connected"
3. Check connectedPeers: [{address: "endpoint_123"}]  ← Wrong!
4. Button check: connectedPeers.includes("endpoint_123") → false
5. Result: No "Add Friend" button
```

### After Fix ✅
```
1. Discover peer → Status: "Available"
2. Auto-connect → Status: "✓ Connected"
3. Check connectedPeers: ["endpoint_123"]  ← Correct!
4. Button check: connectedPeers.includes("endpoint_123") → true
5. Result: "Add Friend" button appears ✓
```

## Verification Steps

1. **Run the app:**
   ```bash
   npm run android
   ```

2. **Open peer list:**
   - Tap the "👥" button in header

3. **Wait for connection:**
   - Peer shows "Available" → Auto-connects
   - Status changes to "✓ Connected"

4. **Verify button appears:**
   - "Add Friend" button should now be visible ✓

5. **Check console logs:**
   ```
   Peer connected: endpoint_abc123  ← Should show string, not object
   ```

## Debug Commands

### Check connectedPeers Array
Add temporary logging:
```typescript
useEffect(() => {
  console.log('Connected peers:', connectedPeers);
  console.log('Type check:', connectedPeers.map(p => typeof p));
}, [connectedPeers]);
```

Expected output:
```
Connected peers: ["endpoint_123", "endpoint_456"]
Type check: ["string", "string"]
```

### Check Event Data
```typescript
const onPeerConnectedListener = MeshNetworkEvents.addListener(
  'onPeerConnected',
  (data) => {
    console.log('Raw event data:', data);
    console.log('Type:', typeof data);
    console.log('Is object:', typeof data === 'object');
    console.log('Address:', data.address);
  }
);
```

## Why Backward Compatible?

The fix handles both formats:
```typescript
const address = typeof data === 'string' ? data : data.address;
```

This ensures:
- ✅ Works with current native module (object format)
- ✅ Works if native module changes to string format
- ✅ No breaking changes

## Related Components

### Components That Use connectedPeers
1. **ChatScreen** - Shows "Add Friend" button
2. **PersonalChatScreen** - Shows online/offline status
3. **useChatScreen** - Manages connection state

### Components Already Fixed
- ✅ PersonalChatScreen (was already handling object format)

## Summary

**Issue:** Event listeners expected string but received object  
**Cause:** Mismatch between native module and React Native listener  
**Fix:** Parse object to extract address string  
**Result:** "Add Friend" button now appears when connected ✓

---

**The "Add Friend" button now works correctly!** 🎉

Peers must be **connected** (not just available) for the button to appear.
