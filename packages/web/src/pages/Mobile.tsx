import { useEffect, useRef, useState } from "react"
import { getPeerInstance } from "../utils/peer";
import { DataConnection } from "peerjs";
import * as radash from 'radash';
import { chooseFile } from "../utils/chooseFile";
import { getAlbumList } from "../utils/jsbridge";

let didInit = false;

const MobilePage = () => {

  const [connState, setConnState] = useState<'idle' | 'open' | 'close' | 'error'>('idle');
  const [albumList, setAlbumList] = useState<{
    id: number;
    name: string;
    count: number;
    cover: string;
  }[]>([]);
  const [messageList, setMessageList] = useState<string[]>([]);
  const connRef = useRef<DataConnection | null>(null)

  useEffect(() => {
    if (!didInit) {
      const peer = getPeerInstance("yuchi-receive-1")

      peer.on("connection", (conn) => {

        connRef.current = conn;

        conn.on("open", () => {
          conn.send("hello!");
          setConnState('open')
        });

        conn.on("data", (data) => {
          console.log("received data", data);
          setMessageList((prev) => [data as string, ...prev]);
          setConnState('open')
        });

        conn.on('close', () => {
          setConnState('close')
        })

        conn.on('error', (err) => {
          setConnState('error')
          console.log(err)
        })
      });

      didInit = true;
    }

    return () => {
      console.log("disconnecting")
      // peer.destroy()
    }
  }, [])

  const seedMessage = async () => {
    console.log("seedMessage")

    const [error, files] = await radash.try(getAlbumList)();
    console.log(error, files);
    if (error) {
      alert('error' + error.message)
      return;
    }
    console.log(files);
    setAlbumList([...files])
  }


  return (
    <div style={{
      height: '100%',
      width: '100%',
    }}>
      <p onDoubleClick={() => {
        window.location.reload()
      }}>[Mobile] 连接状态：{connState}(debug:{new Date().getTime()})</p>

      <button style={{ marginTop: 20 }} onClick={seedMessage}>Seed Test Message</button>

      <ul>
        {messageList.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>

      <ul style={{
        paddingLeft: 0
      }}>
        {albumList.map((album) => (
          <li key={album.id} style={{
            display: 'flex',
            margin: 10,
          }}>
            <img src={`data:image/jpeg;base64, ${album.cover}`} style={{
              height: 90,
              width: 90,
              objectFit: 'cover',
            }} />
            <p style={{
              marginLeft: 12,
              display: 'flex'
            }}>{album.name}({album.count})</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default MobilePage