import Peer, { DataConnection } from "peerjs";
import mitt from "mitt";

export enum EPeerMessageType {
  Greeting = "Greeting",
  AlbumList = "AlbumList",
  RequestAlbumInfo = "RequestAlbumInfo",
  RequestPhotoOrigin = "RequestPhotoOrigin",
}

export interface IPeerMessage<T> {
  type: string;
  data: T;
}

export const emitter = mitt();
let peerInstance: Peer | null = null;

export const getPeerInstance = (id: string, standalone = true) => {
  const options = {
    host: '116.62.176.240',
    port: 80,
    path: "/myapp",
  };
  if (!standalone) {
    return new Peer(id, options);
  }
  if (!peerInstance) {
    peerInstance = new Peer(id, options);
  }
  return peerInstance;
};

let hostPeer: Peer | null = null;
let hostConn: DataConnection | null = null;
export const getHostPeerInstance = (senderId: string, receiverId: string): DataConnection => {
  if (hostConn) return hostConn;
  
  hostPeer = getPeerInstance(senderId);

  hostConn = hostPeer.connect(receiverId);

  hostConn.on("open", () => {
    emitter.emit("open");
  });

  hostConn.on("close", () => {
    emitter.emit("close");
  });

  hostConn.on("iceStateChanged", (state) => {
    emitter.emit("iceStateChanged", state);
  });
  hostConn.on("error", (err) => {
    emitter.emit("error", err);
  });

  hostConn.on("data", (data) => {
    emitter.emit("data", data);
  });

  return hostConn;
};

let joinerPeer : Peer | null = null;
export const getJoinerPeerInstance = (senderId: string) => {
  if (joinerPeer) return joinerPeer;

  joinerPeer = getPeerInstance(senderId, false)

  joinerPeer.on("connection", (conn) => {
    emitter.emit("connection", conn);
  });

  return joinerPeer;
}
