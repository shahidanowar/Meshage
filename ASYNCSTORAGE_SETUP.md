# AsyncStorage Setup Instructions

## ✅ Upgrade Complete!

The storage system has been successfully upgraded to AsyncStorage. Here's what you need to know:

## What Was Done

### 1. **Code Changes**
- ✅ Updated `src/utils/storage.ts` to use AsyncStorage
- ✅ Removed in-memory storage implementation
- ✅ All StorageService methods now use persistent storage

### 2. **Package Already Installed**
- ✅ `@react-native-async-storage/async-storage` v2.2.0 is already in package.json
- ✅ No additional installation needed

## Next Steps

### For Android

#### Option 1: Clean Build (Recommended)
```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npm run android
```

#### Option 2: Quick Rebuild
```bash
# Just rebuild
npm run android
```

### For iOS (if needed)
```bash
# Install pods
cd ios
bundle exec pod install
cd ..

# Run
npm run ios
```

## Verification

### Test the Upgrade
1. **First Launch:**
   ```
   - Enter username "TestUser"
   - Complete onboarding
   - Add a friend
   ```

2. **Close App Completely:**
   ```
   - Force close the app
   - Or restart device
   ```

3. **Reopen App:**
   ```
   - ✅ Should skip onboarding (username remembered)
   - ✅ Username should be "TestUser"
   - ✅ Friends list should be intact
   - ✅ Device ID should be the same
   ```

### Check Logs
Look for these console messages:
```
Retrieved existing device ID: abc-123-def-456
Device Identifier: TestUser|abc-123-def-456
Loaded friends: 1
```

## Troubleshooting

### Issue: Build Errors

**Solution 1: Clean Build**
```bash
cd android
./gradlew clean
cd ..
npm run android
```

**Solution 2: Clear Metro Cache**
```bash
npm start -- --reset-cache
```

### Issue: Data Not Persisting

**Check AsyncStorage:**
```typescript
// Add this temporarily to any screen
import AsyncStorage from '@react-native-async-storage/async-storage';

useEffect(() => {
  const testStorage = async () => {
    await AsyncStorage.setItem('test', 'working');
    const value = await AsyncStorage.getItem('test');
    console.log('AsyncStorage test:', value); // Should print "working"
  };
  testStorage();
}, []);
```

### Issue: Old Data Interfering

**Clear All Storage:**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Add this to Settings screen or run in console
const clearAll = async () => {
  await AsyncStorage.clear();
  console.log('Storage cleared');
};
```

## What's Stored Now

All data persists across app restarts:

| Key | Data | Example |
|-----|------|---------|
| `@meshage_username` | User's name | "Alice" |
| `@meshage_device_id` | Persistent UUID | "abc-123-def" |
| `@meshage_friends` | Friends list (JSON) | `[{...}]` |
| `@meshage_friend_requests` | Pending requests (JSON) | `[{...}]` |
| `@meshage_onboarding_complete` | Onboarding flag | "true" |

## Features Now Available

### ✅ Persistent Username
- Enter once, never again
- Survives app restarts

### ✅ Stable Device ID
- Same ID forever
- Friends always recognize you

### ✅ Persistent Friends
- Friends list never lost
- Survives app closure

### ✅ Saved Friend Requests
- Pending requests survive restarts
- Can respond later

### ✅ Onboarding Memory
- Only shown once
- Never repeats

## Development Tips

### Clear Data During Testing
Add a "Reset App" button in Settings:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const handleReset = async () => {
  await AsyncStorage.clear();
  Alert.alert('Success', 'App data cleared. Please restart the app.');
};
```

### View All Stored Data
```typescript
const viewStorage = async () => {
  const keys = await AsyncStorage.getAllKeys();
  const data = await AsyncStorage.multiGet(keys);
  console.log('All storage:', data);
};
```

## No Code Changes Needed

The StorageService API remains identical:
```typescript
// All existing code works without modification
await StorageService.saveUsername('Alice');
const username = await StorageService.getUsername();
const friends = await StorageService.getFriends();
await StorageService.addFriend({...});
```

## Performance

AsyncStorage is:
- ✅ Fast (optimized for mobile)
- ✅ Async (non-blocking)
- ✅ Reliable (data persists even if app crashes)
- ✅ Sufficient size (~6MB on Android, ~10MB on iOS)

## Summary

🎉 **AsyncStorage upgrade complete!**

- ✅ Code updated
- ✅ Package already installed
- ✅ No breaking changes
- ✅ Ready to build and test

**Next:** Run `npm run android` to test the persistent storage!

---

**Note:** The first launch after this upgrade will be like a fresh install (no data to migrate from in-memory storage). This is expected and normal.
