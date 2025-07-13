# Bitchat Web BLE

A modern, responsive web chat client that connects to supported Bluetooth Low Energy (BLE) devices (such as the Bitchat Android app) using the Web Bluetooth API. Features a beautiful UI, language switching (English/Türkçe), and a premium chat experience.

---

## Bitchat Android Compatibility

This web client is **fully compatible** with the official [Bitchat Android app](https://github.com/permissionlesstech/bitchat-android) by [permissionlesstech](https://github.com/permissionlesstech/bitchat-android):

- **Bitchat Android** is a secure, decentralized, peer-to-peer messaging app that works over Bluetooth mesh networks—no internet, no servers, no phone numbers required.
- It features end-to-end encryption, channel support, private messaging, and a modern Material Design UI.
- The Android app acts as a BLE mesh node (both central and peripheral), and this web client can connect to it as a BLE central (client).
- **You can chat seamlessly between this web app and the Android app**—messages, channels, and encryption are all compatible.
- For more details and APK downloads, see the [Bitchat Android GitHub repo](https://github.com/permissionlesstech/bitchat-android).

---

## Features
- **Connect to any supported BLE device** (not just Android)
- **Real-time messaging** with modern chat bubbles and avatars
- **Language support:** English & Turkish (switch instantly)
- **Responsive, fullscreen UI** (no scrollbars, app-like feel)
- **Status indicator** (shows connection state with color)
- **Beautiful Bootstrap 5 design** with custom chat styling
- **Persistent nickname** (random by default, user-editable)
- **Easy connect/disconnect controls**
- **All BLE packet types logged for debugging**
- **Footer with author’s GitHub**

---

## Setup & Installation

1. **Requirements:**
   - Node.js 16+
   - A supported BLE device (e.g., Bitchat Android app in peripheral/server mode)
   - Chrome/Edge (desktop or Android; iOS/Safari not supported)

2. **Clone the project:**
   ```sh
   git clone <repo-url>
   cd bitchat-web/bitchat-web-ble
   ```

3. **Install dependencies:**
   ```sh
   npm install
   ```

4. **Start the server:**
   ```sh
   node server.js
   ```
   - The server runs on both HTTP (3000) and HTTPS (3443). **Use HTTPS for BLE!**
   - On first run, a self-signed HTTPS certificate is generated automatically.

5. **Open the app:**
   - Go to `https://<your-ip>:3443` in your browser (see console for IP).

---

## Usage
- **Set your nickname** (random by default, not related to GitHub)
- **Choose your language** (top right)
- **Connect to a supported BLE device** (such as Bitchat Android)
- **Send and receive messages** (messages only appear when echoed back from the device)
- **Disconnect and reconnect easily**
- **Check BLE packet logs in the browser console for debugging**

---

## Supported Platforms
- **Browsers:** Chrome, Edge (desktop & Android)
- **Not supported:** iOS/Safari (Web Bluetooth not available)
- **Devices:** Any BLE peripheral/server (not limited to Android)

---

## UI/UX Highlights
- **Fullscreen, scroll-free layout**
- **Bootstrap 5 + custom chat design**
- **Status bar with colored indicator**
- **Modern connect/disconnect controls**
- **Footer with GitHub link**

---

## Author

[![recai.furkan](https://img.shields.io/badge/GitHub-recai.furkan-181717?style=flat&logo=github)](https://github.com/recai.furkan)

---

> Default chat nickname is random (e.g., `web-xxxxxx`). It is not related to the author's GitHub username. 