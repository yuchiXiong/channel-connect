import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:peerdart/peerdart.dart';

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

    // 打开文件流
    final Stream<List<int>> stream = file.openRead();

    // 发送开始信号
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

    // 发送结束标志
    sendMessage(jsonEncode({
      "fileId": file.hashCode,
      "fileName": file.path.split('/').last,
      "fileSize": file.lengthSync(),
      "flag": 'end',
      "type": getMimeTypeFromExtension(file.path),
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
