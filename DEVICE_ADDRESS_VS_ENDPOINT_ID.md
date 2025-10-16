# Device Address vs Endpoint ID - Explained

## Quick Answer

**Device Address** and **Endpoint ID** are the **SAME THING** - they're both temporary identifiers assigned by Google Nearby Connections API.

The different names are just used in different contexts:
- **Endpoint ID** = Your own temporary ID
- **Device Address** = Another peer's temporary ID (their endpoint ID)

## Detailed Explanation

### What They Are

Both refer to the **temporary session identifier** assigned by Google Nearby Connections when a device joins the mesh network.

**Format:** Can be various formats depending on the Nearby Connections implementation
- Sometimes: Random string like `"2mxk"`, `"7xyz"`
- In our app: `"local-{timestamp}"` for our own device

**Characteristics:**
- ✅ Temporary (changes on app restart)
- ✅ Unique per session
- ✅ Used for routing messages
- ❌ Not persistent across restarts

### Terminology in Our App

#### 1. **Local Endpoint ID** (Your ID)
```typescript
// In native module
private var localEndpointId: String = ""

// When you connect
localEndpointId = "local-1697456789"

// Exposed to React Native
MeshNetwork.getLocalEndpointId() // Returns "local-1697456789"
```

**This is YOUR temporary ID for the current session.**

#### 2. **Device Address** (Peer's ID)
```typescript
// In peer list
interface Peer {
  deviceName: string;
  deviceAddress: string;  // ← This is the peer's endpoint ID
  status: number;
}

// Example peer
{
  deviceName: "Alice|abc-123",
  deviceAddress: "endpoint_alice_456",  // ← Alice's endpoint ID
  status: 3
}
```

**This is the OTHER device's endpoint ID.**

### Visual Comparison

```
Device A (You):
├─ Persistent Device ID: "abc-123-def-456" (permanent)
└─ Local Endpoint ID: "local-1697456789" (temporary)

Device B (Peer):
├─ Persistent Device ID: "xyz-789-ghi-012" (permanent)
└─ Device Address: "endpoint_bob_123" (temporary)
     └─ This is Device B's endpoint ID
```

### In the Code

#### Native Module (Kotlin)
```kotlin
// When advertising, Nearby Connections assigns an endpoint ID to you
// This is stored in localEndpointId

// When discovering peers, you receive their endpoint IDs
val peerMap = Arguments.createMap().apply {
    putString("deviceName", name)
    putString("deviceAddress", id)  // ← Peer's endpoint ID
}
```

#### React Native (TypeScript)
```typescript
// Your endpoint ID
const myEndpointId = await MeshNetwork.getLocalEndpointId();
// Returns: "local-1697456789"

// Peer's endpoint ID (called deviceAddress)
const peer = {
  deviceAddress: "endpoint_alice_456"  // ← Same concept, different device
};
```

### Why Different Names?

**Perspective matters:**

| Context | Term Used | Refers To |
|---------|-----------|-----------|
| Your own ID | Endpoint ID | Your temporary ID |
| Peer's ID | Device Address | Their temporary ID |
| Native module | Endpoint ID | Generic term |
| Peer list | Device Address | Peer's endpoint ID |

It's like saying:
- "My phone number" vs "Your phone number"
- Both are phone numbers, just different perspectives

## All the IDs in Our App

### 1. **Persistent Device ID** (Permanent)
```
Format: UUID v4
Example: "a3f8c2e1-4b6d-4xyz-9abc-123456789def"
Storage: AsyncStorage
Lifetime: Forever
Used for: Friends system, QR code
```

### 2. **Endpoint ID / Device Address** (Temporary)
```
Format: "local-{timestamp}" or random string
Example: "local-1697456789" or "endpoint_abc_123"
Storage: In-memory
Lifetime: Current session
Used for: Mesh routing, connections
```

### 3. **Device Name** (Identifier String)
```
Format: "username|persistentId"
Example: "Alice|abc-123-def-456"
Storage: Set in native module
Lifetime: Current session
Used for: Discovery, showing username
```

## Message Flow Example

```
Alice sends message to Bob:

Alice's IDs:
- Persistent ID: "alice-persistent-123"
- Endpoint ID: "local-1697456789"

Bob's IDs (from Alice's perspective):
- Persistent ID: "bob-persistent-456"
- Device Address: "endpoint_bob_789" ← Bob's endpoint ID

Message:
"local-1697456789|||DIRECT_MSG:bob-persistent-456:Hello"
 ^^^^^^^^^^^^^^^^^                ^^^^^^^^^^^^^^^^^^
 Alice's endpoint ID              Bob's persistent ID
 (for routing)                    (for filtering)

Bob receives from address: "local-1697456789"
                           ^^^^^^^^^^^^^^^^^^
                           Alice's endpoint ID (her device address from Bob's view)
```

## In Settings Screen

Currently showing:
```
Device Information:
├─ Username: Alice
├─ Device ID: abc12345...6789 (persistent, shortened)
├─ Full ID: abc-123-def-456 (persistent, full)
├─ Endpoint ID: local-1697456789 (temporary, yours)
└─ Friends: 3
```

**Should we add "Device Address"?**

**No, because:**
- Device Address = Endpoint ID (same thing)
- "Device Address" is for OTHER devices (peers)
- Your own endpoint ID is already shown

**What we could add:**
- List of connected peers with their device addresses
- But that's better suited for the Chats screen (peer list)

## Peer List (Chats Screen)

Already shows device addresses:
```
Discovered Peers:
┌─────────────────────────────┐
│ Alice                       │
│ endpoint_alice_123          │ ← This is Alice's device address (her endpoint ID)
│ ✓ Connected                 │
└─────────────────────────────┘
```

## Summary

### Same Thing, Different Names

| Your Perspective | Peer's Perspective |
|------------------|-------------------|
| My Endpoint ID | Your Device Address |
| `local-1697456789` | `endpoint_alice_123` |

### Key Takeaways

✅ **Device Address = Endpoint ID** (same concept)  
✅ **Your endpoint ID** = What you see in Settings  
✅ **Peer's device address** = Their endpoint ID (in peer list)  
✅ **Both are temporary** (change on restart)  
✅ **Different from persistent device ID** (permanent)  

### What to Show in Settings

**Already showing:**
- ✅ Your persistent device ID (permanent)
- ✅ Your endpoint ID (temporary)

**No need to add:**
- ❌ "Device Address" (it's the same as endpoint ID)
- ❌ Peer addresses (already in peer list)

### Recommendation

**Keep Settings as is:**
- Shows your persistent ID (for friends)
- Shows your endpoint ID (for current session)
- Clear and not confusing

**For peer device addresses:**
- Already visible in Chats screen peer list
- Each peer shows their device address (endpoint ID)

---

## Conclusion

**Device Address** and **Endpoint ID** are the **same thing** - just different terminology for the same temporary identifier assigned by Nearby Connections.

- **Your endpoint ID** = Shown in Settings
- **Peer's device address** = Shown in peer list (Chats screen)

No need to add "device address" to Settings - it would be redundant! ✓
