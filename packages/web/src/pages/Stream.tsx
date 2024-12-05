import Peer from 'peerjs';
import { chooseFile } from '../utils/chooseFile';
import { useLocation } from 'react-router-dom'
import { useRef, useState } from 'react';

const StreamPage = () => {

  const location = useLocation();

  const [counter, setCounter] = useState(0);
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
  const fileRef = useRef<ArrayBuffer>();

  const usp = new URLSearchParams(location.search);


  const handleSend = async () => {
    const files = await chooseFile();

    const file = files[0];

    // 创建 webRTC 连接
    const peer = new Peer('sender', {
      host: "116.62.176.240",
      port: 80,
      path: "/myapp",
    })
    peer.on("open", (id) => {
      console.log("My peer ID is: " + id);

      const conn = (peer as Peer).connect('receiver');

      file.arrayBuffer().then((buffer) => {
        const fileId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const fileName = file.name;
        const fileSize = buffer.byteLength;
        const chunkSize = 1024 * 1024 * 10;
        conn.send({ fileId, fileName, fileSize, flag: 'start', type: file.type });
        // 分片发送
        for (let i = 0; i < buffer.byteLength; i += chunkSize) {
          const chunk = buffer.slice(i, i + chunkSize);
          conn.send({ fileId, fileName, chunk, type: file.type, flag: 'chunk', start: i });
        }
        conn.send({ fileId, fileName, fileSize, flag: 'end', type: file.type });
      })
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
        conn.on("data", async (data) => {
          const _data = data as {
            fileId: string;
            fileName: string;
            fileSize: number;
            chunk?: ArrayBuffer;
            flag: 'start' | 'end' | 'chunk';
            type: string;
            start: number;
          }
          console.log(data);
          // 合并文件
          if (_data.flag === 'start') {
            // 初始化
            const file = new File([new ArrayBuffer(0)], _data.fileName, { type: _data.type });
            const buffer = await file.arrayBuffer()

            console.log('init file', buffer)
            fileRef.current = buffer;
            fileInfoRef.current = {
              fileId: _data.fileId,
              fileName: _data.fileName,
              fileSize: _data.fileSize,
              current: buffer.byteLength,
              type: _data.type
            }
          } else if (_data.flag === 'end') {
            // 结束
            console.log('end')
          } else {
            // 添加数据
            const _file = new File([_data.chunk || new ArrayBuffer(0)], _data.fileName, { type: _data.type });
            const buffer = await _file.arrayBuffer()

            if (fileRef.current === undefined) return;

            const newFile = new File([fileRef.current, buffer], _data.fileName, { type: _data.type });
            const newFileBuffer = await newFile.arrayBuffer();

            fileRef.current = newFileBuffer;
            fileInfoRef.current = {
              fileId: _data.fileId,
              fileName: _data.fileName,
              fileSize: fileInfoRef.current.fileSize,
              current: newFileBuffer.byteLength,
              type: _data.type
            }
            console.log(newFileBuffer)
          }
        })
      })
    })
  }

  return (
    <section className='flex flex-col items-center justify-center h-screen backdrop-blur-[100px] backdrop-saturate-[240%]'>

      {usp.get('id')}

      <button className='px-4 py-2 my-2 border border-red-800 border-dashed' onClick={handleSend}>我要发送</button>
      <button className='px-4 py-2 my-2 border border-red-800 border-dashed' onClick={handleReady}>我要接收</button>

      <button className='px-4 py-2 my-2 border border-red-800 border-dashed' onClick={() => setCounter(counter => counter + 1)}>Refresh Page</button>

      {
        // fileInfoRef.current.current === fileInfoRef.current.fileSize &&
        fileRef.current && <video key={counter} src={URL.createObjectURL(new Blob([fileRef.current], { type: fileInfoRef.current.type }))} controls height={400} width={320}></video>}


      <span>FileName: {fileInfoRef.current.fileName}</span>
      <span>FileId: {fileInfoRef.current.fileId}</span>
      <span>FileSize: {fileInfoRef.current.fileSize / 1024 / 1024} MB</span>
      <span>current: {fileInfoRef.current.current / 1024 / 1024} MB</span>
      {/* <span>{Math.floor((file?.byteLength || 0) / 1024 / 1024)} MB</span> */}
    </section >
  )
}

export default StreamPage
