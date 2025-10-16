# Endpoint ID Clarification - The 4-Character Strings

## The Confusion

You see **two different types of endpoint IDs**:

### 1. **Google Nearby Connections Endpoint IDs** (Real)
```
Format: 4-character random strings
Examples: "2mxk", "7xyz", "ab3f", "9kl2"
Source: Assigned by Google Nearby Connections API
Used for: Actual peer-to-peer connections
```

### 2. **Our Internal "localEndpointId"** (For Tracking)
```
Format: "local-{timestamp}"
Example: "local-1697456789"
Source: Created by us in the app
Used for: Message deduplication tracking
```

## What's Really Happening

### When Discovering Peers

**Google Nearby Connections assigns endpoint IDs:**

```kotlin
// In MeshNetworkModule.kt
override fun onEndpointFound(endpointId: String, info: DiscoveredEndpointInfo) {
    // endpointId = "2mxk" ← Assigned by Google Nearby Connections
    Log.d(TAG, "Peer Found: ${info.endpointName}")
    discoveredEndpoints[endpointId] = info.endpointName
}
```

**These are sent to React Native as "deviceAddress":**

```kotlin
val peerMap = Arguments.createMap().apply {
    putString("deviceName", name)
    putString("deviceAddress", id)  // ← "2mxk", "7xyz", etc.
}
```

**You see them in the peer list:**
```
┌─────────────────────────────┐
│ Alice                       │
│ 2mxk                        │ ← Real endpoint ID from Nearby Connections
│ Available                   │
└─────────────────────────────┘
```

### Our "localEndpointId" is Different

**We create our own ID for message tracking:**

```kotlin
// When first connection is made
if (localEndpointId.isEmpty()) {
    localEndpointId = "local-${System.currentTimeMillis()}"
}

// Used in message format
val formattedMessage = "$localEndpointId$MESSAGE_SEPARATOR$message"
// Example: "local-1697456789|||Hello"
```

**This is NOT the same as the Nearby Connections endpoint ID!**

## The Truth

### Real Endpoint IDs (From Nearby Connections)

**What they are:**
- 4-character random strings
- Assigned by Google Nearby Connections API
- Used for actual connections
- Visible in peer list as "deviceAddress"

**Examples:**
```
Peer 1: deviceAddress = "2mxk"
Peer 2: deviceAddress = "7xyz"
Peer 3: deviceAddress = "ab3f"
```

**Where you see them:**
- Peer list in Chats screen
- Connection logs
- Message routing

### Our Internal ID (For Message Tracking)

**What it is:**
- `"local-{timestamp}"` format
- Created by us, not by Nearby Connections
- Used for message deduplication
- NOT used for actual connections

**Example:**
```
localEndpointId = "local-1697456789"
```

**Where it's used:**
- Message format: `"local-1697456789|||Hello"`
- Preventing message loops
- NOT for peer connections

## What Should Be in Settings?

### Current Implementation (Wrong!)

Settings shows:
```
Endpoint ID: local-1697456789
```

**Problem:** This is our internal tracking ID, not the real endpoint ID from Nearby Connections!

### What We Should Show

**Option 1: Don't show endpoint ID at all**
- It's temporary and changes
- Not useful for users
- Already visible in peer list

**Option 2: Get the REAL endpoint ID**
- We need to get it from Nearby Connections
- But Nearby doesn't give us our own endpoint ID easily
- We only know other peers' endpoint IDs

**Option 3: Show it as "Message Tracking ID"**
- Rename to clarify it's for internal use
- Not the same as peer endpoint IDs

## The Real Endpoint IDs

### How Nearby Connections Works

```
Device A starts advertising:
├─ Nearby Connections assigns: "2mxk"
└─ This is Device A's endpoint ID

Device B discovers Device A:
├─ Sees endpoint ID: "2mxk"
├─ Sees device name: "Alice|abc-123"
└─ Connects to: "2mxk"

Device B's endpoint ID:
├─ Assigned by Nearby: "7xyz"
└─ Device A sees: "7xyz"
```

### In Our App

**Peer List (Chats Screen):**
```typescript
{
  deviceName: "Alice|abc-123-def",
  deviceAddress: "2mxk",  // ← Real endpoint ID from Nearby
  status: 3
}
```

**Message Tracking:**
```kotlin
localEndpointId = "local-1697456789"  // ← Our internal ID
formattedMessage = "local-1697456789|||Hello"
```

## Why the Confusion?

### Two Different Systems

**1. Google Nearby Connections** (Real networking)
- Assigns endpoint IDs: `"2mxk"`, `"7xyz"`
- Used for connections
- We receive these for peers

**2. Our Message System** (Tracking)
- Creates tracking ID: `"local-1697456789"`
- Used for deduplication
- We create this ourselves

### We Don't Know Our Own Nearby Endpoint ID!

**Problem:**
- Nearby Connections doesn't tell us our own endpoint ID
- We only see other peers' endpoint IDs
- So we created `localEndpointId` for tracking

**What we know:**
- ✅ Other peers' endpoint IDs: `"2mxk"`, `"7xyz"`
- ❌ Our own Nearby endpoint ID: Unknown!
- ✅ Our tracking ID: `"local-1697456789"`

## Solution: Update Settings Screen

### Remove Misleading "Endpoint ID"

The current "Endpoint ID" in Settings is misleading because:
- It's not the real Nearby Connections endpoint ID
- It's our internal tracking ID
- Users might confuse it with peer endpoint IDs

### Better Approach

**Option 1: Remove it entirely**
```
Device Information:
├─ Username: Alice
├─ Device ID: abc12345...6789 (persistent)
├─ Full ID: abc-123-def-456 (persistent)
└─ Friends: 3
```

**Option 2: Rename to clarify**
```
Device Information:
├─ Username: Alice
├─ Device ID: abc12345...6789 (persistent)
├─ Full ID: abc-123-def-456 (persistent)
├─ Session ID: local-1697456789 (for tracking)
└─ Friends: 3
```

**Option 3: Show peer endpoint IDs instead**
```
Connected Peers:
├─ Alice (2mxk)
├─ Bob (7xyz)
└─ Charlie (ab3f)
```

## Recommendation

### Remove "Endpoint ID" from Settings

**Reasons:**
1. It's not the real endpoint ID from Nearby Connections
2. It's an internal implementation detail
3. Real endpoint IDs are already visible in peer list
4. It confuses users

### Keep Only Essential Info

```
Device Information:
├─ Username: Alice
├─ Persistent Device ID: abc-123-def-456
└─ Friends: 3
```

**Real endpoint IDs** are already visible where they matter:
- Peer list in Chats screen
- Shows each peer's endpoint ID (deviceAddress)

## Summary

### The 4-Character Strings

**What:** Real endpoint IDs from Google Nearby Connections  
**Format:** `"2mxk"`, `"7xyz"`, `"ab3f"`  
**Assigned by:** Google Nearby Connections API  
**Used for:** Actual peer-to-peer connections  
**Visible in:** Peer list (Chats screen)  

### Our "localEndpointId"

**What:** Internal message tracking ID  
**Format:** `"local-1697456789"`  
**Created by:** Our app  
**Used for:** Message deduplication  
**NOT:** The real endpoint ID  

### What to Do

**Remove or rename** the "Endpoint ID" in Settings because:
- ✅ It's misleading (not the real endpoint ID)
- ✅ Real endpoint IDs are in peer list
- ✅ Users don't need to see internal tracking IDs

---

**The 4-character strings you see are the REAL endpoint IDs from Google Nearby Connections!** 🎯

Our `"local-{timestamp}"` is just for internal message tracking, not the actual endpoint ID.
