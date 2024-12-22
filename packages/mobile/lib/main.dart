import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:FileTransfer/barcode_scanner_listview.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:peerdart/peerdart.dart';
import 'package:photo_manager/photo_manager.dart';

class AlbumMediaListEntry {
  final String id;
  final String title;
  final int width;
  final int height;
  final String thumb;
  final int createDateSecond;

  AlbumMediaListEntry(
      {required this.id,
      required this.title,
      required this.width,
      required this.height,
      required this.thumb,
      required this.createDateSecond});

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'width': width,
      'height': height,
      'thumb': thumb,
      'createDateSecond': createDateSecond,
    };
  }
}

class AlbumListEntry {
  final String id;
  final String name;
  final int count;
  final List<AlbumMediaListEntry> children;

  AlbumListEntry({
    required this.id,
    required this.name,
    required this.count,
    required this.children,
  });

  // tojson
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'count': count,
      'children': children.map((e) => e.toJson()).toList(),
    };
  }
}

const fileChunkSize = 16300;
// const fileChunkSize = 64 * 1024;
const batchFileCount = 50;

void main() {
  runApp(const MaterialApp(
    home: HomePage(),
  ));
}

class HomePage extends StatefulWidget {
  const HomePage({Key? key}) : super(key: key);

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  late Peer peer;
  String? peerId;
  late DataConnection conn;
  bool connected = false;
  // final File file = File(media.path);
  late File file;
  late Uint8List fullFile;

  @override
  void dispose() {
    peer.dispose();
    super.dispose();
  }

