import Peer from "peerjs";

let peerInstance: Peer | null = null

export const getPeerInstance = (id: string) => {
  
  if (!peerInstance) {
    console.log('creating new peer instance')
    peerInstance = new Peer(id, {
      host: "192.168.0.106",
      port: 9000,
      path: "/myapp",
      debug: 3
    });
    console.log(peerInstance)
  }
  return peerInstance
}