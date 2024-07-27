import { useEffect, useRef, useState } from "react"
import { getPeerInstance } from "../utils/peer";


let didInit = false;

const MobilePage = () => {

  const [messageList, setMessageList] = useState<string[]>([]);

  useEffect(() => {
    if (!didInit) {
      const peer = getPeerInstance("yuchi-receive-1")

      peer.on("connection", (conn) => {
        conn.on("data", (data) => {
          console.log("received data", data);
          setMessageList((prev) => [data as string, ...prev]);
        });

        conn.on("open", () => {
          conn.send("hello!");
        });
      });

      didInit = true;
    }

    return () => {
      console.log("disconnecting")
      // peer.destroy()
    }
  }, [])

  return (
    <div style={{
      height: '100%',
      width: '100%',
    }}>
      <button onClick={() => window.location.href = '/'}>Go To Root Page</button>

      <ul>
        {messageList.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    </div>
  )
}

export default MobilePage