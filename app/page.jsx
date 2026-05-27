"use client";

import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

export default function LiveOpsDashboard() {
  const [agentName, setAgentName] = useState("Agent Marcus");
  const [isConnected, setIsConnected] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [resolutionText, setResolutionText] = useState("");
  const socketRef = useRef(null);

  useEffect(() => {
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

    socket.on('initial_tickets', (serverTickets) => {
      setTickets(serverTickets);
      setIsLoading(false);
    });

    socket.on('ticket_created', (newTicket) => {
      setTickets((prev) => [...prev, newTicket]);
    });

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
    <div className="p-5 font-sans max-w-[1000px] mx-auto text-white">
      {!isConnected && (
        <div className="bg-red-50 text-red-700 p-3 rounded mb-5 font-bold border border-red-200">
          ⚠️ Connection Lost: Reconnecting...
        </div>
      )}

      <h2 className="text-2xl font-bold mb-2">Live Ops Helpdesk</h2>
      <p className="mb-4">Logged in as: <strong className="text-emerald-400">{agentName}</strong></p>

      <table className="w-full border-collapse mt-5 text-left">
        <thead>
          <tr className="border-bottom-2 border-zinc-700">
            <th className="p-3 w-[10%]">ID</th>
            <th className="p-3 w-[30%]">Issue</th>
            <th className="p-3 w-[30%]">Resolution</th>
            <th className="p-3 w-[15%]">Status</th>
            <th className="p-3 w-[15%]">Action</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan="5" className="p-8 text-center text-zinc-500 animate-pulse">
                Establishing secure broker connection...
              </td>
            </tr>
          ) : tickets.length === 0 ? (
            <tr>
              <td colSpan="5" className="p-8 text-center text-zinc-500">
                No active operational tickets found.
              </td>
            </tr>
          ) : (
            tickets.map(ticket => {
              const isLocked = ticket.lockedBy !== null;
              const isLockedByMe = ticket.lockedBy === agentName;
              const isLockedByOther = isLocked && !isLockedByMe;

              return (
                <tr 
                  key={ticket.id} 
                  className={`border-b border-zinc-800 transition-colors ${
                    isLockedByOther ? 'bg-zinc-900/50 text-zinc-500' : 'bg-transparent text-white hover:bg-zinc-800/30'
                  }`}
                >
                  <td className="p-3">#{ticket.id}</td>
                  <td className="p-3">{ticket.title}</td>
                  <td className="p-3 text-zinc-400 italic">
                    {ticket.resolution || "Unresolved"}
                  </td>
                  <td className="p-3">
                    {isLockedByOther ? (
                      <span className="text-red-500 font-medium">🔒 Locked by {ticket.lockedBy}</span>
                    ) : (
                      <span className="text-emerald-400 font-medium">Open</span>
                    )}
                  </td>
                  <td className="p-3">
                    <button 
                      onClick={() => handleEditClick(ticket)}
                      disabled={isLockedByOther || activeTicketId !== null}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                        (isLockedByOther || activeTicketId !== null) 
                        ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                      }`}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {activeTicketId && (
        <div className="mt-10 p-5 border border-zinc-800 rounded-lg bg-zinc-950">
          <h3 className="text-lg font-semibold mb-3">Editing Ticket #{activeTicketId}</h3>
          <textarea 
            rows={4} 
            value={resolutionText}
            onChange={(e) => setResolutionText(e.target.value)}
            className="w-full mb-3 p-3 bg-zinc-900 text-white border border-zinc-800 rounded focus:border-blue-500 focus:outline-none"
            placeholder="Document resolution details..."
          />
          <div className="flex gap-3">
            <button 
              onClick={handleSaveAndClose} 
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded transition-colors"
            >
              Save & Close
            </button>
            <button 
              onClick={handleCloseEditor} 
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}