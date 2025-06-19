// 🔥 Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAqCeGyxYTQa8OzHivo3--DGZ4Gymy1lw0",
  authDomain: "entrefix-ffde6.firebaseapp.com",
  databaseURL: "https://entrefix-ffde6-default-rtdb.firebaseio.com",
  projectId: "entrefix-ffde6"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let localStream, remoteStream, peerConnection;
const servers = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

// 🔁 Main entry point — handles caller or joiner
function joinRoom(roomId) {
  const isCaller = confirm("Are you the first one in the room? Click OK to Start, Cancel to Join");

  if (isCaller) {
    startRoom(roomId);
  } else {
    joinExistingRoom(roomId);
  }
}

// 🎥 Setup local + remote video
async function setupVideo() {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  remoteStream = new MediaStream();

  document.getElementById("localVideo").srcObject = localStream;
  document.getElementById("remoteVideo").srcObject = remoteStream;
}

// 🎙️ Add local tracks to peer connection
function addTracks() {
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
}

// 🧑 Start room and send offer
async function startRoom(roomId) {
  await setupVideo();

  peerConnection = new RTCPeerConnection(servers);
  addTracks();

  peerConnection.onicecandidate = e => {
    if (e.candidate) {
      db.ref(`${roomId}/callerCandidates`).push(JSON.stringify(e.candidate));
    }
  };

  peerConnection.ontrack = e => {
    e.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  db.ref(`${roomId}`).set({ offer: JSON.stringify(offer) });

  db.ref(`${roomId}/answer`).on("value", async snapshot => {
    const val = snapshot.val();
    if (!val) return;
    const answer = JSON.parse(val);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  });

  db.ref(`${roomId}/calleeCandidates`).on("child_added", snapshot => {
    const candidate = new RTCIceCandidate(JSON.parse(snapshot.val()));
    peerConnection.addIceCandidate(candidate);
  });
}

// 👥 Join existing room using offer
async function joinExistingRoom(roomId) {
  await setupVideo();

  peerConnection = new RTCPeerConnection(servers);
  addTracks();

  peerConnection.onicecandidate = e => {
    if (e.candidate) {
      db.ref(`${roomId}/calleeCandidates`).push(JSON.stringify(e.candidate));
    }
  };

  peerConnection.ontrack = e => {
    e.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
  };

  const snapshot = await db.ref(`${roomId}/offer`).get();
  const offer = JSON.parse(snapshot.val());

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  db.ref(`${roomId}/answer`).set(JSON.stringify(answer));

  db.ref(`${roomId}/callerCandidates`).on("child_added", snapshot => {
    const candidate = new RTCIceCandidate(JSON.parse(snapshot.val()));
    peerConnection.addIceCandidate(candidate);
  });
}

// 🌐 Auto-detect room from URL and join
window.onload = () => {
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("room");
  if (roomId) {
    joinRoom(roomId);
  }
};
