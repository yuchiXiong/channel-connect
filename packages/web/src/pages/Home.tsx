import { useEffect, useRef, useState } from 'react'
import { DataConnection } from 'peerjs'
import { getPeerInstance } from '../utils/peer'

let didInit = false;


const Home = () => {

  const [connState, setConnState] = useState<'idle' | 'open' | 'close' | 'error'>('idle')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const connRef = useRef<DataConnection | null>(null)
  const isPeerInitializedRef = useRef(false);
  const [messageList, setMessageList] = useState<string[]>([]);


  useEffect(() => {
    if (!didInit) {
      const peer = getPeerInstance('yuchi-sender-1')

      connRef.current = peer.connect("yuchi-receive-1");

      if (!isPeerInitializedRef.current) {
        connRef.current.on("open", () => {
          console.log("connected to: " + connRef.current?.peer);
          setConnState('open')
        });

        connRef.current.on("close", () => {
          setConnState('close')
        })
        connRef.current.on('iceStateChanged', (state) => {
          console.log('iceStateChanged', state)
        })
        connRef.current.on("error", () => {
          setConnState('error')

        })
        connRef.current.on('data', (data) => {
          setMessageList((prev) => [data as string, ...prev]);
        })

        isPeerInitializedRef.current = true;
      }

      didInit = true;
    }

    return () => {
      console.log("disconnecting")
    }
  }, [])

  const seedMessage = () => {
    if (inputRef.current) {
      console.log(inputRef.current.value)
      connRef.current?.send(inputRef.current.value)
    }
  }


  return (
    <>
      <p>连接状态：{connState}</p>
      <textarea
        style={{
          width: 320,
          height: 120
        }}
        ref={inputRef}
      />


      <button style={{ marginTop: 20 }} onClick={seedMessage}>Seed Message</button>

      <ul>
        {messageList.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    </>
  )
}

export default Home
