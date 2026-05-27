const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true, 
    methods: ["GET", "POST"],
    credentials: true
  },
  allowEIO3: true 
});

let tickets = [
  { id: 101, title: "Truck 44 flat tire in Ohio", resolution: "Unresolved", lockedBy: null },
  { id: 102, title: "Missing manifest for shipment #882", resolution: "Unresolved", lockedBy: null },
  { id: 103, title: "Customer requesting address change", resolution: "Unresolved", lockedBy: null }
];

io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`);
  socket.emit('initial_tickets', tickets);

 
  socket.on('lock_ticket', ({ ticketId, agentName }) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.lockedBy = agentName;
      io.emit('initial_tickets', tickets); 
    }
  });

 
  socket.on('unlock_ticket', ({ ticketId }) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.lockedBy = null;
      io.emit('initial_tickets', tickets); 
    }
  });

 
  socket.on('update_ticket', ({ ticketId, resolutionText }) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.resolution = resolutionText || "Unresolved";
      ticket.lockedBy = null; 
      io.emit('initial_tickets', tickets); 
    }
  });

  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`);
  });
});

server.listen(3001, () => {
  console.log('Backend running on port 3001');
});