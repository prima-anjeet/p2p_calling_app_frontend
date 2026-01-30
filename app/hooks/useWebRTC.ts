// Why: Hook for WebRTC logic. Handles peer connection, media streams, offer/answer, ICE. Full cleanup on end. Optimized constraints for no lag: Audio with noise suppression, video adaptive to 720p/30fps. Mobile limitations: Handles CPU/network by using lower bitrate initially; browsers auto-adapt.

'use client';

import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

interface WebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  createOffer: (to: string) => Promise<void>;
  createAnswer: (from: string, offer: RTCSessionDescriptionInit) => Promise<void>;
  addIceCandidate: (candidate: RTCIceCandidateInit) => void;
  cleanup: () => void;
}

export default function useWebRTC(socket: Socket | null): WebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remotePeerIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Initialize remoteStream on client side
    setRemoteStream(new MediaStream());

    // Get media - Why: Access camera/mic with optimized constraints. Audio-first with echo/noise suppression. Video adaptive for mobile CPU/network.
    const getMedia = async () => {
      if (typeof window !== 'undefined' && (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)) {
        console.error("Media devices API not supported. Use HTTPS or localhost.");
        return;
      }
      try {
        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setLocalStream(stream);
      } catch (error) {
         console.error("Error accessing media devices:", error);
      }
    };
    getMedia();

    return () => cleanup();
  }, []);

  const createPeerConnection = (): RTCPeerConnection => {
    // RTCPeerConnection setup - Why: Core WebRTC object for P2P connection. Uses STUN/TURN for NAT traversal. Ensures DTLS-SRTP encryption (built-in). Media flows P2P only after negotiation.
    const iceServers: RTCIceServer[] = JSON.parse(process.env.NEXT_PUBLIC_ICE_SERVERS!);
    const pc = new RTCPeerConnection({ iceServers });

    // Add local tracks
    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    // Handle remote tracks
    pc.ontrack = (event) => {
      // Why: Robust track handling. Checks for existing stream (WebRTC standard) 
      // AND handles fallback by accumulating tracks manually to ensure both audio/video exist.
      setRemoteStream(prevStream => {
           let newStream;
           if (event.streams && event.streams[0]) {
               // Use the browser-provided stream which should contain all tracks
               newStream = new MediaStream(event.streams[0].getTracks());
           } else {
               // Fallback: Create new stream from previous tracks + new track
               // Handle case where prevStream might be null (though unlikely in this flow given calling context, but good for safety)
               const tracks = prevStream ? prevStream.getTracks() : [];
               newStream = new MediaStream(tracks);
               newStream.addTrack(event.track);
           }
           return newStream;
      });
    };

    // ICE candidate - Why: Exchange via socket for connectivity.
    pc.onicecandidate = (event) => {
      if (event.candidate && socket && remotePeerIdRef.current) {
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          to: remotePeerIdRef.current,
        });
      }
    };

    // Network-aware bitrate - Why: For adaptive quality, no lag. Set initial bitrate; browsers handle adaptation.
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
  };

  const createOffer = async (to: string) => {
    remotePeerIdRef.current = to;
    const pc = createPeerConnection();
    
    // Safety check: if localStream isn't ready, we shouldn't create offer yet?
    // Actually, createPeerConnection attaches tracks IF localStream exists.
    // If it doesn't (race condition), we send an offer with no tracks.
    // Solution: If localStream is available, explicit ensure tracks are added.
    if (localStream && pc.getSenders().length === 0) {
       localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    if (socket) socket.emit('offer', { offer, to });
  };

  const createAnswer = async (from: string, offer: RTCSessionDescriptionInit) => {
    remotePeerIdRef.current = from;
    const pc = createPeerConnection();

    // Ensure tracks are added for answer too
    if (localStream && pc.getSenders().length === 0) {
       localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    if (socket) socket.emit('answer', { answer, to: from });
  };

  const addIceCandidate = (candidate: RTCIceCandidateInit) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const cleanup = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setRemoteStream(new MediaStream());
  };

  // Handle unload - Why: Cleanup on tab close/refresh.
  useEffect(() => {
    return () => {
      // Full cleanup on unmount
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [localStream]);

  return { localStream, remoteStream, peerConnection: peerConnectionRef.current, createOffer, createAnswer, addIceCandidate, cleanup };
}