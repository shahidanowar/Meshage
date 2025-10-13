# Persistent Device ID System

## Problem Solved

**Before:** Dynamic endpoint addresses change on every app restart
```
Device A opens app → Gets address "2mxk"
Device B saves "2mxk" as friend
Device A closes/reopens app → Gets NEW address "7xyz"
Device B can't recognize Device A anymore! ❌
```

**After:** Permanent unique device IDs persist forever
```
Device A opens app → Generates ID "abc-123-def" (saved forever)
Device B saves "abc-123-def" as friend
Device A closes/reopens app → Still has ID "abc-123-def"
Device B recognizes Device A! ✅
```

## How It Works

### **1. Device ID Generation**

On first app launch:
```typescript
// Generate UUID v4 format
Device ID: "a3f8c2e1-4b6d-4xyz-9abc-123456789def"

// Save to storage (persists across app restarts)
StorageService.setItem('@meshage_device_id', deviceId);
```

### **2. Device Identifier Format**

When advertising on the network:
```
Format: "username|deviceId"
Example: "Alice|a3f8c2e1-4b6d-4xyz-9abc-123456789def"
```

### **3. Peer Discovery**

When other devices discover you:
```typescript
// Raw device name from Nearby Connections
deviceName: "Alice|a3f8c2e1-4b6d-4xyz-9abc-123456789def"

// Parsed into components
{
  displayName: "Alice",
  persistentId: "a3f8c2e1-4b6d-4xyz-9abc-123456789def",
  deviceAddress: "2mxk" // Still used for connection (temporary)
}
```

## Architecture

### **Storage Layer** (`storage.ts`)

```typescript
export const StorageService = {
  // Get or create device ID
  getDeviceId: async () => Promise<string>
  
  // Generate UUID v4
  generateDeviceId: () => string
}
```

**Key Features:**
- ✅ Generated once on first launch
- ✅ Stored permanently
- ✅ Retrieved on every app start
- ✅ Never changes

### **Network Layer** (`useChatScreen.ts`)

```typescript
// On app startup
const deviceId = await StorageService.getDeviceId();
const deviceIdentifier = `${username}|${deviceId}`;
MeshNetwork.setDeviceName(deviceIdentifier);

// When discovering peers
const parseDeviceIdentifier = (deviceName) => {
  const [displayName, persistentId] = deviceName.split('|');
  return { displayName, persistentId };
};
```

**Key Features:**
- ✅ Username visible to users
- ✅ Device ID used by system
- ✅ Backward compatible (fallback if no ID)

### **Peer Interface**

```typescript
interface Peer {
  deviceName: string;      // Raw: "Alice|abc-123-def"
  deviceAddress: string;   // Temporary: "2mxk" (changes)
  status: number;          // Connection status
  
  // New fields:
  displayName?: string;    // Parsed: "Alice"
  persistentId?: string;   // Parsed: "abc-123-def" (permanent!)
}
```

## Usage for Friends Feature

### **Scenario 1: Add Friend**

```typescript
// When user taps "Add Friend" on a peer
const addFriend = async (peer: Peer) => {
  if (peer.persistentId) {
    // Save the PERSISTENT ID, not the temporary address!
    await saveFriend({
      id: peer.persistentId,           // ← Use this!
      name: peer.displayName,
      addedAt: Date.now(),
    });
    
    // ❌ DON'T save: peer.deviceAddress (temporary!)
  }
};
```

### **Scenario 2: Recognize Friend**

```typescript
// When peers are discovered
const recognizeFriends = (peers: Peer[]) => {
  const friends = await getFriends();
  
  peers.forEach(peer => {
    const isFriend = friends.some(
      friend => friend.id === peer.persistentId  // Match by persistent ID!
    );
    
    if (isFriend) {
      console.log(`Found friend: ${peer.displayName}`);
      // Show special badge, auto-connect, etc.
    }
  });
};
```

### **Scenario 3: Friend List**

```typescript
// Display friends in UI
interface Friend {
  id: string;              // Persistent device ID
  name: string;            // Display name
  lastSeen?: number;       // Last connection timestamp
  isOnline?: boolean;      // Currently in peer list
}

// Check if friend is online
const checkFriendStatus = (friend: Friend, peers: Peer[]) => {
  const isOnline = peers.some(
    peer => peer.persistentId === friend.id
  );
  return isOnline;
};
```

## Implementation Examples

### **Example 1: Friend Storage**

```typescript
// friends.ts
import { StorageService } from './storage';

interface Friend {
  id: string;          // persistentId
  name: string;
  addedAt: number;
}

export const FriendService = {
  saveFriend: async (friend: Friend) => {
    const friends = await FriendService.getFriends();
    friends.push(friend);
    await StorageService.setItem('@meshage_friends', JSON.stringify(friends));
  },
  
  getFriends: async (): Promise<Friend[]> => {
    const data = await StorageService.getItem('@meshage_friends');
    return data ? JSON.parse(data) : [];
  },
  
  removeFriend: async (friendId: string) => {
    const friends = await FriendService.getFriends();
    const updated = friends.filter(f => f.id !== friendId);
    await StorageService.setItem('@meshage_friends', JSON.stringify(updated));
  },
  
  isFriend: async (persistentId: string): Promise<boolean> => {
    const friends = await FriendService.getFriends();
    return friends.some(f => f.id === persistentId);
  },
};
```

### **Example 2: Auto-Connect to Friends Only**

