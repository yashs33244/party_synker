// const express = require("express");
// const cors = require("cors");
// const { createServer } = require("http");
// const { Server } = require("socket.io");
// const fs = require('fs');
// const path = require('path');


// const app = express();
// const httpServer = createServer(app);
// const io = new Server(httpServer, { cors: { origin: '*' }, maxHttpBufferSize: 1e8 });

// app.use(cors({ origin: 'http://localhost:3000' }));

// app.get('/', (req, res) => {
//   res.json({ msg: "hello, this is the partysynker backend :)" });
// });

// let users = [];

// // Function to broadcast the list of users
// const updateUsers = () => {
//   io.emit('users', users);
// };

// io.on('connection', (socket) => {
//   // Add new user on connection
//   users.push(socket.id);
//   updateUsers();

//   console.log(`User connected: ${socket.id}`);

//   socket.on('select_song',(song_selected)=>{console.log(song_selected)})

//   //download the song on backend and then trasnfer tot he client/frontend

//   const baseURL='https://songlist.s3.eu-north-1.amazonaws.com/';



//   // Handle incoming audio request
//   socket.on('ReqAudio', () => {
//     const song = fs.readFileSync("./HoM.mp3");
    
//     // Emit song to all connected users
//     io.emit('song', song);

//     console.log("Audio sent to all users");
//   });

//   // Sending the time ahead of 3 seconds
//   socket.on('request_time', () => {
//     const current_time = new Date().getTime();
//     const delayed_time = current_time + 3000;
    
//     // Emit the play time to all users
//     io.emit('time_to_play_at', delayed_time);

//     console.log(`${current_time} is the current time`);
//     console.log(`${delayed_time} is the time sent to the client`);
//   });

//   // Handle disconnection
//   socket.on('disconnect', () => {
//     // Remove user from the list
//     users = users.filter(id => id !== socket.id);
//     updateUsers();

//     console.log(`User disconnected: ${socket.id}`);
//   });
// });

// httpServer.listen(5000, () => {
//   console.log("Server started at port 5000");
// });







const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });


app.use(cors({
  origin: '*', // Allow requests from the React app
}));


// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Basic route for the root URL
app.get("/", (req, res) => {
  res.send("Welcome to the Socket.IO server!");
});

let users = [];

// Function to broadcast the list of users
const updateUsers = () => {
  io.emit("users", users);
};

const baseURL = process.env.SONG_URL;

io.on("connection", (socket) => {
  // Add new user on connection
  users.push(socket.id);
  updateUsers();

  console.log(`User connected: ${socket.id}`);

  socket.on("select_song", (selectedSong) => {
    // Construct the URL for the selected song
    const songUrl = `${baseURL}${encodeURIComponent(selectedSong)}`;

    // Broadcast the URL to all connected users
    io.emit("song_url", songUrl);

    console.log(`Song URL sent: ${songUrl}`);
  });

  socket.on("request_time", () => {
    const current_time = new Date().getTime();
    const delayed_time = current_time + 3000;

    // Emit the play time to all users
    io.emit("time_to_play_at", delayed_time);

    console.log(`${current_time} is the current time`);
    console.log(`${delayed_time} is the time sent to the client`);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    // Remove user from the list
    users = users.filter((id) => id !== socket.id);
    updateUsers();

    console.log(`User disconnected: ${socket.id}`);
  });
});

httpServer.listen(3001, '0.0.0.0' ,() => {
  console.log("Server started at port 3001");
});







