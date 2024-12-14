import Peer from 'peerjs';
import { chooseFile } from '../utils/chooseFile';
import { useLocation } from 'react-router-dom'
import { useRef, useState } from 'react';
import { Box, Progress } from '@radix-ui/themes';

const StreamPage = () => {

  let preTimeStamp = 0;
  const location = useLocation();

  const [kbps, setKbps] = useState(0);
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

      
      const conn = peer.connect('receiver');

      const fileId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const fileName = file.name;
      const fileSize = file.size;

      const stream = file.stream();
      const reader = stream.getReader();

      const readChunk = async (index: number) => {
        const { done, value } = await reader.read(); // 读取下一块数据
        if (done) {
          conn.send({ fileId, fileName, fileSize, flag: 'end', type: file.type });
          return;
        }

        conn.send({ fileId, fileName, chunk: value, type: file.type, flag: 'chunk', index });

        await new Promise((resolve) =>
          setTimeout(resolve, 1000)
        );

        readChunk(index + 1); // 递归读取下一块数据
      }

      conn.send({ fileId, fileName, fileSize, flag: 'start', type: file.type });

      await new Promise((resolve) =>
        setTimeout(resolve, 1000)
      );

      readChunk(0);
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
        console.log(conn.peer);
        conn.on("data", (data) => {
          const _data = data as {
            fileId: string;
            fileName: string;
            fileSize: number;
            chunk?: Uint8Array;
            flag: 'start' | 'end' | 'chunk';
            type: string;
            index: number;
          }
          console.log(data);
          // 合并文件
          if (_data.flag === 'start') {
            console.log('init file')
            fileRef.current = {};
            fileInfoRef.current = {
              fileId: _data.fileId,
              fileName: _data.fileName,
              fileSize: _data.fileSize,
              current: 0,
              type: _data.type
            }
            setKbps(0);
            preTimeStamp = new Date().getTime();
          } else if (_data.flag === 'end') {
            // 结束
            console.log('end')
          } else {
            // 添加数据
            if (fileRef.current === undefined) return;
            if (!_data.chunk) return;

            fileRef.current[_data.index] = _data.chunk;
            fileInfoRef.current = {
              fileId: _data.fileId,
              fileName: _data.fileName,
              fileSize: fileInfoRef.current.fileSize,
              current: Object.values(fileRef.current).reduce((pre, cur) => pre + cur.byteLength, 0),
              type: _data.type
            }
            const nowTimeStamp = new Date().getTime();
            const timeDiff = (nowTimeStamp - preTimeStamp) / 1000;
            preTimeStamp = nowTimeStamp;
            setKbps((pre) => {
              if (timeDiff === 0) return pre;
              return (_data.chunk?.length || 0) / timeDiff;
            })
          }
        })
      })

      peer.on('close', () => {
        console.log('close')
      })
    })
  }

  const currentSize = Object.values(fileRef.current).reduce((pre, cur) => pre + cur.length, 0);
  const currentProgress = ((currentSize / fileInfoRef.current.fileSize || 0) * 100).toFixed(0);

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
      <span>Speed: {(kbps / 1024 / 1024).toFixed(2)} MB/s</span>
      <Box width="300px" className='!flex items-center'>
        <Progress value={Number(currentProgress)} color="cyan" highContrast />{currentProgress} %
      </Box>
    </section >
  )
}

export default StreamPage
