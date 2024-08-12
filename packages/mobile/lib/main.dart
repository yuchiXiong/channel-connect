import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:photo_manager/photo_manager.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:dsbridge_flutter/dsbridge_flutter.dart';

class JsApi extends JavaScriptNamespaceInterface {
  @override
  void register() {
    registerFunction(getAlbumList, functionName: 'getAlbumList');
    registerFunction(getPhotoThumb, functionName: 'getPhotoThumb');
    registerFunction(getPhotoOrigin, functionName: 'getPhotoOrigin');
  }

  void getAlbumList(dynamic msg, CompletionHandler handler) async {
    print("[DSBridge] getAlbumList");
    final PermissionState ps = await PhotoManager
        .requestPermissionExtend(); // the method can use optional param `permission`.
    print('PermissionState: $ps');
    if (ps.isAuth || ps.hasAccess) {
      // Granted
      // You can to get assets here.

      // Access will continue, but the amount visible depends on the user's selection.
      final List<AssetPathEntity> list =
          await PhotoManager.getAssetPathList(hasAll: false);

      final resultListTask = list.map((path) async {
        // 获取每个相册的所有照片
        final count = await path.assetCountAsync;
        final List<AssetEntity> entities = await path.getAssetListPaged(
          page: 0,
          size: count,
        );

        final resultList = entities.map((entity) {
          return {
            'id': entity.id,
            'title': entity.title,
            'width': entity.width,
            'height': entity.height,
            'createDateSecond': entity.createDateSecond,
            'thumb': '',
            'origin': '',
          };
        });

        return {
          'id': path.id,
          'name': path.name,
          "count": count,
          "cover": base64Encode((await entities.first.thumbnailData)!),
          "children": resultList.toList(),
        };
      });

      final resultList = await Future.wait(resultListTask);

      handler.complete(resultList.toList());
    } else {
      // Limited(iOS) or Rejected, use `==` for more precise judgements.
      // You can call `PhotoManager.openSetting()` to open settings for further steps.
    }
  }

  void getPhotoThumb(dynamic msg, CompletionHandler handler) async {
    print("[DSBridge] getPhotoThumb");

    final entity = await AssetEntity.fromId(msg['id']);

    if (entity != null) {
      final thumb = await entity.thumbnailData;
      handler.complete({
        'id': entity.id,
        'thumb': base64Encode(thumb!),
        "origin": "",
        "title": "",
        "width": 0,
        "height": 0
      });
    } else {
      handler.complete(null);
    }
  }

  void getPhotoOrigin(dynamic msg, CompletionHandler handler) async {
    print("[DSBridge] getPhotoOrigin");

    final entity = await AssetEntity.fromId(msg['id']);

    if (entity != null) {
      final origin = await entity.originBytes;
      handler.complete({
        'id': entity.id,
        'origin': base64Encode(origin!),
        "thumb": "",
        "title": "",
        "width": 0,
        "height": 0
      });
    } else {
      handler.complete(null);
    }
  }
}

void main() {
  runApp(const MaterialApp(
    home: WebViewApp(),
  ));
}

class WebViewApp extends StatefulWidget {
  const WebViewApp({Key? key}) : super(key: key);

  @override
  State<WebViewApp> createState() => _WebViewAppState();
}

class _WebViewAppState extends State<WebViewApp> {
  late final _webViewController = DWebViewController()
    ..setJavaScriptMode(JavaScriptMode.unrestricted)
    ..setBackgroundColor(const Color(0x00000000))
    ..setNavigationDelegate(
      NavigationDelegate(
        onProgress: (int progress) {
          // Update loading bar.
        },
        onPageStarted: (String url) {},
        onPageFinished: (String url) {},
        onHttpError: (HttpResponseError error) {},
        onWebResourceError: (WebResourceError error) {},
        onNavigationRequest: (NavigationRequest request) {
          if (request.url.startsWith('https://www.youtube.com/')) {
            return NavigationDecision.prevent;
          }
          return NavigationDecision.navigate;
        },
      ),
    )
    ..addJavaScriptObject(JsApi())
    ..loadRequest(Uri.parse('http://192.168.0.105:5173/mobile'));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          title: Text(DateTime.now().toUtc().toString()),
        ),
        body: WebViewWidget(
          controller: _webViewController,
        ));
  }
}
