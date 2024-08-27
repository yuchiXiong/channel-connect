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

export const getPeerInstance = (standalone = true) => {
  const options = {
    host: '116.62.176.240',
    port: 80,
    path: "/myapp",
  };
  if (!standalone) {
    return new Peer('', options);
  }
  if (!peerInstance) {
    peerInstance = new Peer('', options);
  }
  return peerInstance;
};

let hostPeer: Peer | null = null;
let hostConn: DataConnection | null = null;
export const getHostPeerInstance = (
  receiverId: string
): Promise<DataConnection> => {
  if (hostConn) return Promise.resolve(hostConn);

  hostPeer = getPeerInstance();

  return new Promise<DataConnection>((resolve, reject) => {
    if (!hostPeer) {
      reject("hostPeer is null");
      return;
    }
    hostPeer.on("error", err => {
      reject(err);
    })
    hostPeer.on("open", (id) => {
      console.log("My peer ID is: " + id);

      hostConn = hostPeer!.connect(receiverId);
  
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

      resolve(hostConn);
    });
  })

};

let joinerPeer: Peer | null = null;
export const getJoinerPeerInstance = () => {
  if (joinerPeer) return joinerPeer;

  joinerPeer = getPeerInstance(false);
  joinerPeer.on("open", (id) => {
    console.log("My peer ID is: " + id);
  });
  joinerPeer.on("connection", (conn) => {
    emitter.emit("connection", conn);
  });

  return joinerPeer;
};
