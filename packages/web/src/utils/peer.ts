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
    host: "192.168.0.105",
    port: 9000,
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

let peer: Peer | null = null;
let conn: DataConnection | null = null;
export const getHostPeerInstance = (senderId: string, receiverId: string): DataConnection => {
  if (conn) return conn;
  
  peer = getPeerInstance(senderId);

  conn = peer.connect(receiverId);

  conn.on("open", () => {
    emitter.emit("open");
  });

  conn.on("close", () => {
    emitter.emit("close");
  });

  conn.on("iceStateChanged", (state) => {
    emitter.emit("iceStateChanged", state);
  });
  conn.on("error", (err) => {
    emitter.emit("error", err);
  });

  conn.on("data", (data) => {
    emitter.emit("data", data);
  });

  return conn;
};

// export const getJoinerPeerInstance = () => {

// }
