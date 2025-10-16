# Settings Screen Update

## Overview

The Settings screen has been completely redesigned to display **real user information** from the app's storage, including username, persistent device ID, friends count, and a QR code for easy friend sharing.

## Changes Made

### Before ❌
```typescript
// Hardcoded dummy data
const [userId, setUserId] = useState<string | null>(null);

useEffect(() => {
  setTimeout(() => {
    setUserId("USER-987654"); // Fake ID
  }, 1000);
}, []);

return (
  <Text style={styles.name}>Faruk Khan</Text> // Hardcoded name
  <QRCode value={userId} size={200} /> // Fake QR code
);
```

### After ✅
```typescript
// Real data from StorageService
const [username, setUsername] = useState<string>('');
const [deviceId, setDeviceId] = useState<string>('');
const [friendsCount, setFriendsCount] = useState<number>(0);

useEffect(() => {
  loadUserData();
}, []);

const loadUserData = async () => {
  const savedUsername = await StorageService.getUsername();
  const savedDeviceId = await StorageService.getDeviceId();
  const friends = await StorageService.getFriends();
  
  setUsername(savedUsername || 'User');
  setDeviceId(savedDeviceId);
  setFriendsCount(friends.length);
};

return (
  <Text style={styles.name}>{username}</Text> // Real username
  <QRCode value={deviceId} size={200} /> // Real persistent device ID
);
```

## Features

### 1. **User Profile Section**
- **Avatar:** Shows first letter of username in a circular badge
- **Username:** Displays actual username from storage
- **Subtitle:** "Mesh Network User"

### 2. **QR Code Section**
- **QR Code:** Encodes the user's **persistent device ID**
- **Purpose:** Friends can scan to add you
- **Size:** 200x200 pixels
- **Background:** White for better scanning

### 3. **Device Information Card**
Displays:
- **Username:** Full username
- **Device ID (Short):** First 8 + last 4 characters (e.g., `abc12345...6789`)
- **Full ID:** Complete persistent device ID
- **Friends Count:** Number of friends in the list

### 4. **Network Status Card**
- Information about mesh network connectivity
- Warning about disconnecting

### 5. **Clear Data Button**
- **Dangerous action** - Clears all app data
- **Confirmation dialog** before executing
- Resets app to fresh state

## UI Layout

```
┌─────────────────────────────────────┐
│         [A]  (Avatar)               │
│         Alice                       │
│    Mesh Network User                │
├─────────────────────────────────────┤
│     Your QR Code                    │
│  Share this with friends            │
│                                     │
│     ┌─────────────────┐            │
│     │                 │            │
│     │   QR CODE       │            │
│     │   (Device ID)   │            │
│     │                 │            │
│     └─────────────────┘            │
│   Scan to add me as friend         │
├─────────────────────────────────────┤
│   Device Information                │
│  ┌───────────────────────────────┐ │
│  │ Username:        Alice        │ │
│  ├───────────────────────────────┤ │
│  │ Device ID:   abc12345...6789  │ │
│  ├───────────────────────────────┤ │
│  │ Full ID:     abc-123-def-456  │ │
│  ├───────────────────────────────┤ │
│  │ Friends:     3                │ │
│  └───────────────────────────────┘ │
├─────────────────────────────────────┤
│  📡 Mesh Network Status             │
│  Stay connected to discover nearby  │
│  devices and chat with friends.     │
│  ⚠️ Disconnecting will stop msgs    │
├─────────────────────────────────────┤
│     [Clear All Data]                │
│  This will reset the app            │
└─────────────────────────────────────┘
```

## Data Sources

### StorageService Methods Used

| Method | Returns | Used For |
|--------|---------|----------|
| `getUsername()` | `string \| null` | Display name |
| `getDeviceId()` | `string` | QR code & device info |
| `getFriends()` | `Friend[]` | Friends count |

### Data Flow

```
Settings Screen Mount
       ↓
loadUserData()
       ↓
┌──────────────────────────────────┐
│ StorageService.getUsername()     │ → username
│ StorageService.getDeviceId()     │ → deviceId (for QR)
│ StorageService.getFriends()      │ → friendsCount
└──────────────────────────────────┘
       ↓
Update UI State
       ↓
Render Profile, QR Code, Info Card
```

## QR Code Details

### What's Encoded
```
Persistent Device ID (UUID v4)
Example: "a3f8c2e1-4b6d-4xyz-9abc-123456789def"
```

### Why Persistent ID?
- ✅ **Stable:** Never changes across app restarts
- ✅ **Unique:** Identifies user permanently
- ✅ **Shareable:** Friends can scan and save
- ✅ **Privacy:** No personal info (just UUID)

### Future Enhancement: QR Scanning
To implement friend adding via QR:
```typescript
// Scan QR code
const scannedId = scanQRCode(); // "abc-123-def-456"

// Add as friend
await StorageService.addFriend({
  persistentId: scannedId,
  displayName: 'Scanned User',
  deviceAddress: '', // Will be filled when they connect
});
```

