"use client";

import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

export default function LiveOpsDashboard() {
  const [agentName, setAgentName] = useState("Agent Marcus");
  const [isConnected, setIsConnected] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [resolutionText, setResolutionText] = useState("");
  const socketRef = useRef(null);

  useEffect(() => {
    // Dynamically set name for testing split screens
    const savedName = localStorage.getItem('agent_name');
    if (savedName) setAgentName(savedName);

   const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
socketRef.current = io(BACKEND_URL, {
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
    const socket = socketRef.current;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('initial_tickets', (serverTickets) => setTickets(serverTickets));
    socket.on('ticket_created', (newTicket) => setTickets((prev) => [...prev, newTicket]));

    socket.on('ticket_locked', ({ ticketId, agentName: lockerName }) => {
      setTickets((prev) => 
        prev.map(t => t.id === ticketId ? { ...t, lockedBy: lockerName } : t)
      );
    });

    socket.on('ticket_unlocked', ({ ticketId }) => {
      setTickets((prev) => 
        prev.map(t => t.id === ticketId ? { ...t, lockedBy: null } : t)
      );
    });

   // Change 'ticket_updated' to 'initial_tickets' to match the backend!
socket.on('initial_tickets', (serverTickets) => {
  setTickets(serverTickets);
});
    return () => {
      socket.disconnect();
    };
  }, []);

  const handleEditClick = (ticket) => {
    socketRef.current.emit('lock_ticket', { 
      ticketId: ticket.id, 
      agentName: agentName 
    });
    setActiveTicketId(ticket.id);
    setResolutionText(ticket.resolution || ""); 
  };

  const handleCloseEditor = () => {
    socketRef.current.emit('unlock_ticket', { ticketId: activeTicketId });
    setActiveTicketId(null);
    setResolutionText("");
  };

  const handleSaveAndClose = () => {
    socketRef.current.emit('update_ticket', { 
      ticketId: activeTicketId,
      resolutionText: resolutionText 
    });
    setActiveTicketId(null);
    setResolutionText("");
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto', color: '#fff' }}>
      
      {!isConnected && (
        <div style={{ background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '4px', marginBottom: '20px', fontWeight: 'bold' }}>
          ⚠️ Connection Lost: Reconnecting...
        </div>
      )}

      <h2>Live Ops Helpdesk</h2>
      <p>Logged in as: <strong style={{ color: '#00e676' }}>{agentName}</strong></p>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #444' }}>
            <th style={{ padding: '12px', width: '10%' }}>ID</th>
            <th style={{ padding: '12px', width: '30%' }}>Issue</th>
            <th style={{ padding: '12px', width: '30%' }}>Resolution</th>
            <th style={{ padding: '12px', width: '15%' }}>Status</th>
            <th style={{ padding: '12px', width: '15%' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map(ticket => {
            const isLocked = ticket.lockedBy !== null;
            const isLockedByMe = ticket.lockedBy === agentName;
            const isLockedByOther = isLocked && !isLockedByMe;

            return (
              <tr 
                key={ticket.id} 
                style={{ 
                  borderBottom: '1px solid #222',
                  background: isLockedByOther ? '#212121' : 'transparent',
                  color: isLockedByOther ? '#777' : '#fff'
                }}
              >
                <td style={{ padding: '12px' }}>#{ticket.id}</td>
                <td style={{ padding: '12px' }}>{ticket.title}</td>
                <td style={{ padding: '12px', color: '#aaa', fontStyle: 'italic' }}>
                  {ticket.resolution || "Unresolved"}
                </td>
                <td style={{ padding: '12px' }}>
                  {isLockedByOther ? (
                    <span style={{ color: '#ff1744' }}>🔒 Locked by {ticket.lockedBy}</span>
                  ) : (
                    <span style={{ color: '#00e676' }}>Open</span>
                  )}
                </td>
                <td style={{ padding: '12px' }}>
                  <button 
                    onClick={() => handleEditClick(ticket)}
                    disabled={isLockedByOther || activeTicketId !== null}
                    style={{
                      padding: '6px 12px',
                      cursor: (isLockedByOther || activeTicketId !== null) ? 'not-allowed' : 'pointer',
                      background: (isLockedByOther || activeTicketId !== null) ? '#444' : '#2979ff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px'
                    }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {activeTicketId && (
        <div style={{ marginTop: '40px', padding: '20px', border: '1px solid #333', borderRadius: '8px', background: '#111' }}>
          <h3>Editing Ticket #{activeTicketId}</h3>
          <textarea 
            rows={4} 
            value={resolutionText}
            onChange={(e) => setResolutionText(e.target.value)}
            style={{ width: '100%', marginBottom: '10px', padding: '10px', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px' }} 
            placeholder="Type resolution here..."
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleSaveAndClose} style={{ padding: '8px 16px', background: '#00e676', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Save & Close
            </button>
            <button onClick={handleCloseEditor} style={{ padding: '8px 16px', background: '#444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}