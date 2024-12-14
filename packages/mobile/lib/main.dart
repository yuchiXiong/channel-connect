import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:FileTransfer/barcode_scanner_listview.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:photo_manager/photo_manager.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:dsbridge_flutter/dsbridge_flutter.dart';
import 'package:peerdart/peerdart.dart';
// class JsApi extends JavaScriptNamespaceInterface {
//   @override
//   void register() {
//     registerFunction(getAlbumList, functionName: 'getAlbumList');
//     registerFunction(getPhotoThumb, functionName: 'getPhotoThumb');
//     registerFunction(getPhotoOrigin, functionName: 'getPhotoOrigin');
//   }

//   void getAlbumList(dynamic msg, CompletionHandler handler) async {
//     print("[DSBridge] getAlbumList");
//     final PermissionState ps = await PhotoManager
//         .requestPermissionExtend(); // the method can use optional param `permission`.
//     print('PermissionState: $ps');
//     if (ps.isAuth || ps.hasAccess) {
//       // Granted
//       // You can to get assets here.

//       // Access will continue, but the amount visible depends on the user's selection.
//       final List<AssetPathEntity> list =
//           await PhotoManager.getAssetPathList(hasAll: false);

//       final resultListTask = list.map((path) async {
//         // 获取每个相册的所有照片
//         final count = await path.assetCountAsync;
//         final List<AssetEntity> entities = await path.getAssetListPaged(
//           page: 0,
//           size: count,
//         );

//         final resultList = entities.map((entity) {
//           return {
//             'id': entity.id,
//             'title': entity.title,
//             'width': entity.width,
//             'height': entity.height,
//             'createDateSecond': entity.createDateSecond,
//             'thumb': '',
//             'origin': '',
//           };
//         });

//         return {
//           'id': path.id,
//           'name': path.name,
//           "count": count,
//           "cover": base64Encode((await entities.first.thumbnailData)!),
//           "children": resultList.toList(),
//         };
//       });

//       final resultList = await Future.wait(resultListTask);

//       handler.complete(resultList.toList());
//     } else {
//       // Limited(iOS) or Rejected, use `==` for more precise judgements.
//       // You can call `PhotoManager.openSetting()` to open settings for further steps.
//     }
//   }

//   void getPhotoThumb(dynamic msg, CompletionHandler handler) async {
//     print("[DSBridge] getPhotoThumb");

//     final entity = await AssetEntity.fromId(msg['id']);

//     if (entity != null) {
//       final thumb = await entity.thumbnailData;
//       handler.complete({
//         'id': entity.id,
//         'thumb': base64Encode(thumb!),
//         "origin": "",
//         "title": "",
//         "width": 0,
//         "height": 0
//       });
//     } else {
//       handler.complete(null);
//     }
//   }

//   void getPhotoOrigin(dynamic msg, CompletionHandler handler) async {
//     print("[DSBridge] getPhotoOrigin");

//     final entity = await AssetEntity.fromId(msg['id']);

