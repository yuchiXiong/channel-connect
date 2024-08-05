import { PeerServer } from "peer";

PeerServer({
  port: 443,
  path: "/myapp",
  key: "peerjs",
  host: 'channel-connect.vercel.app',
});
