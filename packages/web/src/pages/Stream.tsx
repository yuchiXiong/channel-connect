import Peer, { DataConnection } from 'peerjs';
import { useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react';
import { Box, Progress } from '@radix-ui/themes';
import { stats } from '../utils/rtc';
import { chooseFile } from '../utils/chooseFile';
import { fileChunk } from '../utils/fileStream';

const StreamPage = () => {

  const location = useLocation();

  const preSendStatsMap = useRef<Record<string, {
    timeStamp: number,
    bytesReceived: number,
    receiveSpeed: number,
  }>>({})
  const fileInfoRef = useRef<Record<string, {
    fileId: string,
    fileName: string,
    fileSize: number,
    current: number,
    type: string
  }>>({});
  const fileRef = useRef<Record<string, Record<string, Uint8Array>>>({});

  const usp = new URLSearchParams(location.search);
  const [, setCounter] = useState(0);

  const forceUpdate = () => {
    setCounter(counter => counter + 1)
  }

  const RTCStatslistener = (statsReport: RTCStatsReport, conn: DataConnection) => {
    const report = stats.statsToArray(statsReport).find((report) => report.type === 'data-channel' && report.dataChannelIdentifier === conn.dataChannel.id);

    if (!report) return null;
    const curSendStatsMap = preSendStatsMap.current[conn.label] || {
      timeStamp: 0,
      bytesReceived: 0,
      receiveSpeed: 0,
    }
    const currentStats = {
      bytesSent: report.bytesSent || 0,
      bytesReceived: report.bytesReceived || 0,
      messagesSent: report.messagesSent || 0,
      messagesReceived: report.messagesReceived || 0,
      timestamp: report.timestamp || 0,
    }
    const timeDiff = (currentStats.timestamp - curSendStatsMap.timeStamp) / 1000; // 转为秒
    const currentBytesReceived = currentStats.bytesReceived;
    const bytesReceivedDiff = currentBytesReceived - curSendStatsMap.bytesReceived;

    console.log('bytesReceivedDiff', bytesReceivedDiff, timeDiff);
    if (timeDiff === 0) return;
    const receiveSpeed = Number(((bytesReceivedDiff / timeDiff) / 1024 / 1024).toFixed(2)); // MB/s
    fileInfoRef.current[conn.label].current = currentBytesReceived;

    preSendStatsMap.current[conn.label] = {
      timeStamp: currentStats.timestamp,
      bytesReceived: currentBytesReceived,
      receiveSpeed,
    }
    forceUpdate();
  }



  const handleSend = async () => {
    const files = await chooseFile({
      multiple: true,
    });

    console.log(files);

    await new Promise((resolve) =>
      setTimeout(resolve, 1000)
    );
    // 创建 webRTC 连接
    const peer = new Peer('senderweb', {
      host: "116.62.176.240",
      port: 80,
      path: "/myapp",
    })
    peer.on("open", async (id) => {
      console.log("My peer ID is: " + id);

      files.forEach(async (file, index) => {
        const conn = peer.connect('receiver', {
          label: 'test_file_' + index,
        });
        const fileId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const fileName = file.name;
        const fileSize = file.size;

        await new Promise((resolve) => {
          setTimeout(resolve, 1000);
        })
        conn.send({
          type: 'metadata',
          payload: {
            fileId,
            fileName,
            fileSize,
            fileType: file.type,
          }
        })
        await new Promise((resolve) => {
          setTimeout(resolve, 1000);
        })
        const chunks = fileChunk(file);

        for (const chunkInfo of chunks) {
          const { chunk, index } = chunkInfo;
          const data = await chunk;
          conn.send({
            type: 'chunk',
            payload: {
              data,
              fileId,
              index
            },
          });
        }
      })
    });
  }


  const handleReady = async () => {
    const peer = new Peer('receiver', {
      host: "116.62.176.240",
      port: 80,
      path: "/myapp",
    })
    peer.on("open", (peerId) => {
      console.log("My peer ID is: " + peerId);

      peer.on("connection", (conn) => {
        // stats.startListenRTCStats(peer, conn.peer, RTCStatslistener);

        conn.on("data", (data) => {
          console.log('Received data:', data, typeof data);
          const _data = data as {
            type: 'chunk';
            payload: {
              data: ArrayBuffer;
              index: number;
              fileId: string;
            }
          } | {
            type: 'metadata';
            payload: {
              fileId: string;
              fileName: string;
              fileSize: number;
              fileType: string;
            }
          };

          handleChannelMessage(conn, _data)
        })
      })

      peer.on('close', () => {
        console.log('close')
      })
    })
  }

  const handleChannelMessage = (conn: DataConnection, data: {
    type: 'chunk';
    payload: {
      data: ArrayBuffer;
      index: number;
      fileId: string;
    }
  } | {
    type: 'metadata';
    payload: {
      fileId: string;
      fileName: string;
      fileSize: number;
      fileType: string;
    }
  }) => {
    const { type, payload } = data;
    switch (type) {
      case 'metadata': {
        stats.subscribeRTCStats(conn.connectionId, conn.label);
        fileInfoRef.current[payload.fileId] = {
          fileId: payload.fileId,
          fileName: payload.fileName,
          fileSize: payload.fileSize,
          current: 0,
          type: payload.fileType
        }
        fileRef.current[payload.fileId] = {};
        break;
      }
      case 'chunk': {
        const fileByUint8Array = new Uint8Array(payload.data);
        fileRef.current[payload.fileId][payload.index] = fileByUint8Array;

        fileInfoRef.current[payload.fileId] = {
          ...fileInfoRef.current[payload.fileId],
          current: fileByUint8Array.byteLength + (fileInfoRef.current[payload.fileId].current || 0)
        }

        setTimeout(() => {
          stats.unSubscribeRTCStats(conn.connectionId);
        }, 1001)
        break;
      }
      default:
        break;
    }

  }

  console.log(preSendStatsMap.current, (Object.values(preSendStatsMap.current).reduce((sum, cur) => sum + cur.receiveSpeed, 0)));

  return (
    <section className='flex flex-col items-center justify-center h-full backdrop-blur-[100px] backdrop-saturate-[240%]'>

      {usp.get('id')}

      <button className='px-4 py-2 my-2 border border-red-800 border-dashed' onClick={handleSend}>我要发送</button>
      <button className='px-4 py-2 my-2 border border-red-800 border-dashed' onClick={handleReady}>我要接收</button>

      <div className='flex flex-col'>
        <p>概览</p>
        {Object.values(preSendStatsMap.current).length && (
          <p>{(Object.values(preSendStatsMap.current).reduce((sum, cur) => sum + cur.receiveSpeed, 0) / Object.values(preSendStatsMap.current).length).toFixed(2)} MB/s</p>
        )}
      </div>

      <div className='flex flex-row flex-wrap w-full'>
        {fileRef.current && Object.keys(fileRef.current).map((key) => (
          <div key={key} className='flex flex-col w-1/2 p-2'>
            <span title={fileInfoRef.current[key].fileId}>{fileInfoRef.current[key].fileName}</span>
            <span className='text-sm'>{(fileInfoRef.current[key].current / 1024 / 1024).toFixed(2)} MB / {(fileInfoRef.current[key].fileSize / 1024 / 1024).toFixed(2)} MB</span>
            <Box width="100%" className='!flex items-center'>
              <Progress value={Number((fileInfoRef.current[key].current / fileInfoRef.current[key].fileSize * 100).toFixed(2))} color="cyan" highContrast />{(fileInfoRef.current[key].current / fileInfoRef.current[key].fileSize * 100).toFixed(2)} %
            </Box>
          </div>
        ))}
      </div>

      {/* {currentProgress === '100' && <video src={URL.createObjectURL(new Blob(Object.values(fileRef.current).map(i => new Uint8Array(i)), { type: fileInfoRef.current.type }))} controls height={600} width={480}></video>}

      <span>FileName: {fileInfoRef.current.fileName}</span>
      <span>FileId: {fileInfoRef.current.fileId}</span>
      <span>FileSize: {(fileInfoRef.current.fileSize / 1024 / 1024).toFixed(2)} MB</span>
      <span>current: {(currentSize / 1024 / 1024).toFixed(2)} MB</span>
      <span>Speed By RTC bytesSent: {bytesReceived} MB/s</span>
      <Box width="300px" className='!flex items-center'>
        <Progress value={Number(currentProgress)} color="cyan" highContrast />{currentProgress} %
      </Box> */}
    </section >
  )
}

export default StreamPage
