// Why: Main dashboard showing online users and handling calls. Integrates socket for presence and push setup.
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
}

interface ActiveCall {
  peerId: string;
  callId: string;
  isCaller: boolean;
}

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const socket = useSocket();
  const [onlineUsers, setOnlineUsers] = useState<{ userId: string; name: string }[]>([]);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [isCalling, setIsCalling] = useState<boolean>(false);
  const [calleeIdForCancel, setCalleeIdForCancel] = useState<string | null>(null);
  const { localStream, remoteStream, peerConnection, createOffer, createAnswer, addIceCandidate, cleanup } = useWebRTC(socket);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (previewVideoRef.current && localStream && !activeCall) {
      previewVideoRef.current.srcObject = localStream;
    }
  }, [localStream, activeCall]);

  useEffect(() => {
    if (!user || !socket) return;

    // ... setupPush omitted ...
    // Setup push notifications - Why: Request permission and subscribe on load. Essential for offline notifications. Mobile web limitations: Push works on Android Chrome, but iOS Safari has limited support (no push on iOS web until iOS 16.4+ with caveats).
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

    // Socket listeners
    socket.on('online-users', (users: { userId: string; name: string }[]) => setOnlineUsers(users));

    socket.on('incoming-call', (data: IncomingCall) => {
      setIncomingCall(data);
      // Play ringing sound - Why: User-interaction compliant. Assume prior interaction; on mobile web, browsers block autoplay without interaction.
      const audio = new Audio('/ringtone.mp3'); // Add your ringtone file
      audio.play().catch(() => console.log('Ringing blocked; needs interaction'));
    });
    
    socket.on('call-cancelled', () => {
        setIncomingCall(null);
        // Optional: Stop ringtone if playing loop
    });

    socket.on('call-accepted', ({ calleeId, callId }: { calleeId: string; callId: string }) => {
      setIsCalling(false); // Stop "Calling..." UI
      setCalleeIdForCancel(null);
      setActiveCall({ peerId: calleeId, callId, isCaller: true });
      createOffer(calleeId); // Start WebRTC as caller
    });

    socket.on('call-rejected', () => {
      setIsCalling(false); // Stop "Calling..." UI
      alert('Call rejected');
    });

    socket.on('offer', ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
      createAnswer(from, offer);
    });

    socket.on('answer', ({ answer }: { answer: RTCSessionDescriptionInit; from: string }) => {
      if (peerConnection) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on('ice-candidate', ({ candidate }: { candidate: RTCIceCandidateInit; from: string }) => {
      addIceCandidate(candidate);
    });

    socket.on('call-ended', () => {
      setIsCalling(false); // Reset calling state just in case
      cleanup();
    });

    return () => {
      socket.off('online-users');
      // ... cleanup omitted ...
      socket.off('incoming-call');
      socket.off('call-cancelled');
      socket.off('call-accepted');
      socket.off('call-rejected');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('call-ended');
    };
  }, [user, socket, peerConnection, createOffer, createAnswer, addIceCandidate, cleanup]);

  const handleCall = (calleeId: string) => {
    if (!socket) return;
    setIsCalling(true);
    setCalleeIdForCancel(calleeId);
    socket.emit('initiate-call', { calleeId });
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
    socket.emit('accept-call', { callId: incomingCall.callId, callerId: incomingCall.callerId });
    setActiveCall({ peerId: incomingCall.callerId, callId: incomingCall.callId, isCaller: false });
    setIncomingCall(null);
    // Note: On mobile web, no auto-answer; user must manually accept via UI.
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
        {/* Left Column: Local Preview */}
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

        {/* Right Column: Online Users */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Online Users</h2>
            <div className="space-y-2">
              <OnlineUsers users={onlineUsers.filter(u => u.userId !== user._id)} onCall={handleCall} />
            </div>
        </div>
      </div>

      {incomingCall && <CallModal callerName={incomingCall.callerName} onAccept={acceptCall} onReject={rejectCall} />}
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
      {activeCall && <VideoCall localStream={localStream} remoteStream={remoteStream} onEnd={endCall} />}
    </div>
  );
}

// Utility for VAPID key
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