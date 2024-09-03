import mitt from "mitt";

export const emitter = mitt();

/**
 * @deprecated
 */
export const getHostInstance = async (): Promise<RTCPeerConnection> => {
  const peer = new RTCPeerConnection();

  const channel = peer.createDataChannel("chat");

  channel.onmessage = (event) => {
    console.log("Host received message:", event.data);
    // emitter.emit("message", event.data);
  };

  channel.onopen = () => {
    console.log("Host channel opened");
    emitter.emit("handleChannelOpened", channel);
  };

  channel.onclose = () => {
    console.log("Host channel closed");
  };

  peer.ondatachannel = (event) => {
    console.log('ondatachannel', event)
    // const channel = event.channel;
    // channel.onopen = () => {
    //   console.log("Joiner channel opened");
    //   // resolve(channel);
    // };
    // channel.onclose = () => {
    //   console.log("Joiner channel closed");
    // };
    // channel.onmessage = (event) => {
    //   console.log("Joiner received message:", event.data);
    // };
    // channel.onerror = (error) => {
    //   console.log("Joiner channel error:", error);
    //   // reject(error);
    // };
  };

  const offer = await peer.createOffer();
  await peer.setLocalDescription(new RTCSessionDescription(offer));

  return peer;
};

/**
 * @deprecated
 */
export const handleHostConnect = async (
  peer: RTCPeerConnection,
  answer: RTCSessionDescriptionInit
) => {
  try {
    await peer.setRemoteDescription(new RTCSessionDescription(answer));

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Host ICE candidate:", event.candidate);
        peer.addIceCandidate(event.candidate);
        // emitter.emit("ice-candidate", event.candidate);
      }
    };
  } catch (err) {
    console.error("Error setting remote description:", err);
  }
};

/**
 * @deprecated
 */
export const getJoinerInstance = async (
  offer: RTCSessionDescriptionInit
): Promise<RTCDataChannel> => {
  return new Promise((resolve, reject) => {
    const peer = new RTCPeerConnection();

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        console.log("Joiner ICE candidate:", e.candidate);
        peer.addIceCandidate(e.candidate);
      }
    };

    // const channel = peer.createDataChannel("chat");

    // channel.onmessage = (event) => {
    //   console.log("Host received message:", event.data);
    //   // emitter.emit("message", event.data);
    // };

    // channel.onopen = () => {
    //   console.log("Host channel opened");
    //   // emitter.emit("handleChannelOpened", channel);
    //   resolve(channel);
    // };

    // channel.onclose = () => {
    //   console.log("Host channel closed");
    // };

    peer.ondatachannel = (event) => {
      const channel = event.channel;
      channel.onopen = () => {
        console.log("Joiner channel opened");
        resolve(channel);
      };
      channel.onclose = () => {
        console.log("Joiner channel closed");

      };
      channel.onmessage = (event) => {
        console.log("Joiner received message:", event.data);
      };
      channel.onerror = (error) => {
        console.log("Joiner channel error:", error);
        reject(error);
      }
    };

    peer
      .setRemoteDescription(new RTCSessionDescription(offer))
      .then(() => peer.createAnswer())
      .then((answer) =>
        peer.setLocalDescription(new RTCSessionDescription(answer))
      );
  });
};
