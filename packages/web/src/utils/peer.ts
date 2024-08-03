import Peer from "peerjs";

let peerInstance: Peer | null = null

export const getPeerInstance = (id: string) => {
  
  if (!peerInstance) {
    peerInstance = new Peer(id, {
      host: "192.168.0.106",
      port: 9000,
      path: "/myapp",
    });
    console.log(peerInstance)
  }
  return peerInstance
}