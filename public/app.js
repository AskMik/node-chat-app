const BASE_URL = 'http://localhost:5000';
let token = null;
let socket = null;

async function postData(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

async function register() {
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;
  const res = await postData(`${BASE_URL}/api/auth/register`, { name, email, password, role });
  if (res.token) {
    token = res.token;
    alert('Registered! Token stored.');
    connectSocket();
  } else {
    alert(res.msg || res.error);
  }
}

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const res = await postData(`${BASE_URL}/api/auth/login`, { email, password });
  if (res.token) {
    token = res.token;
    alert('Logged in! Token stored.');
    connectSocket();
  } else {
    alert(res.msg || res.error);
  }
}

function connectSocket() {
  if (!token) return alert('No token! Please login or register first.');
  socket = io(BASE_URL, { auth: { token } });
  socket.on('connect', () => console.log('Connected with socket:', socket.id));
  socket.on('receiveMessage', (msg) => {
    const div = document.getElementById('messages');
    div.innerHTML += `<p><b>${msg.senderId}:</b> ${msg.message}</p>`;
  });
  socket.on('chatError', (err) => alert(err.msg));
  socket.on('userPresence', (p) => console.log('Presence update:', p));
}

function sendMessage() {
  if (!socket) return alert('Not connected!');
  const receiverId = document.getElementById('receiverId').value;
  const message = document.getElementById('message').value;
  socket.emit('privateMessage', { receiverId, message });

  // print locally
  const div = document.getElementById('messages');
  div.innerHTML += `<p><b>You:</b> ${message}</p>`;
  document.getElementById('message').value = '';
}


const seenMessages = new Set(); 

function handleReceiveMessage(msg) {
  if (msg?._id && seenMessages.has(msg._id)) return;
  if (msg?._id) seenMessages.add(msg._id);

  const div = document.getElementById('messages');
  const me = socket?.authUserId; // we'll set this below
  const fromMe = msg.senderId === me;
  div.innerHTML += `<p><b>${fromMe ? 'You' : msg.senderId}:</b> ${msg.message}</p>`;
}

function connectSocket() {
  if (!token) return alert('No token!');

  // CLEAN UP any previous socket
  if (socket) {
    socket.off();         // remove all listeners
    socket.disconnect();  // close previous connection
  }

  socket = io(BASE_URL, { auth: { token } });

  // decode userId from token (lightweight client decode)
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    socket.authUserId = payload.userId;
  } catch (_) {}

  socket.on('connect', () => console.log('Connected socket:', socket.id));
  socket.on('receiveMessage', handleReceiveMessage);
  socket.on('chatError', err => alert(err.msg));
  socket.on('userPresence', p => console.log('Presence:', p));
}