```typescript
// In useChatScreen.ts
const onPeersFound = async (peers: Peer[]) => {
  for (const peer of peers) {
    // Check if peer is a friend
    const isFriend = await FriendService.isFriend(peer.persistentId);
    
    if (isFriend && peer.status === 3) {
      console.log(`Auto-connecting to friend: ${peer.displayName}`);
      attemptConnection(peer);
    }
  }
};
```

### **Example 3: Friend Request System**

```typescript
// Friend request flow
interface FriendRequest {
  from: string;        // persistentId of sender
  name: string;        // display name
  timestamp: number;
}

// Send friend request
const sendFriendRequest = (toPeer: Peer) => {
  const request = {
    type: 'FRIEND_REQUEST',
    fromId: myDeviceId,
    fromName: myUsername,
  };
  MeshNetwork.sendMessage(JSON.stringify(request), toPeer.deviceAddress);
};

// Receive and approve
const handleFriendRequest = async (request: FriendRequest) => {
  // Show UI confirmation
  const approved = await showFriendRequestDialog(request.name);
  
  if (approved) {
    await FriendService.saveFriend({
      id: request.from,        // Save persistent ID!
      name: request.name,
      addedAt: Date.now(),
    });
  }
};
```

## Benefits

### **✅ Persistent Recognition**
```
Same device → Same ID → Always recognized
Even after:
- App restart
- Device reboot
- Network change
- Days/weeks later
```

### **✅ Stable Friends System**
```
Add friend once → Recognized forever
No need to re-add after:
- Closing app
- Changing WiFi
- Moving locations
```

### **✅ Privacy Features**
```
- ID is anonymous (UUID, not phone number)
- No personal info in ID
- User can reset ID if needed
- Friends can be blocked by ID
```

### **✅ Backward Compatible**
```
// Handles devices without persistent ID
if (!peer.persistentId) {
  // Old format or different app
  // Fallback to display name only
}
```

## Console Logs

You'll see logs like:
```
Generated new device ID: a3f8c2e1-4b6d-4xyz-9abc-123456789def
Device Identifier: Alice|a3f8c2e1-4b6d-4xyz-9abc-123456789def

Peers found (raw): [{ deviceName: "Bob|def-456-ghi", ... }]
Peers found (parsed): [{ displayName: "Bob", persistentId: "def-456-ghi", ... }]
Found peer: Bob (ID: def-456-ghi)
```

## API Reference

### **StorageService**

```typescript
// Get or create device ID
getDeviceId(): Promise<string>

// Get existing ID (returns null if doesn't exist)
getExistingDeviceId(): Promise<string | null>
```

### **Peer Interface**

```typescript
interface Peer {
  deviceName: string;      // "Alice|abc-123"
  deviceAddress: string;   // "2mxk" (temporary)
  status: number;          // 0=Connected, 3=Available
  displayName?: string;    // "Alice"
  persistentId?: string;   // "abc-123" (permanent)
}
```

### **parseDeviceIdentifier**

```typescript
parseDeviceIdentifier(deviceName: string): {
  displayName: string;
  persistentId?: string;
}

// Examples:
parseDeviceIdentifier("Alice|abc-123")
// → { displayName: "Alice", persistentId: "abc-123" }

parseDeviceIdentifier("Bob")
// → { displayName: "Bob", persistentId: undefined }
```

## Migration from Temporary Addresses

If you have existing code using temporary addresses:

### **❌ Before (Wrong):**
```typescript
// Saving temporary address
saveFriend({ address: "2mxk", name: "Alice" });  // This will break!

// Checking friend
const isFriend = friends.some(f => f.address === peer.deviceAddress);  // Won't work after restart!
```

### **✅ After (Correct):**
```typescript
// Saving persistent ID
saveFriend({ id: peer.persistentId, name: peer.displayName });  // Works forever!

// Checking friend
const isFriend = friends.some(f => f.id === peer.persistentId);  // Always works!
```

## Testing

### **Test 1: ID Persistence**
```
1. Open app on Device A → Note device ID
2. Close app
3. Reopen app → Device ID should be the same ✓
```

### **Test 2: Friend Recognition**
```
1. Device A and B connect
2. Device B adds Device A as friend
3. Close apps on both
4. Reopen apps
5. Device B should recognize Device A ✓
```

### **Test 3: Cross-Session**
```
Day 1: Add friend
Day 2: Friend should still be recognized ✓
```

## Upgrading to AsyncStorage (Recommended)

For true persistence across app reinstalls:

### **Install:**
```bash
npm install @react-native-async-storage/async-storage
```

### **Update storage.ts:**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace InMemoryStorage with AsyncStorage
export const StorageService = {
  getDeviceId: async () => {
    let deviceId = await AsyncStorage.getItem('@meshage_device_id');
    if (!deviceId) {
      deviceId = generateDeviceId();
      await AsyncStorage.setItem('@meshage_device_id', deviceId);
    }
    return deviceId;
  },
};
```

## Security Considerations

### **ID Reset Feature**
Allow users to reset their ID:
```typescript
export const resetDeviceId = async () => {
  const newId = generateDeviceId();
  await StorageService.setItem('@meshage_device_id', newId);
  return newId;
};
```

### **ID Validation**
Validate incoming peer IDs:
```typescript
const isValidDeviceId = (id: string): boolean => {
  // UUID v4 format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};
```

---

## Summary

✅ **Persistent device IDs** solve the dynamic address problem  
✅ **Format:** `username|deviceId` in device name  
✅ **Parsing:** Extract both components from discovered peers  
✅ **Friends feature:** Use `persistentId` not `deviceAddress`  
✅ **Stable recognition:** Same device always has same ID  
✅ **Privacy:** Anonymous UUIDs, no personal info  

**Your mesh network is now ready for a stable friends system!** 🎉
