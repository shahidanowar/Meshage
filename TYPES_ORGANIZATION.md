# Types Organization - Centralized Interface Management

## Overview
All TypeScript interfaces and types have been moved to a centralized location for better maintainability and reusability.

---

## New File Structure

### **`src/types/index.ts`** (New!)
Central location for all shared types and interfaces.

```
src/
├── types/
│   └── index.ts          ← All interfaces here
├── utils/
│   └── storage.ts        ← Imports & re-exports types
└── screens/
    └── Chats/
        └── useChatScreen.ts  ← Imports types
```

---

## Types Defined

### **Core Interfaces**

#### **Peer**
```typescript
export interface Peer {
  deviceName: string;        // "Alice|abc-123"
  deviceAddress: string;     // "2mxk" (endpoint ID)
  status: number;            // 0-4
  persistentId?: string;     // "abc-123" (extracted)
  displayName?: string;      // "Alice" (extracted)
}
```

#### **Message**
```typescript
export interface Message {
  id: string;                // "1697456789-2mxk"
  text: string;              // Message content
  fromAddress: string;       // Sender endpoint ID
  senderName: string;        // Sender display name
  timestamp: number;         // Unix timestamp
  isSent: boolean;           // true/false
}
```

#### **Friend**
```typescript
export interface Friend {
  persistentId: string;      // "abc-123"
  displayName: string;       // "Alice"
  deviceAddress?: string;    // "2mxk" (last known)
  lastSeen?: number;         // Timestamp
}
```

#### **FriendRequest**
```typescript
export interface FriendRequest {
  persistentId: string;      // "abc-123"
  displayName: string;       // "Alice"
  deviceAddress: string;     // "2mxk"
  timestamp: number;         // Request time
  type?: 'incoming' | 'outgoing';
}
```

### **Event Interfaces**

#### **DiscoveryEvent**
```typescript
export interface DiscoveryEvent {
  status: string;
  reasonCode?: number;
}
```

#### **ConnectionInfo**
```typescript
export interface ConnectionInfo {
  isGroupOwner: boolean;
  groupOwnerAddress: string;
}
```

#### **MessageReceivedEvent**
```typescript
export interface MessageReceivedEvent {
  message: string;
  fromAddress: string;
  senderName: string;
  timestamp: number;
}
```

#### **MessageSentEvent**
```typescript
export interface MessageSentEvent {
  message: string;
  success: boolean;
}
```

#### **PeerConnectedEvent**
```typescript
export interface PeerConnectedEvent {
  address: string;
}
```

#### **PeerDisconnectedEvent**
```typescript
export interface PeerDisconnectedEvent {
  address: string;
}
```

---

## File Changes

### **1. Created: `src/types/index.ts`**
- ✅ All interfaces defined in one place
- ✅ Easy to import from anywhere
- ✅ Single source of truth

### **2. Updated: `src/utils/storage.ts`**

#### Before:
```typescript
export interface Friend {
  persistentId: string;
  displayName: string;
  deviceAddress?: string;
  lastSeen?: number;
}

export interface FriendRequest {
  persistentId: string;
  displayName: string;
  deviceAddress: string;
  timestamp: number;
  type?: 'incoming' | 'outgoing';
}
```

#### After:
```typescript
import type { Friend, FriendRequest } from '../types';

// Re-export types for backward compatibility
export type { Friend, FriendRequest };
```

### **3. Updated: `src/screens/Chats/useChatScreen.ts`**

#### Before:
```typescript
interface Peer {
  deviceName: string;
  deviceAddress: string;
  status: number;
  persistentId?: string;
  displayName?: string;
}

interface Message {
  id: string;
  text: string;
  fromAddress: string;
  senderName: string;
  timestamp: number;
  isSent: boolean;
}

interface DiscoveryEvent {
  status: string;
  reasonCode?: number;
}

interface ConnectionInfo {
  isGroupOwner: boolean;
  groupOwnerAddress: string;
}
```

