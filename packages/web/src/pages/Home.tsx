import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataConnection } from 'peerjs'
import { getPeerInstance } from '../utils/peer'

let didInit = false;


const Home = () => {
  const navigate = useNavigate()

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const connRef = useRef<DataConnection | null>(null)
  const isPeerInitializedRef = useRef(false);

  const goToHelloPage = () => {
    document.startViewTransition(() => {
      navigate('/mobile')
    })
  }

  useEffect(() => {
    if (!didInit) {
      const peer = getPeerInstance('yuchi-sender-1')

      connRef.current = peer.connect("yuchi-receive-1");

      if (!isPeerInitializedRef.current) {
        connRef.current.on("open", () => {
          console.log('open!')
          connRef.current?.send("hi!");
        });

        isPeerInitializedRef.current = true;
      }

      didInit = true;
    }

    return () => {
      console.log("disconnecting")
      // peer.disconnect()
      // peer.destroy()
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
      <textarea
        style={{
          width: 320,
          height: 120
        }}
        ref={inputRef}
      />

      <p className="read-the-docs" onClick={goToHelloPage}>
        Click on the Vite and React logos to learn more
      </p>

      <button style={{ marginTop: 20 }} onClick={seedMessage}>Seed Message</button>
    </>
  )
}

export default Home
