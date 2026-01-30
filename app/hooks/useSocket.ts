// Why: Hook for Socket.IO client. Uses httpOnly JWT cookie for auth.
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export default function useSocket(): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket: Socket = io(process.env.NEXT_PUBLIC_BACKEND_URL!, {
      withCredentials: true,
    });

    newSocket.on('connect_error', (err) => console.error('Socket error:', err));
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return socket;
}