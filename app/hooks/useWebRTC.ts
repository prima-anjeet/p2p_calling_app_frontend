
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface WebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  createOffer: (to: string) => Promise<void>;
  createAnswer: (from: string, offer: RTCSessionDescriptionInit) => Promise<void>;
  addIceCandidate: (candidate: RTCIceCandidateInit) => void;
  handleAnswer: (answer: RTCSessionDescriptionInit) => Promise<void>;
  cleanup: () => void;
  startLocalStream: (type: 'audio' | 'video') => Promise<void>;
}

const useWebRTC = (socket: Socket | null): WebRTCReturn => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remotePeerIdRef = useRef<string | null>(null);
 
  const streamTypeRef = useRef<'audio' | 'video'>('video');

  const localStreamRef = useRef<MediaStream | null>(null);

  const startLocalStream = useCallback(async (type: 'audio' | 'video') => {
    if (typeof window !== 'undefined' && (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)) {
      console.error("Media devices API not supported.");
      return;
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: type === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      localStreamRef.current = stream; // Update ref
      streamTypeRef.current = type;
      
    } catch (error) {
       console.error("Error accessing media devices:", error);
    }
  }, []);

  useEffect(() => {
    // Initialize remoteStream on client side
    setRemoteStream(new MediaStream());
    
    // Default to video preview on mount
    startLocalStream('video');

    return () => cleanup();
  }, [startLocalStream]);

  const createPeerConnection = useCallback((): RTCPeerConnection => {
    // RTCPeerConnection setup
    const iceServers: RTCIceServer[] = JSON.parse(process.env.NEXT_PUBLIC_ICE_SERVERS!);
    const pc = new RTCPeerConnection({ iceServers });


    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        if (localStreamRef.current) {
             pc.addTrack(track, localStreamRef.current);
        }
      });
    }

    // Handle remote tracks
    pc.ontrack = (event) => {
      setRemoteStream(prevStream => {
           let newStream;
           if (event.streams && event.streams[0]) {
               newStream = new MediaStream(event.streams[0].getTracks());
           } else {
               const tracks = prevStream ? prevStream.getTracks() : [];
               newStream = new MediaStream(tracks);
               newStream.addTrack(event.track);
           }
           return newStream;
      });
    };


    pc.onicecandidate = (event) => {
      if (event.candidate && socket && remotePeerIdRef.current) {
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          to: remotePeerIdRef.current,
        });
      }
    };

  
    pc.getSenders().forEach(sender => {
      if (sender.track?.kind === 'video') {
        const params = sender.getParameters();
        if (params.encodings) {
          params.encodings[0].maxBitrate = 1000000; // Example: 1Mbps initial
        }
        sender.setParameters(params);
      }
    });

    peerConnectionRef.current = pc;
    return pc;
  }, [socket]);

  const createOffer = useCallback(async (to: string) => {
    remotePeerIdRef.current = to;
    const pc = createPeerConnection();
    
    if (localStreamRef.current && pc.getSenders().length === 0) {
       localStreamRef.current.getTracks().forEach(track => {
            if (localStreamRef.current) pc.addTrack(track, localStreamRef.current)
       });
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    if (socket) socket.emit('offer', { offer, to });
  }, [socket, createPeerConnection]);

  const createAnswer = useCallback(async (from: string, offer: RTCSessionDescriptionInit) => {
    remotePeerIdRef.current = from;
    const pc = createPeerConnection();

    // Ensure tracks are added for answer too - Use REF
    if (localStreamRef.current && pc.getSenders().length === 0) {
       localStreamRef.current.getTracks().forEach(track => {
            if (localStreamRef.current) pc.addTrack(track, localStreamRef.current);
       });
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    if (socket) socket.emit('answer', { answer, to: from });
  }, [socket, createPeerConnection]);

  const addIceCandidate = useCallback((candidate: RTCIceCandidateInit) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
     if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
     }
  }, []);

  const cleanup = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setRemoteStream(new MediaStream());
  }, []);

  // Handle unload - Why: Cleanup on tab close/refresh.
  useEffect(() => {
    return () => {
      // Full cleanup on unmount
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  return { 
    localStream, 
    remoteStream, 
    peerConnection: peerConnectionRef.current, 
    createOffer, 
    createAnswer, 
    addIceCandidate, 
    handleAnswer,
    cleanup,
    startLocalStream
  };
};

export default useWebRTC;