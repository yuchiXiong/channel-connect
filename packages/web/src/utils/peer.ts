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
    host: "116.62.176.240",
    port: 80,
    path: "/myapp",
  };
  if (!standalone) {
    return new Peer("", options);
  }
  if (!peerInstance) {
    peerInstance = new Peer("", options);
  }
  return peerInstance;
};

let joinerPeer: Peer | null = null;
let joinerConn: DataConnection | null = null;
export const getJoinerPeerInstance = (
  receiverId: string
): Promise<DataConnection> => {
  if (joinerConn) return Promise.resolve(joinerConn);

  joinerPeer = getPeerInstance();

  return new Promise<DataConnection>((resolve, reject) => {
    if (!joinerPeer) {
      reject("hostPeer is null");
      return;
    }

    joinerPeer.on("error", (err) => {
      reject(err);
    });
    joinerPeer.on("open", (id) => {
      console.log("My peer ID is: " + id);

      joinerConn = (joinerPeer as Peer).connect(receiverId);

      console.log(joinerConn);

      joinerConn.on("open", () => {
        console.log("joinerConn open");
        emitter.emit("open");
        resolve(joinerConn as DataConnection);
      });

      joinerConn.on("close", () => {
        console.log("joinerConn close");

        emitter.emit("close");
      });

      joinerConn.on("iceStateChanged", (state) => {
        console.log("iceStateChanged close");
        emitter.emit("iceStateChanged", state);
      });

      joinerConn.on("error", (err) => {
        console.log("iceStateChanged error");

        emitter.emit("error", err);
      });

      joinerConn.on("data", (data) => {
        console.log("iceStateChanged data");

        emitter.emit("data", data);
      });
    });

    joinerPeer.on("connection", (conn) => {
      console.log("joinerPeer connection");
      emitter.emit("connection", conn);
    });
  });
};

let hostPeer: Peer | null = null;
export const getHostPeerInstance = (): Promise<Peer> => {
  if (hostPeer) return Promise.resolve(hostPeer);

  return new Promise<Peer>((resolve, reject) => {
    hostPeer = getPeerInstance(false);

    hostPeer.on("open", (id) => {
      console.log("My peer ID is: " + id);
      resolve(hostPeer as Peer);
    });
    hostPeer.on("connection", (conn) => {
      console.log("hostPeer connection");
      emitter.emit("connection", conn);
      conn.on("open", () => {
        emitter.emit("open", conn);
      });

      conn.on("close", () => {
        emitter.emit("close", conn);
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
    });
    hostPeer.on("error", (err) => {
      console.log("hostPeer error");

      reject(err);
    });
  });
};
