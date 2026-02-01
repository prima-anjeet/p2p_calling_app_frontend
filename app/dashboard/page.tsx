'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import useAuth from '../hooks/useAuth';
import useSocket from '../hooks/useSocket';
import OnlineUsers from '../components/OnlineUsers';
import CallModal from '../components/CallModal';
import VideoCall from '../components/VideoCall';
import useWebRTC from '../hooks/useWebRTC';

interface IncomingCall {
  callerId: string;
  callerName: string;
  callId: string;
  callType?: 'audio' | 'video';
}

interface ActiveCall {
  peerId: string;
  callId: string;
  isCaller: boolean;
  callType: 'audio' | 'video';
}

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const socket = useSocket();
  const [allUsers, setAllUsers] = useState<{ _id: string; name: string; email: string }[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [isCalling, setIsCalling] = useState<boolean>(false);
  const [calleeIdForCancel, setCalleeIdForCancel] = useState<string | null>(null);
  const { localStream, remoteStream, createOffer, createAnswer, addIceCandidate, handleAnswer, cleanup, startLocalStream } = useWebRTC(socket);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!user) return;
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users`, {
          credentials: 'include',
        });
        if (res.ok) {
          setAllUsers(await res.json());
        }
      } catch (err) {
        console.error('Failed to fetch users', err);
      }
    };
    fetchUsers();
  }, [user]);

  useEffect(() => {
    if (previewVideoRef.current && localStream && !activeCall) {
      previewVideoRef.current.srcObject = localStream;
    }
  }, [localStream, activeCall]);

  useEffect(() => {
    if (!user || !socket) return;
    const setupPush = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as unknown as BufferSource
            });
            socket.emit('subscribe-push', subscription);
          }
        } catch (err) {
          console.error('Push setup error:', err);
        }
      }
    };
    setupPush();
    socket.on('online-users', (users: { userId: string; name: string }[]) => {
      setOnlineUserIds(new Set(users.map(u => u.userId)));
    });

    socket.on('incoming-call', (data: IncomingCall) => {
      setIncomingCall(data);
    });

    const timer = setTimeout(() => {
        socket.emit('check-pending-calls');
    }, 1000);
    
    socket.on('call-cancelled', () => {
        setIncomingCall(null);

    });

    socket.on('call-accepted', ({ calleeId, callId, callType }: { calleeId: string; callId: string; callType?: 'audio'|'video' }) => {
      setIsCalling(false); 
      setCalleeIdForCancel(null);
      setActiveCall({ peerId: calleeId, callId, isCaller: true, callType: callType || 'video' });
      createOffer(calleeId);
    });

    socket.on('call-rejected', () => {
      setIsCalling(false); 
      alert('Call rejected');
    });

    socket.on('offer', ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
      createAnswer(from, offer);
    });

    socket.on('answer', ({ answer }: { answer: RTCSessionDescriptionInit; from: string }) => {
      handleAnswer(answer);
    });

    socket.on('ice-candidate', ({ candidate }: { candidate: RTCIceCandidateInit; from: string }) => {
      addIceCandidate(candidate);
    });

    socket.on('call-ended', () => {
      setIsCalling(false); 
      cleanup();
      setActiveCall(null);
    });

    return () => {
      clearTimeout(timer);
      socket.off('online-users');
      socket.off('incoming-call');
      socket.off('call-cancelled');
      socket.off('call-accepted');
      socket.off('call-rejected');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('call-ended');
    };
  }, [user, socket, createOffer, createAnswer, addIceCandidate, handleAnswer, cleanup]);

  const handleCall = (calleeId: string, callType: 'audio' | 'video') => {
    if (!socket) return;
    startLocalStream(callType);
    setIsCalling(true);
    setCalleeIdForCancel(calleeId);
    socket.emit('initiate-call', { calleeId, callType });
  };

  const cancelCall = () => {
      if (!socket || !calleeIdForCancel) {
          setIsCalling(false);
          return;
      }
      socket.emit('cancel-call', { calleeId: calleeIdForCancel });
      setIsCalling(false);
      setCalleeIdForCancel(null);
  };

  const acceptCall = () => {
    if (!incomingCall || !socket) return;
    const type = incomingCall.callType || 'video';
    startLocalStream(type);
    
    socket.emit('accept-call', { callId: incomingCall.callId, callerId: incomingCall.callerId });
    setActiveCall({ peerId: incomingCall.callerId, callId: incomingCall.callId, isCaller: false, callType: type });
    setIncomingCall(null);
  };

  const rejectCall = () => {
    if (!incomingCall || !socket) return;
    socket.emit('reject-call', { callId: incomingCall.callId, callerId: incomingCall.callerId });
    setIncomingCall(null);
  };

  const endCall = () => {
    if (!activeCall || !socket) return;
    socket.emit('end-call', { peerId: activeCall.peerId, callId: activeCall.callId });
    cleanup();
    setActiveCall(null);
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) return <div className="flex items-center justify-center min-h-screen bg-gray-50">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 font-sans">
      <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Hello, {user.email?.split('@')[0]}
          </h1>
          <button 
            onClick={logout} 
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
          >
            Logout
          </button>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
      
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
               <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
                 <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span> 
                 Camera Preview
               </h2>
               <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden relative group shadow-inner">
                  {localStream ? (
                      <video 
                        ref={previewVideoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover transform scale-x-[-1]" 
                      />
                  ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                          <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
                          <span className="text-sm">Initializing Camera...</span>
                      </div>
                  )}
                  <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-medium border border-white/10">
                      You
                  </div>
               </div>
               <p className="mt-4 text-sm text-gray-500">
                 Ready to call. Select a user from the list to start a video chat.
               </p>
            </div>
        </div>

      
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Contacts</h2>
            <div className="space-y-2">
              <OnlineUsers 
                users={allUsers.map(u => ({
                  userId: u._id,
                  name: u.name,
                  email: u.email,
                  isOnline: onlineUserIds.has(u._id)
                }))} 
                onCall={handleCall} 
              />
            </div>
        </div>
      </div>

      {incomingCall && <CallModal callerName={incomingCall.callerName} callType={incomingCall.callType} onAccept={acceptCall} onReject={rejectCall} />}
      {isCalling && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
             <div className="text-center">
                 <div className="w-24 h-24 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse shadow-[0_0_30px_rgba(99,102,241,0.5)]">
                    <span className="text-4xl">📞</span>
                 </div>
                 <h2 className="text-2xl font-bold text-white mb-2">Calling...</h2>
                 <p className="text-indigo-200">Waiting for response</p>
                 <button 
                  onClick={cancelCall}
                  className="mt-8 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors font-medium shadow-lg"
                 >
                   Cancel Call
                 </button>
             </div>
          </div>
      )}
      {activeCall && <VideoCall localStream={localStream} remoteStream={remoteStream} onEnd={endCall} callType={activeCall.callType} />}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}