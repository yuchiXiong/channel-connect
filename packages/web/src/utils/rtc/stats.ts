import { DataConnection } from "peerjs";

export interface IRTCStatsListenOptions {
  interval: number;
}

let listenerTimer: number = -1;

const startListenRTCStats = (
  conn: DataConnection, 
  callback: (report: RTCStatsReport, conn: DataConnection) => void, 
  options?: IRTCStatsListenOptions
) => {
  const { interval } = options || { interval: 1000 };
  listenerTimer = setInterval(() => {
    conn.peerConnection.getStats(null).then((statsReport) => {
      callback(statsReport, conn);
    });
  }, interval);
}

const stopListenRTCStats = () => {
  if (listenerTimer !== -1) {
    clearInterval(listenerTimer);
    listenerTimer = -1;
  }
}

export default {
  startListenRTCStats,
  stopListenRTCStats
}