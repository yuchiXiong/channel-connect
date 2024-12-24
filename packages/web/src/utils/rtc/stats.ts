/**
 * 分别获取每个 peerConnection 的 stats
 */
import Peer, { DataConnection } from "peerjs";

export interface IRTCStatsListenOptions {
  interval: number;
}

let listenerTimer = -1;
let interval = 1000;
const connectionLabelIdMap: Record<string, string> = {};

const subscribeRTCStats = (
  connectionId: string,
  label: string,
  options?: IRTCStatsListenOptions
) => {
  connectionLabelIdMap[connectionId] = label;
  interval = options?.interval || 1000;
};

const startListenRTCStats = <R>(
  peer: Peer,
  peerId: string,
  callback: (report: RTCStatsReport, conn: DataConnection) => R
) => {
  listenerTimer = setInterval(() => {
    Object.keys(connectionLabelIdMap).forEach((connectionId) => {
      const connection = peer.getConnection(peerId, connectionId);
      connection?.peerConnection.getStats(null).then((statsReport) => {
        callback(statsReport, connection as DataConnection);
      })
    });
  }, interval);
};

const unSubscribeRTCStats = (connectionId: string) => {
  delete connectionLabelIdMap[connectionId];

  const keys = Object.keys(connectionLabelIdMap);
  if (keys.length === 0 && listenerTimer !== -1) {
    clearInterval(listenerTimer);
    listenerTimer = -1;
  }
};

const statsToArray = (report: RTCStatsReport) => {
  const arr = [];
  report.forEach((value) => {
    arr.push(value);
  });
  return arr;
}

export default {
  statsToArray,

  subscribeRTCStats,
  startListenRTCStats,
  unSubscribeRTCStats,
};
