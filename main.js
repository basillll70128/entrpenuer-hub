// 🔥 Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAqCeGyxYTQa8OzHivo3--DGZ4Gymy1lw0",
  authDomain: "entrefix-ffde6.firebaseapp.com",
  databaseURL: "https://entrefix-ffde6-default-rtdb.firebaseio.com",
  projectId: "entrefix-ffde6"
};

// ✅ Init Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let localStream, remoteStream, peerConnection;
const servers = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

// 👥 Handle join button click
function joinRoom(roomId) {
  const isCaller = confirm("Are you the first one in the room? Click OK to Start, Cancel to Join");

  if (isCaller) {
    startRoom(roomId);
  } else {
    joinExistingRoom(roomId);
  }
}

// 🎥 Setup local and remote video
async function setupVideo() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    remoteStream = new MediaStream();

    document.getElementById("localVideo").srcObject = localStream;
    document.getElementById("remoteVideo").srcObject = remoteStream;
  } catch (err) {
    alert("Please allow camera and microphone permissions to join the room.");
    console.error("Media error:", err);
  }
}

// 🎙️ Add local stream tracks to peer
function addTracks() {
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
}

// 🧑 Caller: Create room and send offer
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

// 👤 Joiner: Receive offer and send answer
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
