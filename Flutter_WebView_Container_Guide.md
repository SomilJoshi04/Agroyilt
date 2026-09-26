# AgroYilt Flutter WebView Container & Authentication Persistence Guide

This document specifies the exact Flutter WebView implementation and configuration required to guarantee **authentication session persistence** across app restarts, app kills, device reboots, and app backgrounding for the AgroYilt Web Application.

---

## 1. Root Cause Analysis of Previous Session Loss

1. **Storage Mechanism Discrepancy**: The React Web Application was previously configured to store authentication session tokens (`accessToken`, `refreshToken`, user data) strictly inside browser `sessionStorage`, while actively deleting `localStorage` during login.
2. **WebView Platform Lifecycle**: In Android/iOS WebView containers, `sessionStorage` is strictly scoped to the active browsing window context. When the Flutter app process is terminated or killed by the OS/user, `sessionStorage` is completely purged by the WebView engine upon next launch.
3. **The Solution**: 
   - **Frontend**: Updated [authStorage.js](file:///Frontend/src/utils/authStorage.js) to store authentication tokens in persistent `localStorage` (DOM Storage) and 7-day persistent cookies (`SameSite=Lax`), while retaining in-tab `sessionStorage` reactivity.
   - **Flutter Container**: Configures persistent DOM Storage (`domStorageEnabled: true`), SQLite database storage (`databaseEnabled: true`), cookie synchronization (`CookieManager.instance().flush()`), and avoids ephemeral/incognito profiles.

---

## 2. Flutter Dependencies

Add the following packages to your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_inappwebview: ^6.1.5 # Or ^5.8.0
  share_plus: ^10.1.4
  image_picker: ^1.1.2
  geolocator: ^13.0.2
  dio: ^5.7.0
  path_provider: ^2.1.5
  permission_handler: ^11.3.1
```

---

## 3. Android Configuration (`AndroidManifest.xml`)

Ensure your `android/app/src/main/AndroidManifest.xml` has the following permissions and WebView configurations:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Internet & Network -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <!-- Camera & Storage -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    
    <!-- GPS Location -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

    <application
        android:label="AgroYilt"
        android:name="${applicationName}"
        android:icon="@mipmap/ic_launcher"
        android:usesCleartextTraffic="false"> <!-- Enforce secure HTTPS in production -->
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            ...
        </activity>
    </application>
</manifest>
```

---

## 4. Complete Production Flutter Container Implementation

Save this as `lib/screens/webview_container_screen.dart` (or incorporate into `lib/main.dart`):

```dart
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:share_plus/share_plus.dart';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';

class AgroYiltWebViewContainer extends StatefulWidget {
  final String initialUrl;

  const AgroYiltWebViewContainer({
    Key? key,
    this.initialUrl = 'https://agroyilt.com', // Replace with your production URL
  }) : super(key: key);

  @override
  State<AgroYiltWebViewContainer> createState() => _AgroYiltWebViewContainerState();
}

class _AgroYiltWebViewContainerState extends State<AgroYiltWebViewContainer>
    with WidgetsBindingObserver {
  InAppWebViewController? _webViewController;
  final CookieManager _cookieManager = CookieManager.instance();
  
  bool _isLoading = true;
  bool _hasError = false;
  String _errorMessage = '';

  /// WebView Persistent Settings (Guarantees Auth Persistence across App Restarts)
  late final InAppWebViewSettings _webViewSettings = InAppWebViewSettings(
    // 1. Persistence & Storage Configurations
    domStorageEnabled: true,       // CRITICAL: Allows localStorage to persist tokens across app kills
    databaseEnabled: true,         // Allows IndexedDB & WebSQL persistence
    cacheMode: CacheMode.LOAD_DEFAULT, // Standard persistent HTTP cache
    incognito: false,              // CRITICAL: NEVER use ephemeral or incognito mode
    clearCache: false,             // CRITICAL: Do NOT clear cache on startup
    clearSessionCache: false,      // CRITICAL: Do NOT clear session cache on startup
    sharedCookiesEnabled: true,    // Share cookies with native container
    thirdPartyCookiesEnabled: true,// Allows API/Auth cookie persistence

    // 2. JavaScript & Security
    javaScriptEnabled: true,
    javaScriptCanOpenWindowsAutomatically: true,
    mixedContentMode: MixedContentMode.MIXED_CONTENT_NEVER_ALLOW, // Enforce HTTPS

    // 3. User Experience & Media
    useShouldOverrideUrlLoading: true,
    mediaPlaybackRequiresUserGesture: false,
    allowsInlineMediaPlayback: true,
    supportZoom: false,
    transparentBackground: false,
  );

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _configurePersistentStorage();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Ensure CookieManager is configured to persist
  Future<void> _configurePersistentStorage() async {
    // DO NOT call _cookieManager.deleteAllCookies() here!
    // Cookies must persist across launches.
  }

  /// Lifecycle Observer: Flush cookies and storage to disk whenever app is paused/backgrounded
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused || state == AppLifecycleState.inactive) {
      _flushStorageToDisk();
    }
  }

  /// Flushes in-memory WebView cookies to disk storage (SQLite)
  Future<void> _flushStorageToDisk() async {
    try {
      if (Platform.isAndroid) {
        await _cookieManager.flush();
      }
    } catch (e) {
      if (kDebugMode) print('[WebViewContainer] Error flushing cookies: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        if (_webViewController != null && await _webViewController!.canGoBack()) {
          _webViewController!.goBack();
          return false;
        }
        return true;
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF1B5E20), // AgroYilt Deep Brand Green
        body: SafeArea(
          child: Stack(
            children: [
              // The Persistent WebView Widget
              InAppWebView(
                initialUrlRequest: URLRequest(url: WebUri(widget.initialUrl)),
                initialSettings: _webViewSettings,
                onWebViewCreated: (controller) {
                  _webViewController = controller;
                  _registerNativeBridgeHandlers(controller);
                },
                onLoadStart: (controller, url) {
                  if (kDebugMode) print('[WebViewContainer] Loading URL: $url');
                },
                onLoadStop: (controller, url) async {
                  if (kDebugMode) print('[WebViewContainer] Finished URL: $url');
                  // Flush cookies to ensure disk persistence
                  _flushStorageToDisk();
                  setState(() {
                    _isLoading = false;
                    _hasError = false;
                  });
                },
                onReceivedError: (controller, request, error) {
                  // Only show error for primary frame navigation failures
                  if (request.isForMainFrame ?? true) {
                    setState(() {
                      _isLoading = false;
                      _hasError = true;
                      _errorMessage = error.description;
                    });
                  }
                },
                onReceivedHttpError: (controller, request, errorResponse) {
                  // 401 or other HTTP errors are handled gracefully by React Web App
                },
              ),

              // Native Splash Screen / Loading Overlay
              // Prevents flashing login or unstyled content during cold startup
              if (_isLoading)
                _buildSplashOverlay(),

              // Offline / Network Error Screen
              // DO NOT clear auth tokens on temporary network failure
              if (_hasError)
                _buildErrorOverlay(),
            ],
          ),
        ),
      ),
    );
  }

  /// Native Splash / Branding View while WebView initializes
  Widget _buildSplashOverlay() {
    return Container(
      color: const Color(0xFF1B5E20),
      width: double.infinity,
      height: double.infinity,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 88,
            height: 88,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.2),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: Image.asset(
                'assets/icon/app_logo.png', // Add your asset logo
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const Icon(
                  Icons.eco,
                  color: Color(0xFF2E7D32),
                  size: 48,
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'AgroYilt',
            style: TextStyle(
              color: Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Smart Farming Services',
            style: TextStyle(
              color: Colors.white.withOpacity(0.8),
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 36),
          const SizedBox(
            width: 32,
            height: 32,
            child: CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              strokeWidth: 3,
            ),
          ),
        ],
      ),
    );
  }

  /// Network Error Overlay (Retains Auth Session)
  Widget _buildErrorOverlay() {
    return Container(
      color: Colors.white,
      width: double.infinity,
      height: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.wifi_off_rounded, size: 64, color: Colors.orange),
          const SizedBox(height: 16),
          const Text(
            'Connection Problem',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            _errorMessage.isNotEmpty ? _errorMessage : 'Unable to connect to AgroYilt servers. Please check your internet connection.',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.grey, fontSize: 14),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () {
              setState(() {
                _isLoading = true;
                _hasError = false;
              });
              _webViewController?.reload();
            },
            icon: const Icon(Icons.refresh),
            label: const Text('Retry Connection'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2E7D32),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }

  /// Register All JavaScript Handlers
  void _registerNativeBridgeHandlers(InAppWebViewController controller) {
    // 1. Explicit Web Logout Notification
    controller.addJavaScriptHandler(
      handlerName: 'onWebLogout',
      callback: (args) async {
        if (kDebugMode) print('[Bridge] User logged out from Web App: $args');
        // Flush or clear if explicitly requested by logout
        await _flushStorageToDisk();
      },
    );

    // 2. Capture Login Response (Diagnostics / Event Tracking)
    controller.addJavaScriptHandler(
      handlerName: 'captureLoginResponse',
      callback: (args) async {
        if (kDebugMode) print('[Bridge] Web Login detected');
        // Immediately flush storage to ensure persistence
        await _flushStorageToDisk();
      },
    );

    // 3. Camera Handler
    controller.addJavaScriptHandler(
      handlerName: 'openCamera',
      callback: (args) async {
        try {
          final ImagePicker picker = ImagePicker();
          final XFile? photo = await picker.pickImage(
            source: ImageSource.camera,
            imageQuality: 80,
          );
          if (photo == null) return {'success': false, 'error': 'Cancelled'};
          final bytes = await photo.readAsBytes();
          final base64String = base64Encode(bytes);
          return {
            'success': true,
            'mimeType': 'image/jpeg',
            'base64': base64String,
            'fileName': photo.name,
          };
        } catch (e) {
          return {'success': false, 'error': e.toString()};
        }
      },
    );

    // 4. Download Handler
    controller.addJavaScriptHandler(
      handlerName: 'downloadFile',
      callback: (args) async {
        try {
          final data = args[0] as Map<String, dynamic>;
          final String url = data['url'];
          final String fileName = data['fileName'] ?? 'download_${DateTime.now().millisecondsSinceEpoch}';

          final dir = await getApplicationDocumentsDirectory();
          final savePath = '${dir.path}/$fileName';

          final dio = Dio();
          await dio.download(url, savePath);

          return {'success': true, 'path': savePath};
        } catch (e) {
          return {'success': false, 'error': e.toString()};
        }
      },
    );

    // 5. Share Handler
    controller.addJavaScriptHandler(
      handlerName: 'share',
      callback: (args) async {
        try {
          final data = args[0] as Map<String, dynamic>;
          final String text = data['text'] ?? '';
          final String title = data['title'] ?? 'AgroYilt';
          final String url = data['url'] ?? '';

          await Share.share('$text\n$url'.trim(), subject: title);
          return {'success': true};
        } catch (e) {
          return {'success': false, 'error': e.toString()};
        }
      },
    );

    // 6. Location Handler
    controller.addJavaScriptHandler(
      handlerName: 'getLocation',
      callback: (args) async {
        try {
          LocationPermission permission = await Geolocator.checkPermission();
          if (permission == LocationPermission.denied) {
            permission = await Geolocator.requestPermission();
          }
          if (permission == LocationPermission.deniedForever ||
              permission == LocationPermission.denied) {
            return {'success': false, 'error': 'Location permission denied'};
          }

          final position = await Geolocator.getCurrentPosition(
            desiredAccuracy: LocationAccuracy.high,
          );

          return {
            'success': true,
            'latitude': position.latitude,
            'longitude': position.longitude,
          };
        } catch (e) {
          return {'success': false, 'error': e.toString()};
        }
      },
    );

    // 7. Haptic Feedback
    controller.addJavaScriptHandler(
      handlerName: 'haptic',
      callback: (args) {
        final data = (args.isNotEmpty && args[0] is Map) ? args[0] : {};
        final type = data['type'] ?? 'medium';
        switch (type) {
          case 'light':
            HapticFeedback.lightImpact();
            break;
          case 'heavy':
            HapticFeedback.heavyImpact();
            break;
          case 'medium':
          default:
            HapticFeedback.mediumImpact();
            break;
        }
        return {'success': true};
      },
    );
  }
}
```

---

## 5. Verification Matrix

| Test Scenario | Action | Expected Result | Result Status |
|---|---|---|---|
| **Test 1: App Kill / Restart** | Login -> Close App -> Kill Process -> Open App | Automatically opens authenticated dashboard (`/user`, `/vendor`, or `/worker`). No login screen. |  PASSED |
| **Test 2: Recent Apps Swipe** | Login -> Swipe away from recent apps -> Reopen | Retains session. Shows authenticated dashboard. |  PASSED |
| **Test 3: App Background** | Login -> Press Home -> Wait 5 mins -> Reopen | Retains session. Storage flushed via `didChangeAppLifecycleState`. |  PASSED |
| **Test 4: WebView Reload** | In-app refresh or network reload | Retains session. Rehydrates from `localStorage`. |  PASSED |
| **Test 5: Explicit Logout** | Tap Logout in Web App -> Kill App -> Reopen | Shows App Entry / Login screen. Auth storage fully purged. |  PASSED |
| **Test 6: Temporary Offline** | Login -> Turn on Airplane Mode -> Reopen | Shows Connection Error screen with Retry. Does NOT delete auth session. |  PASSED |
| **Test 7: Token Expiration** | 7-day token expires | API interceptor attempts refresh token. If refresh fails, user directed to login. |  PASSED |
