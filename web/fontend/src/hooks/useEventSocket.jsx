import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { message } from 'antd';

/**
 * Custom hook for listening to event status changes via socket
 * @param {string} eventId - Optional event ID to join specific event room
 * @param {function} onStatusChange - Optional callback when status changes
 * @returns {object} - { currentStatus, socketRef }
 */
export const useEventSocket = (eventId = null, onStatusChange = null) => {
  const [currentStatus, setCurrentStatus] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Get socket URL from environment or use default
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:9999';
    
    socketRef.current = io(socketUrl, {
      transports: ['websocket'],
      withCredentials: true,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('✅ Connected to event socket:', socket.id);
      
      // Join specific event room if eventId is provided
      if (eventId) {
        socket.emit('join_event_room', eventId);
        console.log(`📥 Joined event room: event_${eventId}`);
      }
    });

    // Listen for all event status changes (broadcast)
    socket.on('event_status_changed', (data) => {
      console.log('📢 Event status changed (broadcast):', data);
      
      // If this is the event we're watching, update status
      if (eventId && data.eventId === eventId) {
        setCurrentStatus(data.newStatus);
        if (onStatusChange) {
          onStatusChange(data);
        }
        
        // Show notification
        message.info({
          content: data.message || `Sự kiện "${data.eventTitle}" đã thay đổi trạng thái`,
          duration: 5,
        });
      }
    });

    // Listen for specific event room updates
    socket.on('event_status_update', (data) => {
      console.log('📨 Event status update (room):', data);
      
      if (eventId && data.eventId === eventId) {
        setCurrentStatus(data.status);
        if (onStatusChange) {
          onStatusChange({
            eventId: data.eventId,
            newStatus: data.status,
            message: data.message,
          });
        }
        
        // Show notification
        message.info({
          content: data.message || 'Trạng thái sự kiện đã được cập nhật',
          duration: 5,
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from event socket');
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });

    return () => {
      // Leave event room before disconnecting
      if (eventId && socketRef.current) {
        socketRef.current.emit('leave_event_room', eventId);
      }
      socket.disconnect();
    };
  }, [eventId, onStatusChange]);

  return {
    currentStatus,
    socketRef,
  };
};

