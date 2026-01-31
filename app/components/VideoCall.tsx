'use client';
import { useEffect, useRef, useState } from 'react';

interface VideoCallProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEnd: () => void;
  callType?: 'audio' | 'video';
}

export default function VideoCall({ localStream, remoteStream, onEnd, callType = 'video' }: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState<boolean>(false);
  const [cameraOff, setCameraOff] = useState<boolean>(false);
  const [speakerOn, setSpeakerOn] = useState<boolean>(true);
  const [timer, setTimer] = useState<number>(0);

  const isAudioOnly = callType === 'audio';

  useEffect(() => {
    if (localVideoRef.current && localStream && !isAudioOnly) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(e => console.error("Local play error", e));
    }
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      // Why: Explicit play to bypass some autoplay restrictions often requiring user interaction which we have via buttons
      remoteVideoRef.current.play().catch(e => console.log("Autoplay blocked, waiting for interaction", e));
    }

    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [localStream, remoteStream, isAudioOnly]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = muted;
      });
      setMuted(!muted);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const newCameraOff = !cameraOff;
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !newCameraOff;
      });
      setCameraOff(newCameraOff);
    }
  };

  const toggleSpeaker = () => {
    if (remoteVideoRef.current) {
        // If speaker is ON, we want to mute (muted = true).
        // If speaker is OFF, we want to unmute (muted = false).
        remoteVideoRef.current.muted = speakerOn;
        setSpeakerOn(!speakerOn);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      {/* Main Container */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        
        {/* Remote Video / Audio UI */}
        {isAudioOnly ? (
             <div className="flex flex-col items-center justify-center p-8 animate-pulse text-center">
                <div className="w-32 h-32 md:w-48 md:h-48 bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-2xl border-4 border-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 md:w-24 md:h-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-200">Connected</h3>
                {/* Hidden video element to ensure audio plays */}
                <video ref={remoteVideoRef} autoPlay playsInline className="absolute w-0 h-0 opacity-0 pointer-events-none" />
             </div>
        ) : (
             <video 
               ref={remoteVideoRef} 
               autoPlay 
               playsInline 
               className="w-full h-full object-cover"
             />
        )}

        {/* Local Video (PIP) */}
        {!isAudioOnly && (
            <div className="absolute bottom-24 right-4 w-32 md:w-48 aspect-video bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700 shadow-xl z-20">
            <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover transform scale-x-[-1] ${cameraOff ? 'opacity-0' : 'opacity-100'}`}
            />
            {cameraOff && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium">
                Camera Off
                </div>
            )}
            <div className="absolute bottom-1 left-2 text-[10px] text-white/70 bg-black/30 px-1 rounded">You</div>
            </div>
        )}

        {/* Call Status / Timer */}
        <div className="absolute top-4 left-4 bg-black/40 px-3 py-1.5 rounded-full text-white text-sm backdrop-blur-sm border border-white/10 z-20">
           <span className="flex items-center gap-2">
             <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
             {formatTime(timer)}
           </span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="h-24 bg-gray-900 border-t border-gray-800 flex items-center justify-center gap-4 md:gap-8 px-4 pb-4 md:pb-0 z-30">
        
        {/* Toggle Mute */}
        <button 
          onClick={toggleMute}
          className={`p-4 rounded-full transition-all duration-200 ${muted ? 'bg-red-500/20 text-red-500' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
          title={muted ? "Unmute Mic" : "Mute Mic"}
        >
          {muted ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
          )}
        </button>

        {/* Toggle Camera - Hide for audio-only */}
        {!isAudioOnly && (
            <button 
            onClick={toggleCamera}
            className={`p-4 rounded-full transition-all duration-200 ${cameraOff ? 'bg-red-500/20 text-red-500' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
            title={cameraOff ? "Turn Camera On" : "Turn Camera Off"}
            >
            {cameraOff ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M21 21l-3.5-3.5m-2-2l-2-2"></path><path d="M7 7l-2-2"></path><path d="M22 17v-8l-5-4v2.5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h7"></path></svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
            )}
            </button>
        )}

        {/* Toggle Speaker (Audio) */}
        <button 
          onClick={toggleSpeaker}
          className={`p-4 rounded-full transition-all duration-200 ${!speakerOn ? 'bg-red-500/20 text-red-500' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
          title={speakerOn ? "Mute Speaker" : "Unmute Speaker"}
        >
          {speakerOn ? (
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
          ) : (
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
          )}
        </button>

        {/* End Call */}
        <button 
          onClick={onEnd}
          className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all duration-200 shadow-xl hover:scale-105"
          title="End Call"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="23" y1="1" x2="1" y2="23"></line></svg>
        </button>
      </div>
    </div>
  );
}