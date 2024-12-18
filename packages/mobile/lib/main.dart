import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:peerdart/peerdart.dart';

const fileChunkSize = 64 * 1024;
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
        print("[DEBUG] dart peerjs: $data");
      });
      conn.on("binary").listen((data) async {
        String str = String.fromCharCodes(data);
        Map<String, dynamic> json = jsonDecode(jsonDecode(str));
        int fileId = json['fileId'];
        String type = json['type'];
        int index = json['index'];
        print(index);

        // int fileSize = file.lengthSync();

        if (type == 'request-file-chunk') {
          // int start = fileChunkSize * index;
          // int end = fileChunkSize * (index + 1);

          // if (end > fileSize) {
          //   end = fileSize;
          // }

          // final chunk = await file.openRead(start, end).first;
          // final chunk = fullFile.sublist(start, end);
          // Uint8List bytes = Uint8List.fromList(chunk);
          String fileType = getMimeTypeFromExtension(file.path) ?? 'unknown';

          for (int i = index; i <= index + batchFileCount - 1; i++) {
            sendChunk(
                fullFile, i, fileId, fileType, file.path.split('/').last);
          }

          // sendMessage(jsonEncode({
          //   "fileId": fileId,
          //   "fileName": file.path.split('/').last,
          //   "fileSize": file.lengthSync(),
          //   "chunk": bytes,
          //   "index": index,
          //   "type": fileType,
          // }));
        }
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

  void sendMessage(String content) async {
    while ((conn.dataChannel?.bufferedAmount ?? 0) > 128 * 1024) {
      await Future.delayed(const Duration(milliseconds: 10));
    }

    Uint8List uint8List = Uint8List.fromList(utf8.encode(content));

    conn.sendBinary(uint8List);
  }

  ///
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

  void sendFileFromAlbum() async {
    // 从相册选择文件
    final picker = ImagePicker();
    final XFile? media = await picker.pickMedia();

    if (media == null) {
      print("No image selected.");
      return;
    }

    final File file = File(media.path);

    int fileId = file.hashCode;
    int fileSize = file.lengthSync();
    String fileName = file.path.split('/').last;
    String fileType = getMimeTypeFromExtension(file.path) ?? 'unknown';

    // 发送开始信号
    sendMessage(jsonEncode({
      "fileId": fileId,
      "fileName": fileName,
      "fileSize": fileSize,
      "flag": 'start',
      "type": fileType,
    }));

    const minChunkSize = 16 * 1024; // 16KB
    const maxChunkSize = 64 * 1024; // 256KB
    int currentChunkSize = minChunkSize;

    final allChunk = await file.readAsBytes();
    int offset = 0;
    int index = 0;
    while (offset < fileSize) {
      await Future.delayed(const Duration(milliseconds: 10));

      print(
          "Sending chunk $index ($offset/$fileSize) (current bufferedAmount: ${conn.dataChannel?.bufferedAmount ?? 0})");
      // 如果缓冲区数据大于 128KB，等待缓冲区数据清空
      while ((conn.dataChannel?.bufferedAmount ?? 0) > 128 * 1024) {
        await Future.delayed(const Duration(milliseconds: 10));
      }

      // final remaining = fileSize - offset;
      // final chunkSize =
      // remaining < currentChunkSize ? remaining : currentChunkSize;

      // final chunk = await file.openRead(offset, offset + chunkSize).first;
      final end = ((offset + currentChunkSize) > fileSize)
          ? fileSize
          : offset + currentChunkSize;
      final chunk = allChunk.sublist(offset, end);
      Uint8List bytes = Uint8List.fromList(chunk);
      sendMessage(jsonEncode({
        "fileId": fileId,
        "fileName": fileName,
        "chunk": bytes,
        "flag": 'chunk',
        "index": index,
        "type": fileType,
      }));
      print("current bufferedAmount: ${conn.dataChannel?.bufferedAmount ?? 0}");
      index += 1;

      // 根据缓冲区数据量调整下一次发送的块大小
      if ((conn.dataChannel?.bufferedAmount ?? 0) < 16 * 1024) {
        currentChunkSize =
            (currentChunkSize * 2).clamp(minChunkSize, maxChunkSize);
      } else if ((conn.dataChannel?.bufferedAmount ?? 0) > 64 * 1024) {
        currentChunkSize =
            (currentChunkSize ~/ 2).clamp(minChunkSize, maxChunkSize);
      }

      offset = end;
      // offset += currentChunkSize;
    }

    // 发送结束标志
    sendMessage(jsonEncode({
      "fileId": fileId,
      "fileName": fileName,
      "fileSize": fileSize,
      "flag": 'end',
      "type": fileType,
    }));
  }

  /// 从相册选择文件并开始发送，问答模式
  void sendFileFromAlbumByQA() async {
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
    int fileSize = file.lengthSync();
    String fileName = file.path.split('/').last;
    String fileType = getMimeTypeFromExtension(file.path) ?? 'unknown';

    // 发送开始信号
    // sendMessage(jsonEncode({
    //   "fileId": fileId,
    //   "fileName": fileName,
    //   "fileSize": fileSize,
    //   "flag": 'start',
    //   "type": fileType,
    // }));

    // 一次性发送5个文件块
    for (int i = 1; i <= batchFileCount; i++) {
      sendChunk(fullFile, i, fileId, fileType, fileName);
    }

    // fullFile = file.readAsBytesSync();
    // int end = fileChunkSize < fileSize ? fileChunkSize : fileSize;
    // final chunk = fullFile.sublist(0, end);
    // int index = 0;

    // Uint8List bytes = Uint8List.fromList(chunk);
    // sendMessage(jsonEncode({
    //   "fileId": fileId,
    //   "fileName": fileName,
    //   "fileSize": fileSize,
    //   "chunk": bytes,
    //   "index": index,
    //   "type": fileType,
    // }));

    // 发送结束标志
    // sendMessage(jsonEncode({
    //   "fileId": fileId,
    //   "fileName": fileName,
    //   "fileSize": fileSize,
    //   "flag": 'end',
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
    sendMessage(jsonEncode({
      "fileId": fileId,
      "fileName": fileName,
      "fileSize": fileSize,
      "chunk": bytes,
      "index": index,
      "type": fileType,
    }));
  }

  void closeConnection() {
    peer.dispose();
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(title: Text('WebRTC')),
        body: Text('Hello World'),
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
                  onPressed: sendFileFromAlbumByQA,
                  label: const Text('发送图片'),
                  icon: const Icon(Icons.album_sharp),
                ),
              ],
            )
          ],
        ));
  }
}
