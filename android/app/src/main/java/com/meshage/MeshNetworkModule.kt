package com.meshage

import android.content.ContentValues
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.*
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.io.OutputStream
import java.nio.charset.StandardCharsets

class MeshNetworkModule(private val reactContext: ReactApplicationContext) :
        ReactContextBaseJavaModule(reactContext) {

    private val connectionsClient: ConnectionsClient by lazy {
        Nearby.getConnectionsClient(reactContext)
    }
    private val discoveredEndpoints = mutableMapOf<String, String>()
    private val connectedEndpoints = mutableSetOf<String>()
    
    companion object {
        private const val SERVICE_ID = "com.meshage.mesh"
        private const val TAG = "MeshNetworkModule"
    }

    override fun getName() = "MeshNetwork"

    private fun sendEvent(eventName: String, params: Any?) {
        reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
    }

    private val endpointDiscoveryCallback =
            object : EndpointDiscoveryCallback() {
                override fun onEndpointFound(endpointId: String, info: DiscoveredEndpointInfo) {
                    Log.d(TAG, "Peer Found: ${info.endpointName}")
                    discoveredEndpoints[endpointId] = info.endpointName
                    
                    // Convert to peer format compatible with UI
                    updatePeersList()
                }

                override fun onEndpointLost(endpointId: String) {
                    Log.d(TAG, "Peer Lost: $endpointId")
                    discoveredEndpoints.remove(endpointId)
                    updatePeersList()
                }
            }
    
    private fun updatePeersList() {
        val peersArray = Arguments.createArray()
        discoveredEndpoints.forEach { (id, name) ->
            val peerMap = Arguments.createMap().apply {
                putString("deviceName", name)
                putString("deviceAddress", id)
                putInt("status", if (connectedEndpoints.contains(id)) 0 else 3) // 0=Connected, 3=Available
            }
            peersArray.pushMap(peerMap)
        }
        sendEvent("onPeersFound", peersArray)
    }

    private val connectionLifecycleCallback =
            object : ConnectionLifecycleCallback() {
                override fun onConnectionInitiated(
                        endpointId: String,
                        connectionInfo: ConnectionInfo
                ) {
                    Log.d(TAG, "Connection Initiated from ${connectionInfo.endpointName} ($endpointId)")
                    
                    // Auto-accept all connections for mesh networking
                    connectionsClient.acceptConnection(endpointId, payloadCallback)
                    
                    sendEvent("onConnectionInitiated", Arguments.createMap().apply {
                        putString("deviceAddress", endpointId)
                    })
                }

                override fun onConnectionResult(endpointId: String, result: ConnectionResolution) {
                    if (result.status.isSuccess) {
                        Log.d(TAG, "Connection Successful to $endpointId")
                        connectedEndpoints.add(endpointId)
                        
                        // Emit connection changed event
                        sendEvent("onConnectionChanged", Arguments.createMap().apply {
                            putBoolean("isGroupOwner", false) // Nearby is P2P, no group owner concept
                            putString("groupOwnerAddress", endpointId)
                        })
                        
                        // Emit peer connected
                        sendEvent("onPeerConnected", Arguments.createMap().apply {
                            putString("address", endpointId)
                        })
                        
                        updatePeersList()
                    } else {
                        Log.d(TAG, "Connection Failed to $endpointId")
                        sendEvent("onConnectionError", Arguments.createMap().apply {
                            putString("deviceAddress", endpointId)
                            putInt("reasonCode", result.status.statusCode)
                        })
                    }
                }

                override fun onDisconnected(endpointId: String) {
                    Log.d(TAG, "Disconnected from: $endpointId")
                    connectedEndpoints.remove(endpointId)
                    
                    sendEvent("onPeerDisconnected", Arguments.createMap().apply {
                        putString("address", endpointId)
                    })
                    
                    updatePeersList()
                }
            }

    private val payloadCallback =
            object : PayloadCallback() {
                override fun onPayloadReceived(endpointId: String, payload: Payload) {
                    when (payload.type) {
                        Payload.Type.BYTES -> {
                            val message = String(payload.asBytes()!!, StandardCharsets.UTF_8)
                            Log.d(TAG, "Message received from $endpointId: $message")
                            
                            // Emit message received event
                            sendEvent("onMessageReceived", Arguments.createMap().apply {
                                putString("message", message)
                                putString("fromAddress", endpointId)
                                putDouble("timestamp", System.currentTimeMillis().toDouble())
                            })
                            
                            // Forward message to other connected peers (mesh routing)
                            forwardMessageToOthers(message, endpointId)
                        }
                        else -> Log.d(TAG, "Received non-BYTES payload type, ignoring")
                    }
                }

                override fun onPayloadTransferUpdate(
                        endpointId: String,
                        update: PayloadTransferUpdate
                ) {
                    // Not needed for simple messaging, but required to implement
                }
            }
    
    private fun forwardMessageToOthers(message: String, senderEndpointId: String) {
        // Forward to all connected peers except the sender (mesh routing)
        connectedEndpoints.forEach { endpointId ->
            if (endpointId != senderEndpointId) {
                val payload = Payload.fromBytes(message.toByteArray(StandardCharsets.UTF_8))
                connectionsClient.sendPayload(endpointId, payload)
                Log.d(TAG, "Forwarded message to $endpointId")
            }
        }
    }

    private var localDeviceName: String = "Meshage-${android.os.Build.MODEL}"
    
    @ReactMethod
    fun init() {
        Log.d(TAG, "MeshNetworkModule initialized with Nearby Connections")
        sendEvent("onInitialized", null)
    }
    
    @ReactMethod
    fun setDeviceName(deviceName: String) {
        localDeviceName = deviceName
        Log.d(TAG, "Device name set to: $deviceName")
    }
    
    @ReactMethod
    fun discoverPeers() {
        // Start both advertising and discovery for mesh networking
        val strategy = Strategy.P2P_CLUSTER // Better for mesh networks
        
        // Start advertising (so others can find us)
        val advertisingOptions = AdvertisingOptions.Builder().setStrategy(strategy).build()
        connectionsClient
                .startAdvertising(
                        localDeviceName,
                        SERVICE_ID,
                        connectionLifecycleCallback,
                        advertisingOptions
                )
                .addOnSuccessListener {
                    Log.d(TAG, "Advertising started")
                }
                .addOnFailureListener { e ->
                    Log.e(TAG, "Advertising failed", e)
                }
        
        // Start discovery (to find others)
        val discoveryOptions = DiscoveryOptions.Builder().setStrategy(strategy).build()
        connectionsClient
                .startDiscovery(SERVICE_ID, endpointDiscoveryCallback, discoveryOptions)
                .addOnSuccessListener {
                    Log.d(TAG, "Discovery started")
                    sendEvent("onDiscoveryStateChanged", Arguments.createMap().apply {
                        putString("status", "Discovery Started")
                    })
                }
                .addOnFailureListener { e ->
                    Log.e(TAG, "Discovery failed", e)
                    sendEvent("onDiscoveryStateChanged", Arguments.createMap().apply {
                        putString("status", "Discovery Failed")
                        putInt("reasonCode", 1)
                        putString("message", e.message ?: "Unknown error")
                    })
                }
    }

    @ReactMethod
    fun stopDiscovery() {
        connectionsClient.stopDiscovery()
        connectionsClient.stopAdvertising()
        Log.d(TAG, "Discovery and advertising stopped")
        sendEvent("onDiscoveryStateChanged", Arguments.createMap().apply {
            putString("status", "Discovery Stopped")
        })
    }

    @ReactMethod
    fun connectToPeer(peerAddress: String) {
        Log.d(TAG, "Connecting to peer: $peerAddress")
        connectionsClient
                .requestConnection(localDeviceName, peerAddress, connectionLifecycleCallback)
                .addOnSuccessListener {
                    Log.d(TAG, "Connection request sent to $peerAddress")
                }
                .addOnFailureListener { e ->
                    Log.e(TAG, "Connection request failed", e)
                    sendEvent("onConnectionError", Arguments.createMap().apply {
                        putString("deviceAddress", peerAddress)
                        putInt("reasonCode", 1)
                    })
                }
    }

    @ReactMethod
    fun disconnect() {
        connectionsClient.stopAllEndpoints()
        connectedEndpoints.clear()
        discoveredEndpoints.clear()
        Log.d(TAG, "Disconnected from all peers")
        sendEvent("onDisconnected", Arguments.createMap().apply {
            putBoolean("success", true)
        })
    }

    @ReactMethod
    fun sendMessage(message: String, targetAddress: String?) {
        val payload = Payload.fromBytes(message.toByteArray(StandardCharsets.UTF_8))
        
        if (targetAddress != null) {
            // Send to specific peer
            connectionsClient.sendPayload(targetAddress, payload)
                    .addOnSuccessListener {
                        Log.d(TAG, "Message sent to $targetAddress")
                        sendEvent("onMessageSent", Arguments.createMap().apply {
                            putString("message", message)
                            putString("targetAddress", targetAddress)
                            putBoolean("success", true)
                        })
                    }
                    .addOnFailureListener { e ->
                        Log.e(TAG, "Message send failed", e)
                        sendEvent("onMessageError", Arguments.createMap().apply {
                            putString("error", e.message)
                        })
                    }
        } else {
            // Broadcast to all connected peers
            if (connectedEndpoints.isEmpty()) {
                Log.w(TAG, "No connected peers")
                sendEvent("onMessageError", Arguments.createMap().apply {
                    putString("error", "No connected peers")
                })
                return
            }
            
            connectedEndpoints.forEach { endpointId ->
                connectionsClient.sendPayload(endpointId, payload)
                Log.d(TAG, "Message broadcast to $endpointId")
            }
            
            sendEvent("onMessageSent", Arguments.createMap().apply {
                putString("message", message)
                putString("targetAddress", null)
                putBoolean("success", true)
            })
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for React Native's Event Emitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for React Native's Event Emitter
    }
}
