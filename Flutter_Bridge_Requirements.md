# Flutter Bridge Implementation Guide

To enable native features (Camera, Downloads, Sharing) within the Agroyilt Web App (WebView), the Flutter developer must implement the following `JavaScriptHandlers` using the `flutter_inappwebview` package.

## 1. Camera Handler (`openCamera`)
Used when users need to take a photo for work completion or profile updates.

**Web Call:** `window.flutter_inappwebview.callHandler('openCamera')`

**Flutter Implementation:**
- Open native camera.
- Capture image.
- Convert image to **Base64** string.
- Return a JSON object:
```json
{
  "success": true,
  "mimeType": "image/jpeg",
  "base64": "/9j/4AAQSkZJRg...",
  "fileName": "work_photo_123.jpg"
}
```

## 2. Download Handler (`downloadFile`)
Used for downloading Soil Reports and Invoices.

**Web Call:** `window.flutter_inappwebview.callHandler('downloadFile', { url, fileName })`

**Flutter Implementation:**
- Intercept the URL.
- Use a library like `flutter_downloader` or `dio` to download the file to the device's storage.
- Show a notification to the user when the download starts/completes.

## 3. Share Handler (`share`)
Used for sharing articles and booking details.

**Web Call:** `window.flutter_inappwebview.callHandler('share', { title, text, url })`

**Flutter Implementation:**
- Use the `share_plus` package.
- Trigger the native share sheet with the provided data.

## 4. Location Handler (`getLocation`)
Used for verifying arrival and tracking.

**Web Call:** `window.flutter_inappwebview.callHandler('getLocation')`

**Flutter Implementation:**
- Request location permissions.
- Get high-accuracy coordinates.
- Return JSON:
```json
{
  "success": true,
  "latitude": 23.1234,
  "longitude": 75.5678
}
```

## 5. Haptic Handler (`haptic`)
Used for UI feedback.

**Web Call:** `window.flutter_inappwebview.callHandler('haptic', { type: 'medium' })`

**Flutter Implementation:**
- Use `services.dart` (`HapticFeedback`).
- Map types: `light`, `medium`, `heavy`, `success`, `error`.

---
**Note:** The Web App code in `flutterBridge.js` is already prepared to call these handlers. Once implemented in Flutter, these features will start working immediately.
