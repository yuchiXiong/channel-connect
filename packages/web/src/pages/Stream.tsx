import Peer, { DataConnection } from 'peerjs';
import { useLocation } from 'react-router-dom'
import { useRef, useState } from 'react';
import { Box, Progress } from '@radix-ui/themes';
import { stats } from '../utils/rtc';
import { chooseFile } from '../utils/chooseFile';

const batchFileCount = 50;

const StreamPage = () => {

  let preTimeStamp = 0;
  let preSecondBytesReceived = 0;
  const location = useLocation();

  const [bytesReceived, setBytesReceived] = useState(0);
  const fileInfoRef = useRef<{
    fileId: string,
    fileName: string,
    fileSize: number,
    current: number,
    type: string
  }>({
    fileId: '',
    fileName: '',
    fileSize: 0,
    current: 0,
    type: ''
  });
  const fileRef = useRef<Record<string, Uint8Array>>({});

  const usp = new URLSearchParams(location.search);

  const RTCStatslistener = (statsReport: RTCStatsReport, conn: DataConnection) => {
    statsReport.forEach((report) => {
      if (report.type === 'data-channel' && report.dataChannelIdentifier === conn.dataChannel.id) {
        console.log('getStats', report);
        const currentStats = {
          bytesSent: report.bytesSent || 0,
          bytesReceived: report.bytesReceived || 0,
          messagesSent: report.messagesSent || 0,
          messagesReceived: report.messagesReceived || 0,
          timestamp: report.timestamp || 0,
        }
        const timeDiff = (currentStats.timestamp - preTimeStamp) / 1000; // 转为秒
        const currentBytesReceived = currentStats.bytesReceived;
        const bytesReceivedDiff = currentBytesReceived - preSecondBytesReceived;

        const receiveSpeed = Number(((bytesReceivedDiff / timeDiff) / 1024 / 1024).toFixed(2)); // MB/s
        fileInfoRef.current.current = currentBytesReceived;
        setBytesReceived(receiveSpeed)
        preSecondBytesReceived = currentBytesReceived;
        preTimeStamp = currentStats.timestamp;
      }
    });
  }

  const handleSend = async () => {
    const files = await chooseFile();

    const file = files[0];


    // 创建 webRTC 连接
    const peer = new Peer('senderweb', {
      host: "116.62.176.240",
      port: 80,
      path: "/myapp",
    })
    peer.on("open", async (id) => {
      console.log("My peer ID is: " + id);

      const conn = peer.connect('receiver', {
        // serialization: SerializationType.None
      });

      const fileId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const fileName = file.name;
      const fileSize = file.size;

      const buffer = await file.arrayBuffer();
      console.log('buffer', buffer.byteLength);
      await new Promise((resolve) =>
        setTimeout(resolve, 1000)
      );

      // 发送文件信息
      conn.send({
        type: 'test-video-by-web-peer.js-info',
        fileId,
        fileName,
        fileSize
      })

      await new Promise((resolve) =>
        setTimeout(resolve, 1000)
      );
      conn.send({
        type: 'test-video-by-web-peer.js-data',
        fileId,
        fileName,
        fileSize,
        file: buffer,
      });

      // const stream = file.stream();
      // const reader = stream.getReader();

      // const readChunk = async (index: number) => {
      //   const { done, value } = await reader.read(); // 读取下一块数据
      //   if (done) {
      //     conn.send({ fileId, fileName, fileSize, flag: 'end', type: file.type });
      //     return;
      //   }

      //   conn.send({ fileId, fileName, chunk: value, type: file.type, flag: 'chunk', index });

      //   await new Promise((resolve) =>
      //     setTimeout(resolve, 1000)
      //   );

      //   readChunk(index + 1); // 递归读取下一块数据
      // }

      // conn.send({ fileId, fileName, fileSize, flag: 'start', type: file.type });

      // await new Promise((resolve) =>
      //   setTimeout(resolve, 1000)
      // );

      // readChunk(0);
    });

  }


  const handleReady = async () => {
    const peer = new Peer('receiver', {
      host: "116.62.176.240",
      port: 80,
      path: "/myapp",
    })
    peer.on("open", (id) => {
      console.log("My peer ID is: " + id);

      peer.on("connection", (conn) => {
        console.log("Connected to peer:", conn.peer);

        conn.on("data", (data) => {
          console.log('Received data:', data, typeof data);
          const _data = data as {
            __peerData: string;
            n: number;
            total: number;
            data: Uint8Array;

            type: string;
            fileSize: number;
            fileName: string;
          }

          if (('type' in data) && (data.type || '').startsWith('test-video-by-web-peer.js')) {
            const _data = data as {
              type: string;
              fileId: string;
              fileName: string;
              fileSize: number;
              file: ArrayBuffer;
            }
            if (data.type.endsWith('info')) {
              stats.startListenRTCStats(conn, RTCStatslistener);
              fileInfoRef.current = {
                fileId: _data.fileId,
                fileName: _data.fileName,
                fileSize: _data.fileSize,
                current: 0,
                type: 'video/mp4'
              }
            } else {
              fileRef.current = {};
              const fileByUint8Array = new Uint8Array(_data.file);
              fileRef.current[0] = fileByUint8Array;

              fileInfoRef.current = {
                fileId: _data.fileId,
                fileName: _data.fileName,
                fileSize: _data.fileSize,
                current: fileByUint8Array.byteLength,
                type: _data.type
              }

              setTimeout(() => {
                stats.stopListenRTCStats();
              }, 1001)
              return;
            }

          }

          if (_data.n === 1) {
            fileRef.current = {};
            fileRef.current[_data.n] = _data.data;

            fileInfoRef.current = {
              fileId: _data.__peerData,
              fileName: _data.fileName,
              fileSize: _data.fileSize,
              current: new Uint8Array(_data.data).byteLength,
              type: _data.type
            }

            stats.stopListenRTCStats();
            stats.startListenRTCStats(conn, RTCStatslistener);
          } else {
            fileRef.current[_data.n] = _data.data;
            fileInfoRef.current.current += new Uint8Array(_data.data).byteLength;
            // 最后一个文件块
            if (_data.n >= _data.total) {
              setTimeout(() => {
                stats.stopListenRTCStats();
              }, 1001);
              return;
            }
            // 每「batchFileCount」个文件块请求（应答）一次
            if (_data.n % batchFileCount === 0) {
              console.log('request-file-chunk', _data.__peerData, _data.n + 1);
              conn.send({
                type: 'request-file-chunk',
                fileId: _data.__peerData,
                index: _data.n + 1
              });
            }
          }
        })
      })

      peer.on('close', () => {
        console.log('close')
      })
    })
  }

  // const currentSize = Object.values(fileRef.current).map(i => new Uint8Array(i)).reduce((pre, cur) => pre + cur.byteLength, 0);
  const currentSize = fileInfoRef.current.current;
  const currentProgress = ((currentSize / fileInfoRef.current.fileSize || 0) * 100).toFixed(0);


  console.log(bytesReceived)
  return (
    <section className='flex flex-col items-center justify-center h-full backdrop-blur-[100px] backdrop-saturate-[240%]'>

      {usp.get('id')}

      <button className='px-4 py-2 my-2 border border-red-800 border-dashed' onClick={handleSend}>我要发送</button>
      <button className='px-4 py-2 my-2 border border-red-800 border-dashed' onClick={handleReady}>我要接收</button>

      {currentProgress === '100' && <video src={URL.createObjectURL(new Blob(Object.values(fileRef.current).map(i => new Uint8Array(i)), { type: fileInfoRef.current.type }))} controls height={600} width={480}></video>}

      <span>FileName: {fileInfoRef.current.fileName}</span>
      <span>FileId: {fileInfoRef.current.fileId}</span>
      <span>FileSize: {(fileInfoRef.current.fileSize / 1024 / 1024).toFixed(2)} MB</span>
      <span>current: {(currentSize / 1024 / 1024).toFixed(2)} MB</span>
      <span>Speed By RTC bytesSent: {bytesReceived} MB/s</span>
      <Box width="300px" className='!flex items-center'>
        <Progress value={Number(currentProgress)} color="cyan" highContrast />{currentProgress} %
      </Box>
    </section >
  )
}

export default StreamPage