## Helper Functions

### formatDeviceId()
```typescript
const formatDeviceId = (id: string) => {
  // Show first 8 and last 4 characters
  if (id.length > 12) {
    return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`;
  }
  return id;
};

// Example:
// Input:  "a3f8c2e1-4b6d-4xyz-9abc-123456789def"
// Output: "a3f8c2e1...9def"
```

### handleClearData()
```typescript
const handleClearData = () => {
  Alert.alert(
    'Clear All Data',
    'This will delete your username, friends list, and all app data.',
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
```

## Styling

### Color Scheme
- **Primary:** `#007aff` (Blue - Avatar, buttons)
- **Background:** `#f5f5f5` (Light gray)
- **Cards:** `#fff` (White)
- **Text Primary:** `#222` (Dark gray)
- **Text Secondary:** `#666` (Medium gray)
- **Danger:** `#ff3b30` (Red - Clear data button)
- **Warning:** `#ff9500` (Orange - Warning text)

### Design Principles
- **Clean & Modern:** Card-based layout
- **Readable:** Good contrast and spacing
- **Informative:** All relevant user data visible
- **Safe:** Confirmation for destructive actions

## Testing

### Test Scenario 1: View User Info
```
1. Complete onboarding with username "Alice"
2. Add 2 friends
3. Navigate to Settings tab
4. Verify:
   ✓ Avatar shows "A"
   ✓ Name shows "Alice"
   ✓ QR code is displayed
   ✓ Device ID is shown (shortened and full)
   ✓ Friends count shows "2"
```

### Test Scenario 2: QR Code
```
1. Open Settings screen
2. Check QR code
3. Verify:
   ✓ QR code is visible and scannable
   ✓ Contains persistent device ID
   ✓ Label says "Scan to add me as friend"
```

### Test Scenario 3: Clear Data
```
1. Tap "Clear All Data" button
2. Verify:
   ✓ Confirmation dialog appears
   ✓ Tapping "Cancel" does nothing
3. Tap "Clear" in dialog
4. Verify:
   ✓ Success message shown
   ✓ App needs restart
5. Restart app
6. Verify:
   ✓ Onboarding screen appears
   ✓ All data cleared
```

### Test Scenario 4: Loading State
```
1. Open Settings screen
2. Verify:
   ✓ "Loading..." text shows briefly
   ✓ Data loads and displays
   ✓ No errors in console
```

## Files Modified

### `src/screens/Settings/SettingsScreen.tsx`
- ✅ Added imports: `StorageService`, `AsyncStorage`
- ✅ Added state: `username`, `deviceId`, `friendsCount`, `loading`
- ✅ Added `loadUserData()` function
- ✅ Added `handleClearData()` function
- ✅ Added `formatDeviceId()` helper
- ✅ Redesigned UI with profile, QR, info cards
- ✅ Added comprehensive styles

## Benefits

### ✅ **Real Data**
- Shows actual user information
- No hardcoded values
- Synced with app state

### ✅ **QR Code Sharing**
- Easy friend sharing
- Persistent device ID encoded
- Ready for QR scanning feature

### ✅ **Informative**
- All user data visible
- Friends count displayed
- Device ID for debugging

### ✅ **Safe**
- Confirmation before data clearing
- Clear warnings about actions
- Graceful error handling

### ✅ **Modern UI**
- Clean card-based design
- Good spacing and typography
- Professional appearance

## Future Enhancements

### 1. **QR Scanner**
Add ability to scan friend's QR code:
```typescript
import { Camera } from 'react-native-camera';

const scanFriendQR = async () => {
  const scannedId = await scanQR();
  await StorageService.addFriend({
    persistentId: scannedId,
    displayName: 'New Friend',
  });
};
```

### 2. **Edit Username**
Allow users to change their username:
```typescript
const handleEditUsername = async (newName: string) => {
  await StorageService.saveUsername(newName);
  setUsername(newName);
};
```

### 3. **Share QR Code**
Export QR code as image:
```typescript
import { captureRef } from 'react-native-view-shot';

const shareQRCode = async () => {
  const uri = await captureRef(qrRef);
  Share.share({ url: uri });
};
```

### 4. **Device ID Reset**
Allow users to generate new device ID:
```typescript
const resetDeviceId = async () => {
  await AsyncStorage.removeItem('@meshage_device_id');
  const newId = await StorageService.getDeviceId();
  setDeviceId(newId);
};
```

## Summary

✅ **Settings screen now displays real user data**  
✅ **QR code contains persistent device ID**  
✅ **Shows username, device ID, and friends count**  
✅ **Includes data clearing functionality**  
✅ **Modern, clean UI design**  

---

**The Settings screen is now fully functional with real user data!** 🎉