  void connect(String peerId) {
    peer = Peer(
        options: PeerOptions(
            debug: LogLevel.All,
            host: '116.62.176.240',
            port: 80,
            secure: false,
            path: '/myapp'));
    final connection = peer.connect(
      peerId,
      // options: PeerConnectOption(serialization: SerializationType.Binary)
    );
    conn = connection;

    conn.on("open").listen((event) {
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
        print("[DEBUG] dart peerjs: $data");
      });
      conn.on("binary").listen((data) async {
        String str = String.fromCharCodes(data);
        Map<String, dynamic> json = jsonDecode(str);
        String type = json['type'];

        if (type == 'request-file-chunk') {
          int fileId = json['fileId'];
          int index = json['index'];

          // String fileType = getMimeTypeFromExtension(file.path) ?? 'unknown';
          print("接收到请求 $index");
          handleChunk(fullFile, index, fileId);
        } else if (type == 'AlbumList') {
          List<AlbumListEntry> albumList = await getAlbumList();

          sendMessage(jsonEncode({
            "type": "AlbumList",
            "data": albumList,
          }));
        } else if (type == 'MediaThumb') {
          String id = json['id'];
          // sendMediaThumb(id);
        }
      });
    });
  }

  void sendAlbumList() async {
    List<AlbumListEntry> albumList = await getAlbumList();
    sendMessage(jsonEncode({
      "type": "AlbumList",
      "data": albumList,
    }));
  }

  Future<List<AlbumListEntry>> getAlbumList() async {
    final PermissionState ps = await PhotoManager
        .requestPermissionExtend(); // the method can use optional param `permission`.
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
          return AlbumMediaListEntry(
            id: entity.id,
            title: entity.title!,
            width: entity.width,
            height: entity.height,
            createDateSecond: entity.createDateSecond!,
            thumb: '',
          );
        });

        return AlbumListEntry(
          id: path.id,
          name: path.name,
          count: count,
          children: resultList.toList(),
        );
      });

      final resultList = await Future.wait(resultListTask);

      return resultList.toList();
    } else {
      // Limited(iOS) or Rejected, use `==` for more precise judgements.
      // You can call `PhotoManager.openSetting()` to open settings for further steps.
      return [];
    }
  }

  void sendBinary() {
    Object content = {
      'hello': 'world',
    };
    String str = jsonEncode(content);
    Uint8List uint8List = Uint8List.fromList(utf8.encode(str));

    conn.sendBinary(uint8List);
  }

  void sendMessage(String content) async {
    while ((conn.dataChannel?.bufferedAmount ?? 0) > 128 * 1024) {
      await Future.delayed(const Duration(milliseconds: 10));
    }

    Uint8List uint8List = Uint8List.fromList(utf8.encode(content));

    conn.sendBinary(uint8List);
  }

  /// 根据文件名推断文件类型
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

  /// 从相册选择文件并开始发送，问答模式
  void sendFileFromAlbum() async {
    // 从相册选择文件
    final picker = ImagePicker();
    final XFile? media = await picker.pickMedia();

    if (media == null) {
      print("No image selected.");
      return;
    }

    file = File(media.path);
    fullFile = file.readAsBytesSync();

    int fileId = file.hashCode;

    handleChunk(fullFile, 1, fileId);
  }

  void handleChunk(Uint8List file, int index, int fileId) {
    int fileSize = file.length;
    int total = (file.length / fileChunkSize).ceil();

    for (int i = index; i < index + batchFileCount; i++) {
      int start = (i - 1) * fileChunkSize;
      if (start >= fileSize) return;

      int remainSize = fileSize - start;
      if (remainSize <= 0) return;

      int offset = fileChunkSize < remainSize ? fileChunkSize : remainSize;

      final chunk = file.sublist(start, start + offset);
      print(
          "[$i]文件片：${chunk.length} 数据片: $start - ${start + offset} 总长度: $fileSize");
      Uint8List bytes = Uint8List.fromList(chunk);

      Object dataChunk = {
        "__peerData": fileId,
        "n": i,
        "data": bytes,
        "total": total,
        "type": 'video/mp4',
        "fileName": 'text.mp4',
        "fileSize": fileSize,
      };

      sendMessage(jsonEncode(dataChunk));
    }

    // sendMessage(jsonEncode({
    //   "fileId": fileId,
    //   "fileName": fileName,
    //   "fileSize": fileSize,
    //   "chunk": bytes,
    //   "index": index,
    //   "type": fileType,
    // }));
  }

  void sendChunk(
      Uint8List file, int index, int fileId, String fileType, String fileName) {
    int fileSize = file.length;

    int start = (index - 1) * fileChunkSize;
    if (start >= fileSize) return;

    int remainSize = fileSize - start;
    int offset = fileChunkSize < remainSize ? fileChunkSize : remainSize;
    final chunk = file.sublist(start, start + offset);

    Uint8List bytes = Uint8List.fromList(chunk);
    // 前面3位为文件分包的序号
    // Uint8List indexBytes = Uint8List(3);
    // indexBytes[0] = (index >> 16) & 0xff;
    // indexBytes[1] = (index >> 8) & 0xff;
    // indexBytes[2] = index & 0xff;
    // print("前三位转成字符串 ${indexBytes.toString()}");

    // bytes = Uint8List.fromList(indexBytes + bytes);
    print("发送的数据长度 ${bytes.length}");
    conn.sendBinary(bytes);
    // sendMessage(jsonEncode({
    //   "fileId": fileId,
    //   "fileName": fileName,
    //   "fileSize": fileSize,
    //   "chunk": bytes,
    //   "index": index,
    //   "type": fileType,
    // }));
  }

  void closeConnection() {
    peer.dispose();
    setState(() {
      connected = false;
    });
  }

  @override
  void initState() {
    super.initState();
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

  void scanQRCode() async {
    print("[DEBUG] scanQRCode");
    final result = await Navigator.push(
      context,
      CupertinoPageRoute(
        builder: (context) => const BarcodeScannerListView(),
      ),
    );

    if (!context.mounted) {
    } else {
      String peerId = result as String;
      connect(peerId);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('文件传输助手')),
      body: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('连接状态: ${connected ? '已连接' : '未连接'}'),
            ],
          ),
          const SizedBox(height: 18),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              TextButton.icon(
                onPressed: () {
                  scanQRCode();
                },
                label: const Text(
                  '扫码连接',
                  style: TextStyle(fontSize: 18),
                ),
                icon: const Icon(
                  Icons.qr_code,
                  size: 24,
                ),
                style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 10),
                    side: const BorderSide(
                        color: Color.fromARGB(204, 0, 0, 0), width: 1)),
              )
            ],
          )
        ],
      ),
      floatingActionButton: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          FloatingActionButton(
            onPressed: () {
              connect('receiver');
            },
            child: const Icon(Icons.connected_tv),
          ),
          SizedBox(height: 18),
          FloatingActionButton(
            onPressed: closeConnection,
            child: const Icon(Icons.close),
          ),
          SizedBox(height: 18),
          FloatingActionButton(
            onPressed: sendAlbumList,
            child: const Icon(Icons.album),
          ),
          SizedBox(height: 18),
          FloatingActionButton(
            onPressed: sendFileFromAlbum,
            child: const Icon(Icons.photo),
          ),
        ],
      ),
    );
  }
}
