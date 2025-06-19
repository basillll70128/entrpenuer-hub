// agora.js
const APP_ID = "YOUR_APP_ID_HERE"; // Replace with your real Agora App ID
const TOKEN = null;
let client, localTracks = [];

async function joinAgoraRoom(roomName) {
  if (client) {
    await client.leave();
    localTracks.forEach(track => track.stop());
  }

  client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
  await client.join(APP_ID, roomName, TOKEN, null);

  localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();

  const localVideo = document.getElementById("localVideo");
  localVideo.srcObject = new MediaStream([localTracks[1].getMediaStreamTrack()]);
  localVideo.play();

  await client.publish(localTracks);

  client.on("user-published", async (user, mediaType) => {
    await client.subscribe(user, mediaType);
    if (mediaType === "video") {
      const remoteVideo = document.getElementById("remoteVideo");
      const remoteTrack = user.videoTrack;
      remoteVideo.srcObject = new MediaStream([remoteTrack.getMediaStreamTrack()]);
      remoteVideo.play();
    }
  });

  client.on("user-unpublished", user => {
    console.log("User left the room:", user.uid);
  });
}