#### After:
```typescript
import type { 
  Peer, 
  Message, 
  DiscoveryEvent, 
  ConnectionInfo,
  MessageReceivedEvent,
  FriendRequest 
} from '../../types';
```

---

## Usage Examples

### **Importing Types**

```typescript
// In any file
import type { Peer, Message, Friend } from '../types';
// or from storage (backward compatible)
import type { Friend, FriendRequest } from '../utils/storage';

// Use the types
const peer: Peer = {
  deviceName: "Alice|abc-123",
  deviceAddress: "2mxk",
  status: 3,
  persistentId: "abc-123",
  displayName: "Alice"
};

const message: Message = {
  id: "1697456789-2mxk",
  text: "Hello!",
  fromAddress: "2mxk",
  senderName: "Alice",
  timestamp: Date.now(),
  isSent: false
};
```

### **Type-Safe Event Handlers**

```typescript
// Before
const onMessageReceivedListener = MeshNetworkEvents.addListener(
  'onMessageReceived',
  async (data: { message: string; fromAddress: string; senderName: string; timestamp: number }) => {
    // ...
  }
);

// After
const onMessageReceivedListener = MeshNetworkEvents.addListener(
  'onMessageReceived',
  async (data: MessageReceivedEvent) => {
    // TypeScript knows exactly what fields are available
    console.log(data.message, data.senderName);
  }
);
```

---

## Benefits

### **1. Centralized Management**
- ✅ All types in one place
- ✅ Easy to find and update
- ✅ No duplicate definitions

### **2. Better Type Safety**
- ✅ Consistent types across files
- ✅ Compiler catches mismatches
- ✅ Better IDE autocomplete

### **3. Easier Maintenance**
- ✅ Update once, applies everywhere
- ✅ Clear interface contracts
- ✅ Easier to add new fields

### **4. Better Documentation**
- ✅ Single file to understand data structures
- ✅ Comments in one place
- ✅ Clear API contracts

### **5. Reusability**
- ✅ Import from anywhere
- ✅ No circular dependencies
- ✅ Clean imports

---

## Import Patterns

### **Option 1: Direct Import (Recommended)**
```typescript
import type { Peer, Message, Friend } from '../../types';
```

### **Option 2: From Storage (Backward Compatible)**
```typescript
import type { Friend, FriendRequest } from '../../utils/storage';
```

Both work! Storage re-exports for backward compatibility.

---

## Adding New Types

To add a new type:

1. **Add to `src/types/index.ts`:**
```typescript
export interface NewType {
  field1: string;
  field2: number;
}
```

2. **Import where needed:**
```typescript
import type { NewType } from '../../types';
```

3. **Use it:**
```typescript
const data: NewType = {
  field1: "value",
  field2: 123
};
```

---

## Migration Summary

| File | Before | After |
|------|--------|-------|
| `types/index.ts` | ❌ Didn't exist | ✅ All types defined |
| `storage.ts` | ✅ Defined Friend, FriendRequest | ✅ Imports & re-exports |
| `useChatScreen.ts` | ✅ Defined 4 interfaces | ✅ Imports from types |

**Lines of code reduced:** ~40 lines  
**Type safety improved:** ✅  
**Maintainability improved:** ✅  

---

## Type Hierarchy

```
types/index.ts
├── Peer (device info)
├── Message (chat messages)
├── Friend (stored friends)
├── FriendRequest (pending requests)
├── DiscoveryEvent (discovery status)
├── ConnectionInfo (connection details)
└── Event Types
    ├── MessageReceivedEvent
    ├── MessageSentEvent
    ├── PeerConnectedEvent
    └── PeerDisconnectedEvent
```

---

## Summary

✅ **All interfaces moved to `src/types/index.ts`**  
✅ **Backward compatibility maintained**  
✅ **Cleaner imports throughout codebase**  
✅ **Better type safety and IDE support**  
✅ **Single source of truth for all types**  

**Your types are now organized and centralized!** 🎯