//     if (entity != null) {
//       final origin = await entity.originBytes;
//       handler.complete({
//         'id': entity.id,
//         'origin': base64Encode(origin!),
//         "thumb": "",
//         "title": "",
//         "width": 0,
//         "height": 0
//       });
//     } else {
//       handler.complete(null);
//     }
//   }
// }

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
  // String webPage = "http://10.241.40.9:5173/mobile";
  // String webPage = "http://192.168.0.109:5173/mobile";
  // String webPage = "https://www.bilibili.com/";
  // String webPage = "http://116.62.176.240:3000/mobile";

  // late JsApi _jsApi;
  // late final DWebViewController _webViewController;

  late Peer peer;
  String? peerId;
  late DataConnection conn;
  bool connected = false;

  @override
  void dispose() {
    peer.dispose();
    super.dispose();
  }

  void connect() {
    peer = Peer(
        id: 'sender',
        options: PeerOptions(
            debug: LogLevel.All,
            host: '116.62.176.240',
            port: 80,
            secure: false,
            path: '/myapp'));
    final connection = peer.connect('receiver');
    conn = connection;

    if (conn.dataChannel?.bufferedAmountLowThreshold != null) {
      conn.dataChannel!.bufferedAmountLowThreshold = 256 * 1024;
    }

    conn.on("open").listen((event) {
      print("[DEBUG] dart peerjs: connected");
      setState(() {
        connected = true;
      });

      connection.on("close").listen((event) {
        print("[DEBUG] dart peerjs: closed");

        setState(() {
          connected = false;
        });
      });

      conn.on("data").listen((data) {
        print("[DEBUG] dart peerjs: data");

        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(data)));
      });
      conn.on("binary").listen((data) {
        print("[DEBUG] dart peerjs: binary");

        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text("Got binary!")));
      });
    });
  }

  void sendBinary() {
    Object content = {
      'hello': 'world',
    };
    String str = jsonEncode(content);
    Uint8List uint8List = Uint8List.fromList(utf8.encode(str));

    conn.sendBinary(uint8List);
  }

  void sendMessage(String content) {
    Uint8List uint8List = Uint8List.fromList(utf8.encode(content));

    conn.sendBinary(uint8List);
  }

  String? getMimeTypeFromExtension(String filePath) {
    final Map<String, String> mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.json': 'application/json',
      // 添加更多扩展名和对应的 MIME 类型
    };

    String? extension = filePath.split('.').last;
    return mimeTypes['.${extension.toLowerCase()}'];
  }

  // Stream<Uint8List> createDynamicFileStream(String filePath) async* {
  //   const int minChunkSize = 4 * 1024; // 最小块大小(4kb)
  //   const int maxChunkSize = 512 * 1024; // 最大块大小(512kb)
  //   int currentChunkSize = 16 * 1024; // 初始块大小(16kb)

  //   final file = File(filePath);
  //   final fileLength = await file.length();
  //   final raf = await file.open();

  //   try {
  //     int offset = 0;

  //     while (offset < fileLength) {
  //       final remaining = fileLength - offset;
  //       final readSize =
  //           remaining < currentChunkSize ? remaining : currentChunkSize;

  //       final buffer = Uint8List(readSize);
  //       final bytesRead = await raf.readInto(buffer);

  //       if (bytesRead > 0) {
  //         yield buffer.sublist(0, bytesRead);

  //         // // 如果缓冲区空闲，动态增大块大小
  //         // if ((conn.dataChannel?.bufferedAmount ?? 0) < 4 * 1024) {
  //         //   currentChunkSize = (currentChunkSize * 2)
  //         //       .clamp(minChunkSize, maxChunkSize)
  //         //       .toInt();
  //         // }

  //         // // 动态调整块大小
  //         // while ((conn.dataChannel?.bufferedAmount ?? 0) > 256 * 1024) {
  //         //   currentChunkSize = (currentChunkSize / 2)
  //         //       .clamp(minChunkSize, maxChunkSize)
  //         //       .toInt();
  //         //   await Future.delayed(const Duration(milliseconds: 50)); // 等待缓冲区变小
  //         // }


  //       }

  //       offset += bytesRead;
  //     }
  //   } finally {
  //     await raf.close();
  //   }
  // }

  void sendFileFromAlbum() async {
    final picker = ImagePicker();
    final XFile? media = await picker.pickMedia();

    if (media == null) {
      print("No image selected.");
      return;
    }

    final File file = File(media.path);

    // 打开文件流
    final Stream<List<int>> stream = file.openRead();
    // final stream = createDynamicFileStream(media.path);

    // const int maxChunkSize = 320 * 1024; // 最大块大小
    // const int minChunkSize = 64 * 1024; // 最小块大小
    // int currentChunkSize = maxChunkSize; // 起始块大小


    sendMessage(jsonEncode({
      "fileId": file.hashCode,
      "fileName": file.path.split('/').last,
      "fileSize": file.lengthSync(),
      "flag": 'start',
      "type": getMimeTypeFromExtension(file.path),
    }));

    int index = 0;

    // // 读取流数据
    await for (List<int> chunk in stream) {
      while ((conn.dataChannel?.bufferedAmount ?? 0) > 16 * 1024) {
        await Future.delayed(const Duration(milliseconds: 50));
      }

      // 如果缓冲区满，则动态减小块大小
      // while ((conn.dataChannel?.bufferedAmount ?? 0) > 16 * 1024) {
      //   currentChunkSize =
      //       (currentChunkSize / 2).clamp(minChunkSize, maxChunkSize).toInt();
      //   await Future.delayed(const Duration(milliseconds: 50)); // 等待缓冲区变小
      // }

      // 如果缓冲区空闲，动态增大块大小
      // if ((conn.dataChannel?.bufferedAmount ?? 0) < 4 * 1024) {
      //   currentChunkSize =
      //       (currentChunkSize * 2).clamp(minChunkSize, maxChunkSize).toInt();
      // }

          //       // 如果缓冲区空闲，动态增大块大小
          // if ((conn.dataChannel?.bufferedAmount ?? 0) < 4 * 1024) {
          //   currentChunkSize = (currentChunkSize * 2)
          //       .clamp(minChunkSize, maxChunkSize)
          //       .toInt();
          // }

          // // 动态调整块大小
          // while ((conn.dataChannel?.bufferedAmount ?? 0) > 256 * 1024) {
          //   currentChunkSize = (currentChunkSize / 2)
          //       .clamp(minChunkSize, maxChunkSize)
          //       .toInt();
          //   await Future.delayed(const Duration(milliseconds: 50)); // 等待缓冲区变小
          // }

      Uint8List bytes = Uint8List.fromList(chunk);
      print("[DEBUG] Read chunk of size: ${bytes.length}");
      sendMessage(jsonEncode({
        "fileId": file.hashCode,
        "fileName": file.path.split('/').last,
        "chunk": bytes,
        "flag": 'chunk',
        "index": index,
        "type": getMimeTypeFromExtension(file.path),
      }));
      index++;
    }

    sendMessage(jsonEncode({
      "fileId": file.hashCode,
      "fileName": file.path.split('/').last,
      "fileSize": file.lengthSync(),
      "flag": 'end',
      "type": getMimeTypeFromExtension(file.path),
    }));

    print("[DEBUG] Finished reading image as stream.");
  }

  void closeConnection() {
    peer.dispose();
  }

  @override
  void initState() {
    super.initState();
    // print('initState');
    // _jsApi = JsApi();
    // _jsApi.registerFunction(scanQRCode, functionName: 'scanQRCode');
    // _webViewController = DWebViewController()
    //   ..setJavaScriptMode(JavaScriptMode.unrestricted)
    //   ..setBackgroundColor(const Color(0x00000000))
    //   ..setNavigationDelegate(
    //     NavigationDelegate(
    //       onProgress: (int progress) {
    //         // Update loading bar.
    //       },
    //       onPageStarted: (String url) {},
    //       onPageFinished: (String url) {},
    //       onHttpError: (HttpResponseError error) {},
    //       onWebResourceError: (WebResourceError error) {},
    //       onNavigationRequest: (NavigationRequest request) {
    //         if (request.url.startsWith('https://www.youtube.com/')) {
    //           return NavigationDecision.prevent;
    //         }
    //         return NavigationDecision.navigate;
    //       },
    //     ),
    //   )
    //   ..addJavaScriptObject(_jsApi)
    //   ..loadRequest(Uri.parse(webPage));

    // peer.on("open").listen((id) {
    //   setState(() {
    //     peerId = peer.id;
    //   });
    // });

    // peer.on("close").listen((id) {
    //   setState(() {
    //     connected = false;
    //   });
    // });

    // peer.on<DataConnection>("connection").listen((event) {
    //   conn = event;

    //   conn.on("data").listen((data) {
    //     ScaffoldMessenger.of(context)
    //         .showSnackBar(SnackBar(content: Text(data)));
    //   });

    //   conn.on("binary").listen((data) {
    //     ScaffoldMessenger.of(context)
    //         .showSnackBar(SnackBar(content: Text("Got binary")));
    //   });

    //   conn.on("close").listen((event) {
    //     setState(() {
    //       connected = false;
    //     });
    //   });

    //   setState(() {
    //     connected = true;
    //   });
    // });
  }

  // void scanQRCode(dynamic msg, CompletionHandler handler) async {
  //   print("[DSBridge] scanQRCode");
  //   final result = await Navigator.push(
  //     context,
  //     CupertinoPageRoute(
  //       builder: (context) => const BarcodeScannerListView(),
  //     ),
  //   );

  //   if (!context.mounted) {
  //     handler.complete('');
  //   } else {
  //     print("扫码页返回数据: ${result}");
  //     handler.complete(result);
  //   }
  // }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(title: Text('WebRTC')),
        body: Text('Hello World'),
        // WebViewWidget(
        //   controller: _webViewController,
        // ),
        floatingActionButton: Column(
          mainAxisAlignment: MainAxisAlignment.end,
          mainAxisSize: MainAxisSize.max,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                const SizedBox(width: 16),
                FloatingActionButton.extended(
                  onPressed: connect,
                  label: const Text('创建连接'),
                  icon: const Icon(Icons.connected_tv),
                ),
              ],
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                const SizedBox(width: 16),
                FloatingActionButton.extended(
                  onPressed: closeConnection,
                  label: const Text('断开连接'),
                  icon: const Icon(Icons.connected_tv),
                ),
              ],
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                const SizedBox(width: 16),
                FloatingActionButton.extended(
                  onPressed: sendBinary,
                  label: const Text('发送数据'),
                  icon: const Icon(Icons.message),
                ),
              ],
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                const SizedBox(width: 16),
                FloatingActionButton.extended(
                  onPressed: sendFileFromAlbum,
                  label: const Text('发送图片'),
                  icon: const Icon(Icons.album_sharp),
                ),
              ],
            )
          ],
        ));
  }
}
