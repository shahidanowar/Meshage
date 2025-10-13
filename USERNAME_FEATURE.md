# Username Feature Implementation

## Overview
Users enter their name on the onboarding screen, which is then used throughout the app to identify them in the mesh network.

## How It Works

### 1. **Onboarding Screen**
- User enters their name
- Name is validated (required field)
- Name is saved to storage
- User navigates to main screen

### 2. **Storage System**
- Uses in-memory storage (lightweight)
- Can be replaced with AsyncStorage for persistence
- Username persists during app session

### 3. **Chat Screen Integration**
- Username loads automatically on app start
- Sets device name in Nearby Connections
- Displays username in header
- Shows username in sent messages
- Shows peer names in discovered devices list

## Files Created/Modified

### **New Files:**

#### `src/utils/storage.ts`
```typescript
// In-memory storage for username
// Replace with AsyncStorage for persistence

export const StorageService = {
  saveUsername: async (username: string) => void
  getUsername: async () => string | null
  clearUsername: async () => void
}
```

### **Modified Files:**

#### `Onboarding.tsx`
- Added username validation
- Saves username to storage before navigation
- Shows alert if name is empty

#### `useChatScreen.ts`
- Loads username from storage on mount
- Calls `MeshNetwork.setDeviceName(username)`
- Uses username in sent messages
- Exports username to component

#### `MeshNetworkModule.kt`
- Added `setDeviceName()` method
- Updates `localDeviceName` variable
- Used in advertising (peer discovery)

#### `ChatScreen.tsx`
- Displays username in header (`👤 Username`)
- Shows "You" for sent messages
- Shows peer names for received messages

#### `ChatScreen.styles.ts`
- Added `username` style (white, 18px, centered)

## User Flow

```
┌─────────────────────────────────────────┐
│  1. Onboarding Screen                   │
│     • User enters name: "Alice"         │
│     • Taps "CONNECT"                    │
│     • Name saved to storage             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  2. ChatScreen Initialization           │
│     • Loads username from storage       │
│     • Sets device name to "Alice"       │
│     • Starts advertising as "Alice"     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  3. Peer Discovery                      │
│     • Other devices see "Alice"         │
│     • Alice sees other usernames        │
│     • Peer list shows all names         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  4. Messaging                           │
│     • Alice sends message               │
│     • Shows "You" on sender side        │
│     • Shows "Alice" on receiver side    │
└─────────────────────────────────────────┘
```

## UI Changes

### **Onboarding Screen**
```
┌─────────────────────────────────┐
│  Enter your name:               │
│  (this will be displayed...)    │
│                                 │
│  ┌─────────────────────────┐   │
│  │  Alice                  │   │
│  └─────────────────────────┘   │
│                                 │
│      [    CONNECT    ]          │
└─────────────────────────────────┘
```

### **Chat Screen Header**
```
┌─────────────────────────────────┐
│        👤 Alice                 │
│  Auto-starting discovery...     │
│                                 │
│  Auto-Connect  [●─────] ON      │
└─────────────────────────────────┘
```

### **Peer List**
```
┌─────────────────────────────────┐
│  Discovered Peers (2)           │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Bob                     │   │
│  │ endpoint_id_123        │   │
│  │ Available        [Connect] │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Charlie                 │   │
│  │ endpoint_id_456        │   │
│  │ Available        [Connect] │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

### **Chat Messages**
```
┌─────────────────────────────────┐
│  ┌───────────────┐              │
│  │ Bob           │              │
│  │ Hello Alice!  │              │
│  │ 10:30 AM      │              │
│  └───────────────┘              │
│                                 │
│              ┌───────────────┐  │
│              │ You           │  │
│              │ Hi Bob!       │  │
│              │ 10:31 AM      │  │
│              └───────────────┘  │
└─────────────────────────────────┘
```

## Code Examples

### **Onboarding - Save Username**
```typescript
const handleConnect = async () => {
  if (!name.trim()) {
    Alert.alert('Name Required', 'Please enter your name');
    return;
  }
  
  await StorageService.saveUsername(name.trim());
  navigation.replace("Main");
};
```

### **ChatScreen - Load Username**
```typescript
useEffect(() => {
  const initializeApp = async () => {
    const savedUsername = await StorageService.getUsername();
    if (savedUsername) {
      setUsername(savedUsername);
      MeshNetwork.setDeviceName(savedUsername);
    }
    // ... rest of initialization
  };
  initializeApp();
}, []);
```

### **Android - Set Device Name**
```kotlin
@ReactMethod
fun setDeviceName(deviceName: String) {
    localDeviceName = deviceName
    Log.d(TAG, "Device name set to: $deviceName")
}
```

### **Messaging - Use Username**
```typescript
const handleSendMessage = () => {
  const newMessage = {
    id: `${Date.now()}-sent`,
    text: messageText,
    fromAddress: username, // Uses saved username
    timestamp: Date.now(),
    isSent: true,
  };
  setMessages(prev => [...prev, newMessage]);
  MeshNetwork.sendMessage(messageText, null);
};
```

## Upgrade to AsyncStorage (Optional)

For persistent storage across app restarts:

### **1. Install Package**
```bash
npm install @react-native-async-storage/async-storage
```

### **2. Update storage.ts**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageService = {
  saveUsername: async (username: string) => {
    await AsyncStorage.setItem('@meshage_username', username);
  },
  getUsername: async () => {
    return await AsyncStorage.getItem('@meshage_username');
  },
  clearUsername: async () => {
    await AsyncStorage.removeItem('@meshage_username');
  },
};
```

## Testing

### **Test Flow:**
1. **Fresh Install:**
   - Open app → Onboarding screen appears
   - Enter name: "Alice"
   - Tap CONNECT
   - Should navigate to ChatScreen

2. **Verify Username Display:**
   - ChatScreen header shows: "👤 Alice"
   - Status shows: "Auto-starting discovery..."

3. **Test Discovery:**
   - On second device, enter name: "Bob"
   - Wait for discovery
   - Alice should see "Bob" in peer list
   - Bob should see "Alice" in peer list

4. **Test Messaging:**
   - Alice connects to Bob
   - Alice sends: "Hello"
   - Alice sees: "You: Hello"
   - Bob sees: "Alice: Hello"

5. **Test Username in Messages:**
   - Both devices show correct sender names
   - Messages from self show "You"
   - Messages from others show their username

## Benefits

✅ **Personalized Identity** - Each user has a unique name  
✅ **Easy Recognition** - Know who you're chatting with  
✅ **Better UX** - No confusing endpoint IDs  
✅ **Peer Discovery** - See usernames instead of device models  
✅ **Message Attribution** - Clear sender identification  

## Limitations (Current Implementation)

⚠️ **In-Memory Storage** - Username lost on app restart  
⚠️ **No Duplicate Check** - Multiple users can have same name  
⚠️ **No Edit Feature** - Can't change username without reinstall  

## Future Enhancements

1. **Persistent Storage** - Use AsyncStorage
2. **Username Edit** - Add settings screen to change name
3. **Unique IDs** - Add UUID to prevent duplicates
4. **Avatar Support** - Add profile pictures
5. **User Profiles** - Store more user information

---

**Your mesh network now has personalized usernames!** 🎉
