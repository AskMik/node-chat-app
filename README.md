# Node Chat App (Player ↔ Fan Chat)

This project is a **Node.js backend + simple frontend** that supports **real-time chat** between players and fans using **Socket.io**.

---

## Features
- **User Registration & Login** (with JWT authentication)
- **Role-based chat**: only `fan ↔ player` chats allowed
- **Real-time messaging** with Socket.io
- **Message storage** in MongoDB
- **User presence** (online/offline)
- **Simple frontend** for testing (public/index.html)

---

## Tech Stack
- **Backend**: Node.js, Express, Socket.io
- **Database**: MongoDB (Mongoose ORM)
- **Auth**: JWT (jsonwebtoken), bcrypt for password hashing
- **Frontend**: Vanilla JS with Socket.io-client

---

## Setup Instructions
1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   - Copy `.env.example` to `.env`:
     ```
     MONGO_URI=mongodb://localhost:27017/nodechatapp
     JWT_SECRET=yourSuperSecretKey
     PORT=5000
     ```

3. **Start MongoDB**
   ```bash
   mongod
   ```

4. **Run the server**
   ```bash
   node server.js
   ```

5. **Open the frontend**
   - Visit [http://localhost:5000](http://localhost:5000).

---

## API Endpoints

### **POST /api/auth/register**
Registers a new user (player or fan).  
**Body:**
```json
{
  "name": "John",
  "email": "john@example.com",
  "password": "123456",
  "role": "fan"
}
```

### **POST /api/auth/login**
Logs in and returns a JWT token.  

### **GET /api/chat/:userId**
Fetch chat messages between logged-in user and `userId`.  
**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

### **POST /api/chat/send**
Send a new message using an API.  
**Body:**
```json
{
  "receiverId": "<userId>",
  "message": "Hello from API"
}
```

---

## Real-Time Chat Flow
- After login, the frontend connects to the backend with:
  ```js
  const socket = io('http://localhost:5000', { auth: { token: <JWT_TOKEN> } });
  ```
- Sending message:
  ```js
  socket.emit('privateMessage', { receiverId: '<USER_ID>', message: 'Hello!' });
  ```
- Receiving message:
  ```js
  socket.on('receiveMessage', msg => console.log(msg));
  ```

---

## Chat Flow Explained (Short)
1. User registers/logs in and gets a **JWT token**.
2. Frontend connects to **Socket.io** with this token.
3. Sending a message:
   - The frontend emits `privateMessage` event.
   - The backend verifies the token, saves the message in MongoDB, and emits it to the receiver.
4. The frontend listens to `receiveMessage` to show new messages.
5. Chat history can be fetched via `GET /api/chat/:userId`.

---

## Project Structure
```
node-chat-app/
├── server.js
├── routes/
│   ├── auth.js
│   └── chat.js
├── models/
│   ├── User.js
│   └── Message.js
├── middleware/
│   └── authMiddleware.js
├── public/
│   ├── index.html
│   └── app.js
└── config/
    └── db.js
```

---

## **Testing Chat API with Postman or cURL**

### **1. Prerequisites**
- Ensure the server is running: `node server.js`
- Ensure MongoDB is running.
- Have **two users** (fan & player) registered via the `/api/auth/register` endpoint.
- Obtain **JWT tokens** for both users by logging in with `/api/auth/login`.

### **2. Send a Message via API**
**Endpoint:**  
```
POST http://localhost:5000/api/chat/send
```

**Headers:**  
```
Authorization: Bearer <JWT_TOKEN>    // Use the token of the sender
Content-Type: application/json
```

**Body (JSON):**  
```json
{
  "receiverId": "<receiver_user_id>",
  "message": "Hello from Postman!"
}
```

**Example Response:**  
```json
{
  "_id": "64ae12abc123...",
  "senderId": "64ad2f123...",
  "receiverId": "64ad1b456...",
  "message": "Hello from Postman!",
  "timestamp": "2025-07-21T10:00:00.000Z",
  "__v": 0
}
```

### **3. Fetch Chat History**
**Endpoint:**  
```
GET http://localhost:5000/api/chat/<receiver_user_id>?sort=desc
```

**Headers:**  
```
Authorization: Bearer <JWT_TOKEN>
```

### **4. Example cURL Commands**
**Send Message:**  
```bash
curl -X POST http://localhost:5000/api/chat/send \
-H "Authorization: Bearer <JWT_TOKEN>" \
-H "Content-Type: application/json" \
-d '{"receiverId": "<receiver_user_id>", "message": "Hello from API"}'
```

**Fetch Chat History:**  
```bash
curl -X GET http://localhost:5000/api/chat/<receiver_user_id>?sort=desc \
-H "Authorization: Bearer <JWT_TOKEN>"
```
