# AsyncStorage Upgrade

## Overview
The storage system has been upgraded from **in-memory storage** to **AsyncStorage** for persistent data across app restarts and device reboots.

## What Changed

### Before (In-Memory Storage)
```typescript
class InMemoryStorage {
  private storage: Map<string, string> = new Map();
  // Data lost on app restart ❌
}
```

### After (AsyncStorage)
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
// Data persists forever ✅
```

## Benefits

### ✅ **Persistent Data**
- Username saved permanently
- Device ID persists across restarts
- Friends list maintained forever
- Friend requests survive app closure
- Onboarding status remembered

### ✅ **Better User Experience**
- No need to re-enter username
- Friends don't disappear
- Device ID remains stable
- Seamless app reopening

### ✅ **Production Ready**
- Industry-standard storage solution
- Reliable and battle-tested
- Works on both Android and iOS

## What's Stored

### 1. **Username** (`@meshage_username`)
```typescript
await StorageService.saveUsername('Alice');
const username = await StorageService.getUsername(); // 'Alice'
```

### 2. **Device ID** (`@meshage_device_id`)
```typescript
const deviceId = await StorageService.getDeviceId();
// Returns: "a3f8c2e1-4b6d-4xyz-9abc-123456789def"
// Same ID every time, even after restart
```

### 3. **Friends List** (`@meshage_friends`)
```typescript
await StorageService.addFriend({
  persistentId: 'abc-123',
  displayName: 'Bob',
  deviceAddress: '192.168.49.1',
  lastSeen: Date.now()
});

const friends = await StorageService.getFriends();
// Friends persist across app restarts
```

### 4. **Friend Requests** (`@meshage_friend_requests`)
```typescript
await StorageService.addFriendRequest({
  persistentId: 'def-456',
  displayName: 'Charlie',
  deviceAddress: '192.168.49.2',
  timestamp: Date.now(),
  type: 'incoming'
});

const requests = await StorageService.getFriendRequests();
// Requests survive app closure
```

### 5. **Onboarding Status** (`@meshage_onboarding_complete`)
```typescript
const isComplete = await StorageService.isOnboardingComplete();
// Returns true if user has completed onboarding
// User won't see onboarding screen again
```

## Implementation Details

### File Modified
- **`src/utils/storage.ts`** - Complete rewrite using AsyncStorage

### Changes Made
1. Removed `InMemoryStorage` class
2. Added AsyncStorage import
3. Replaced all `storage.setItem()` → `AsyncStorage.setItem()`
4. Replaced all `storage.getItem()` → `AsyncStorage.getItem()`
5. Replaced all `storage.removeItem()` → `AsyncStorage.removeItem()`

### API Remains the Same
No changes needed in other files! The `StorageService` API is identical:

```typescript
// All existing code works without modification
const username = await StorageService.getUsername();
await StorageService.saveUsername('Alice');
const friends = await StorageService.getFriends();
// etc.
```

## Testing

### Test 1: Username Persistence
```
1. Open app → Enter username "Alice"
2. Close app completely
3. Reopen app → Username still "Alice" ✓
4. No onboarding screen shown ✓
```

### Test 2: Friends Persistence
```
1. Add friend "Bob"
2. Close app
3. Reopen app
4. Friends list still shows "Bob" ✓
```

### Test 3: Device ID Stability
```
1. Check device ID in logs
2. Close app
3. Reopen app
4. Device ID is the same ✓
5. Friends can still recognize you ✓
```

### Test 4: Friend Requests
```
1. Receive friend request from "Charlie"
2. Close app before accepting
3. Reopen app
4. Friend request still pending ✓
```

## Data Clearing (For Testing)

### Clear All Data
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Clear everything (reset app to fresh state)
await AsyncStorage.clear();
```

### Clear Specific Data
```typescript
// Clear username only
await AsyncStorage.removeItem('@meshage_username');

// Clear friends
await AsyncStorage.removeItem('@meshage_friends');

// Clear device ID (will generate new one)
await AsyncStorage.removeItem('@meshage_device_id');
```

### Via StorageService
```typescript
// Clear username
await StorageService.clearUsername();

// Remove specific friend
await StorageService.removeFriend('persistentId');

// Remove friend request
await StorageService.removeFriendRequest('persistentId');
```

## Migration Notes

### Existing Users
- **No migration needed** - Fresh installs only
- In-memory data was lost on restart anyway
- First launch after upgrade will be like fresh install

### Data Format
All data stored as JSON strings:
```typescript
// Friends example
{
  "@meshage_friends": '[{"persistentId":"abc-123","displayName":"Bob","lastSeen":1234567890}]'
}
```

## Error Handling

All methods include try-catch blocks:
```typescript
try {
  await AsyncStorage.setItem(key, value);
} catch (error) {
  console.error('Error saving:', error);
  // Graceful fallback
}
```

## Performance

### AsyncStorage Characteristics
- **Fast:** Optimized for mobile
- **Async:** Non-blocking operations
- **Reliable:** Data persists even if app crashes
- **Size limit:** ~6MB on Android, ~10MB on iOS (more than enough)

## Security Considerations

### Current Implementation
- Data stored unencrypted on device
- Accessible only to the app (sandboxed)
- Not synced to cloud

### Future Enhancements
For sensitive data, consider:
1. **Encryption:** Use `react-native-encrypted-storage`
2. **Secure Storage:** Use device keychain/keystore
3. **Backup:** Implement cloud sync

## Debugging

### View Stored Data
```typescript
// Get all keys
const keys = await AsyncStorage.getAllKeys();
console.log('Storage keys:', keys);

// Get all data
const allData = await AsyncStorage.multiGet(keys);
console.log('All stored data:', allData);
```

### Common Issues

**Issue:** Data not persisting
```typescript
// Check if AsyncStorage is working
await AsyncStorage.setItem('test', 'value');
const test = await AsyncStorage.getItem('test');
console.log('Test:', test); // Should print 'value'
```

**Issue:** Old data interfering
```typescript
// Clear and start fresh
await AsyncStorage.clear();
```

## Summary

✅ **Upgraded from in-memory to AsyncStorage**  
✅ **All data now persists across app restarts**  
✅ **No API changes - existing code works as-is**  
✅ **Production-ready storage solution**  
✅ **Better user experience with persistent data**  

---

**Your mesh network now has persistent storage!** 🎉

All user data (username, friends, device ID) survives app restarts and device reboots.
