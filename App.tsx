import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  setDoc,
  query, 
  orderBy, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { 
  Settings, 
  Plus, 
  Trash2, 
  MoveUp, 
  MoveDown, 
  Play, 
  Monitor, 
  Cpu, 
  Wifi, 
  Activity, 
  Terminal,
  Lock,
  Volume2,
  VolumeX,
  AlertTriangle,
  SkipForward,
  Bot,
  RotateCcw,
  AudioWaveform,
  Disc,
  Image as ImageIcon,
  Film,
  FileAudio,
  Repeat,
  Shuffle,
  TouchpadOff
} from 'lucide-react';

// --- TYPE DECLARATIONS ---
declare global {
  interface Window {
    __firebase_config?: string;
    __app_id?: string;
    __initial_auth_token?: string;
  }
}

// --- TYPES ---
type MediaType = 'image' | 'video' | 'audio' | 'gif';

interface MediaItem {
  id: string;
  url: string;
  type: MediaType;
  duration: number;
  order: number;
}

interface AppSettings {
  marqueeText: string;
  logoUrl: string;
  audioUrl: string;
  audioUrl2?: string;
  audioUrl3?: string;
}

// --- CONFIG & INIT ---
const firebaseConfig = typeof window !== 'undefined' && window.__firebase_config 
  ? JSON.parse(window.__firebase_config) 
  : {};

// Fallback for dev/demo without valid firebase config
const isFirebaseConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "AIzaSyDummyKeyForDevOnly";

let app, auth, db;
if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

const appId = typeof window !== 'undefined' && window.__app_id ? window.__app_id : 'ces-2026-demo';
const FALLBACK_URL = "https://dummyimage.com/1920x1080/000/00ff41.png&text=SIGNAL+LOST";

// --- HOOKS ---
const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      // Mock auth for demo mode
      setUser({ uid: 'offline-demo-user' });
      setLoading(false);
      return;
    }

    const init = async () => {
      try {
        if (typeof window.__initial_auth_token !== 'undefined' && window.__initial_auth_token) {
          await signInWithCustomToken(auth, window.__initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.warn("Auth failed, falling back to offline mode", e);
        setUser({ uid: 'offline-fallback' });
      }
    };
    init();
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  return { user, loading };
};

// Hybrid Data Hook: Uses Firestore if available, else localStorage
const useCESData = (user: any) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    marqueeText: 'PRESENTED BY BE UNIQUE EXHIBITS',
    logoUrl: '',
    audioUrl: '',
    audioUrl2: '',
    audioUrl3: ''
  });
  const [loading, setLoading] = useState(true);

  // Local Storage Keys
  const LS_MEDIA_KEY = `ces_media_${appId}`;
  const LS_SETTINGS_KEY = `ces_settings_${appId}`;

  const loadLocalData = () => {
    const savedMedia = localStorage.getItem(LS_MEDIA_KEY);
    const savedSettings = localStorage.getItem(LS_SETTINGS_KEY);
    if (savedMedia) setMedia(JSON.parse(savedMedia));
    if (savedSettings) setSettings(JSON.parse(savedSettings));
    setLoading(false);
  };

  const saveLocalMedia = (newMedia: MediaItem[]) => {
    localStorage.setItem(LS_MEDIA_KEY, JSON.stringify(newMedia));
    setMedia(newMedia);
  };

  const saveLocalSettings = (newSettings: AppSettings) => {
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(newSettings));
    setSettings(newSettings);
  };

  useEffect(() => {
    if (!user) return;

    if (!isFirebaseConfigured) {
      loadLocalData();
      return;
    }

    // Firestore Listeners
    const mediaQuery = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'media'), 
      orderBy('order', 'asc')
    );
    
    const unsubMedia = onSnapshot(mediaQuery, (snapshot) => {
      setMedia(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MediaItem)));
      setLoading(false);
    }, (err) => {
      console.warn("Firestore media connect failed, using local", err);
      loadLocalData();
    });

    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config');
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(prev => ({ ...prev, ...docSnap.data() } as AppSettings));
      }
    }, (err) => console.warn("Firestore settings connect failed", err));

    return () => {
      unsubMedia();
      unsubSettings();
    };
  }, [user]);

  // ACTIONS
  const actions = {
    addMedia: async (url: string, type: MediaType, duration: number) => {
      const newItem = {
        url, type, duration,
        order: media.length,
        createdAt: new Date().toISOString() // Serializable for LS
      };

      if (isFirebaseConfigured) {
        try {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'media'), {
            ...newItem,
            createdAt: serverTimestamp()
          });
          return;
        } catch (e) { console.error("Firestore add failed", e); }
      }
      // Fallback
      const itemWithId = { ...newItem, id: `local_${Date.now()}` };
      saveLocalMedia([...media, itemWithId]);
    },

    updateSettings: async (newSettings: AppSettings) => {
      if (isFirebaseConfigured) {
        try {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), newSettings, { merge: true });
          return;
        } catch (e) { console.error("Firestore settings save failed", e); }
      }
      saveLocalSettings(newSettings);
    },

    deleteMedia: async (id: string) => {
      if (isFirebaseConfigured && !id.startsWith('local_')) {
        try {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'media', id));
          return;
        } catch(e) {}
      }
      saveLocalMedia(media.filter(m => m.id !== id));
    },

    reorderMedia: async (index: number, direction: 'up' | 'down') => {
      if ((direction === 'up' && index === 0) || (direction === 'down' && index === media.length - 1)) return;
      
      const newMedia = [...media];
      const swapIdx = direction === 'up' ? index - 1 : index + 1;
      
      // Swap order values locally first for UI snap
      const tempOrder = newMedia[index].order;
      newMedia[index].order = newMedia[swapIdx].order;
      newMedia[swapIdx].order = tempOrder;
      
      // Swap positions in array
      [newMedia[index], newMedia[swapIdx]] = [newMedia[swapIdx], newMedia[index]];

      if (isFirebaseConfigured && !newMedia[0].id.startsWith('local_')) {
        try {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'media', newMedia[index].id), { order: newMedia[index].order });
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'media', newMedia[swapIdx].id), { order: newMedia[swapIdx].order });
        } catch(e) {}
      } else {
        saveLocalMedia(newMedia);
      }
    },

    clearAllMedia: async () => {
      if (isFirebaseConfigured) {
         const batch = writeBatch(db);
         media.forEach(m => {
           if (!m.id.startsWith('local_')) {
             batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'media', m.id));
           }
         });
         await batch.commit();
      }
      saveLocalMedia([]);
    },

    resetSettings: async () => {
       const defaults = {
        marqueeText: 'PRESENTED BY BE UNIQUE EXHIBITS',
        logoUrl: '',
        audioUrl: '',
        audioUrl2: '',
        audioUrl3: ''
      };
      actions.updateSettings(defaults);
    }
  };

  return { media, settings, loading, actions };
};

// --- VISUAL COMPONENTS ---

const GlitchOverlay = () => (
  <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden mix-blend-hard-light opacity-20">
    <div className="w-full h-full animate-glitch-1 bg-green-500/10 absolute top-0 left-0"></div>
    <div className="w-full h-full animate-glitch-2 bg-green-300/10 absolute top-0 left-2"></div>
  </div>
);

const SlotText = ({ text }: { text: string }) => {
  const [display, setDisplay] = useState(text);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@%&";

  useEffect(() => {
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplay(prev => 
        text.split("").map((char, index) => {
          if (index < iteration) {
            return text[index];
          }
          return chars[Math.floor(Math.random() * chars.length)];
        }).join("")
      );
      
      if (iteration >= text.length) {
        clearInterval(interval);
      }
      
      iteration += 1/3; // Slower speed for more visible effect
    }, 40);
    
    return () => clearInterval(interval);
  }, [text]);

  return <span>{display}</span>;
};

const HoloFrame = ({ children, onInteract }: { children?: React.ReactNode, onInteract?: () => void }) => {
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = (e: React.WheelEvent) => {
    // Zoom limits: 0.8x to 1.2x
    const delta = -Math.sign(e.deltaY) * 0.05;
    setScale(s => Math.min(Math.max(s + delta, 0.8), 1.2));
  };

  return (
    <div 
      ref={containerRef}
      onWheel={handleWheel}
      onTouchStart={onInteract}
      className="relative w-full h-full overflow-hidden bg-black font-mono perspective-1000 cursor-crosshair"
      style={{ touchAction: 'none' }} // Prevent mobile scroll interference
    >
      <GlitchOverlay />
      <div className="absolute inset-0 z-20 pointer-events-none bg-[linear-gradient(rgba(0,20,0,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(0,255,0,0.03),rgba(0,255,0,0.01),rgba(0,255,0,0.03))] bg-[length:100%_4px,3px_100%] animate-scanlines" />
      <div className="absolute inset-0 z-30 pointer-events-none animate-holo-pulse" />
      <div className="absolute top-0 left-0 w-full h-1 bg-green-500 shadow-[0_0_20px_#22c55e] z-40" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-green-500 shadow-[0_0_20px_#22c55e] z-40" />
      <div 
        className="w-full h-full preserve-3d transition-transform duration-200 ease-out will-change-transform"
        style={{ transform: `rotateX(0deg) rotateY(0deg) scale(${scale})` }}
      >
          {children}
      </div>
    </div>
  );
};

const BackgroundAudio = ({ 
  urls, 
  isMuted, 
  isShuffle,
  setAnalyser 
}: { 
  urls: string[], 
  isMuted: boolean, 
  isShuffle: boolean,
  setAnalyser: (a: AnalyserNode | null) => void 
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  // Play Next Logic
  const playNext = useCallback(() => {
    if (urls.length === 0) return;
    setCurrentTrackIndex(prev => {
      if (isShuffle) {
        // Random index
        let next = Math.floor(Math.random() * urls.length);
        // Avoid repeating the same track if possible, unless only 1 exists
        if (urls.length > 1 && next === prev) {
            next = (next + 1) % urls.length;
        }
        return next;
      } else {
        // Sequential
        return (prev + 1) % urls.length;
      }
    });
  }, [urls.length, isShuffle]);

  // Reset index if urls change significantly (cleanup)
  useEffect(() => {
     if (currentTrackIndex >= urls.length) setCurrentTrackIndex(0);
  }, [urls.length]);

  const currentUrl = urls[currentTrackIndex];

  useEffect(() => {
    if (!currentUrl) return;
    
    const initAudio = () => {
       if (!audioRef.current) {
         audioRef.current = new Audio();
         audioRef.current.crossOrigin = "anonymous";
         audioRef.current.loop = false; // Handle looping manually via onEnded for playlists
         audioRef.current.autoplay = true;
         
         // Attach end listener
         audioRef.current.addEventListener('ended', () => {
            playNext();
         });
       }
       
       // Only update src if changed to avoid reload
       if (audioRef.current.src !== currentUrl) {
         audioRef.current.src = currentUrl;
         audioRef.current.load();
         if (!isMuted) {
            const p = audioRef.current.play();
            if (p) p.catch(e => console.warn("Autoplay blocked", e));
         }
       }

       // Init Web Audio API
       if (!contextRef.current) {
         const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
         if (AudioContextClass) {
            contextRef.current = new AudioContext();
            analyserRef.current = contextRef.current.createAnalyser();
            analyserRef.current.fftSize = 2048;
            
            try {
              sourceRef.current = contextRef.current.createMediaElementSource(audioRef.current);
              sourceRef.current.connect(analyserRef.current);
              analyserRef.current.connect(contextRef.current.destination);
              setAnalyser(analyserRef.current);
            } catch (e) {
              console.log("Audio Graph Error", e);
            }
         }
       }
    };

    initAudio();

    const unlock = () => {
      if (contextRef.current?.state === 'suspended') {
        contextRef.current.resume();
      }
      if (audioRef.current && !isMuted && audioRef.current.paused) {
        audioRef.current.play().catch((e) => console.warn("Auto-play blocked:", e));
      }
    };
    
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);

    if (!isMuted && audioRef.current) {
      if (contextRef.current?.state === 'suspended') contextRef.current.resume();
      audioRef.current.play().catch(e => console.log("Audio Play Blocked", e));
    } else if (audioRef.current) {
      audioRef.current.pause();
    }

    return () => {
       window.removeEventListener('click', unlock);
       window.removeEventListener('touchstart', unlock);
    };
  }, [currentUrl, isMuted, setAnalyser, playNext]);

  return null; 
};

const TelemetrySidebar = ({ 
  isMuted, 
  toggleMute, 
  isShuffle,
  toggleShuffle,
  hasAudio, 
  nextItem 
}: { 
  isMuted: boolean, 
  toggleMute: () => void, 
  isShuffle: boolean, 
  toggleShuffle: () => void, 
  hasAudio: boolean, 
  nextItem?: MediaItem 
}) => {
  const [stats, setStats] = useState({ fps: 60, temp: 45, load: 12 });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        fps: 58 + Math.floor(Math.random() * 5),
        temp: 40 + Math.floor(Math.random() * 10),
        load: 10 + Math.floor(Math.random() * 20)
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const statBoxClass = "border-l-2 border-green-500/40 pl-2 hover-depth transition-all duration-300 hidden md:block hover:bg-green-900/20 hover:border-green-400 hover:shadow-[0_0_10px_rgba(34,197,94,0.2)] p-1 rounded-r-sm cursor-default";

  return (
    <div className="absolute right-4 top-4 bottom-4 w-32 z-40 flex flex-col justify-center gap-4 pointer-events-auto opacity-90 translate-z-20 transition-transform duration-500 md:translate-x-0 translate-x-full">
      
      <button 
        onClick={toggleMute}
        className={`border-l-2 pl-2 text-left transition-all duration-300 hover:bg-green-900/20 hover:border-green-400 hover:shadow-[0_0_10px_rgba(34,197,94,0.2)] hover-depth p-1 rounded-r-sm ${hasAudio && !isMuted ? 'border-green-500' : 'border-red-500/50 opacity-50'}`}
      >
        <div className={`text-[10px] mb-1 flex items-center gap-1 ${hasAudio && !isMuted ? 'text-green-500' : 'text-red-500'}`}>
          {hasAudio && !isMuted ? <Volume2 size={10}/> : <VolumeX size={10}/>} AUDIO_LINK
        </div>
        <div className={`text-lg font-bold tracking-widest animate-text-glitch ${hasAudio && !isMuted ? 'text-green-50' : 'text-red-500'}`}>
          {hasAudio && !isMuted ? 'ACTIVE' : 'MUTED'}
        </div>
      </button>

      <div className={statBoxClass}>
        <div className="text-[10px] text-green-500 mb-1 flex items-center gap-1 animate-text-glitch"><Wifi size={10}/> MATRIX_UPLINK</div>
        <div className="text-lg text-green-50 font-bold tracking-widest">CONNECTED</div>
      </div>
      <div className={statBoxClass}>
        <div className="text-[10px] text-green-500 mb-1 flex items-center gap-1 animate-text-glitch"><Activity size={10}/> FRAMERATE</div>
        <div className="text-lg text-green-50 font-bold tracking-widest">{stats.fps}</div>
      </div>
      <div className={statBoxClass}>
        <div className="text-[10px] text-green-500 mb-1 flex items-center gap-1 animate-text-glitch"><Cpu size={10}/> CORE_TEMP</div>
        <div className="text-lg text-green-50 font-bold tracking-widest">{stats.temp}°C</div>
      </div>

      {/* AUDIO CONTROL BUTTON */}
      <button
        onClick={toggleMute}
        className="border-l-2 border-green-500/40 pl-2 hover-depth transition-all duration-300 text-left group mt-2 hover:bg-green-900/20 hover:border-green-400 hover:shadow-[0_0_10px_rgba(34,197,94,0.2)] p-1 rounded-r-sm"
      >
        <div className="text-[10px] text-green-500 mb-1 flex items-center gap-1 animate-text-glitch">
            <Disc size={10} className={hasAudio && !isMuted ? "animate-spin" : ""}/> AUDIO_DECK
        </div>
        <div className={`text-lg font-bold tracking-widest transition-all ${hasAudio && !isMuted ? 'text-green-400' : 'text-white animate-pulse'}`}>
            {hasAudio && !isMuted ? '■ STOP' : '▶ PLAY'}
        </div>
      </button>

       {/* SHUFFLE CONTROL BUTTON */}
      <button
        onClick={toggleShuffle}
        className={`border-l-2 pl-2 hover-depth transition-all duration-300 text-left group mt-2 hover:bg-green-900/20 hover:border-green-400 hover:shadow-[0_0_10px_rgba(34,197,94,0.2)] p-1 rounded-r-sm ${isShuffle ? 'border-green-500' : 'border-green-500/30'}`}
      >
        <div className="text-[10px] text-green-500 mb-1 flex items-center gap-1 animate-text-glitch">
            <Shuffle size={10} className={isShuffle ? "text-green-400" : "text-green-800"}/> PLAY_MODE
        </div>
        <div className={`text-sm font-bold tracking-widest transition-all ${isShuffle ? 'text-green-400' : 'text-green-800'}`}>
            {isShuffle ? 'SHUFFLE' : 'SEQUENTIAL'}
        </div>
      </button>

      {/* UP NEXT THUMBNAIL */}
      <div className="mt-4 border-t border-green-900/50 pt-2 flex flex-col gap-1 hidden md:flex">
        <div className="text-[8px] text-green-500 tracking-widest uppercase animate-pulse">UP NEXT</div>
        <div className="w-24 h-16 bg-green-900/10 border border-green-500/30 overflow-hidden relative group hover-depth transition-transform duration-300 hover:border-green-400 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]">
           {nextItem ? (
             <>
               {/* Preview Content */}
               {(nextItem.type === 'image' || nextItem.type === 'gif') ? (
                 <img src={nextItem.url} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity grayscale hover:grayscale-0" alt="Next" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-green-600 bg-green-900/20">
                    {nextItem.type === 'video' ? <Film size={20} /> : <FileAudio size={20} />}
                 </div>
               )}
               
               {/* Type Badge */}
               <div className="absolute bottom-0 right-0 bg-green-900/80 text-[8px] text-green-400 px-1 font-bold border-tl border-green-500/50">
                 {nextItem.type.toUpperCase()}
               </div>
             </>
           ) : (
             <div className="w-full h-full flex items-center justify-center text-green-800/50 text-[8px]">
               <Repeat size={16} />
             </div>
           )}
        </div>
      </div>
      
      <div className="mt-auto text-[8px] text-green-800 leading-tight overflow-hidden h-20 flex flex-col-reverse font-mono pointer-events-none hidden md:flex">
        {Array.from({length: 12}).map((_, i) => (
          <div key={i} className="opacity-60">
            0x{Math.floor(Math.random()*16777215).toString(16).toUpperCase()} :: ACK
          </div>
        ))}
      </div>
    </div>
  );
};

const BookNowSidebar = () => (
  <div className="absolute left-4 top-4 bottom-4 w-24 z-40 flex flex-col justify-center items-center pointer-events-none translate-z-20 hidden md:flex">
    <div className="h-3/4 border-r-2 border-green-500/20 pr-4 flex flex-col items-center justify-center py-8 relative">
      {/* Decorative lines */}
      <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-green-500 to-transparent opacity-50"></div>
      
      <div className="flex-1 flex flex-col justify-center items-center gap-8">
        
        <div className="flex flex-col gap-0 animate-text-glitch">
           {['B','O','O','K'].map((l, i) => (
             <span key={`b-${i}`} className="text-5xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-white to-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)] leading-tight text-center transform hover:scale-110 transition-transform duration-300">{l}</span>
           ))}
           <div className="h-8"></div>
           {['N','O','W'].map((l, i) => (
             <span key={`n-${i}`} className="text-5xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-white to-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)] leading-tight text-center transform hover:scale-110 transition-transform duration-300">{l}</span>
           ))}
        </div>

      </div>

      <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-green-500 to-transparent opacity-50"></div>
    </div>
  </div>
);

const FullWidthVisualizer = ({ analyser }: { analyser: AnalyserNode | null }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !analyser) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    // Auto resize canvas to full width
    const resize = () => {
       if (canvas.parentElement) {
          canvas.width = canvas.parentElement.offsetWidth;
          canvas.height = canvas.parentElement.offsetHeight;
       }
    };
    
    // Throttle resize
    const onResize = () => {
        cancelAnimationFrame(animId);
        resize();
        draw();
    };

    resize();
    window.addEventListener('resize', onResize);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animId = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      // Trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#00ff41';
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#00ff41';
      ctx.beginPath();

      const sliceWidth = canvas.width * 1.0 / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    draw();
    return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', onResize);
    };
  }, [analyser]);

  return (
    <div className="w-full h-16 bg-black/50 border-t border-b border-green-900/30 relative z-30 shrink-0">
       <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

const Marquee = ({ text, logoUrl }: { text: string, logoUrl: string }) => (
  <div className="relative w-full z-40 h-16 bg-black/95 border-b border-green-900/60 flex items-center backdrop-blur-sm shrink-0 translate-z-10">
    <div className="w-24 h-full flex items-center justify-center border-r border-green-900/60 px-2 bg-green-950/20">
      {logoUrl ? (
        <img src={logoUrl} alt="Logo" className="max-h-10 object-contain drop-shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse hover:drop-shadow-[0_0_20px_rgba(34,197,94,0.8)] transition-all duration-500" />
      ) : (
        <div className="text-green-500 text-[10px] font-bold text-center border border-green-500/30 p-1">NO SIGNAL</div>
      )}
    </div>
    <div className="flex-1 overflow-hidden whitespace-nowrap relative mask-gradient">
      <div className="inline-block animate-marquee text-green-500 font-mono text-xl font-black tracking-[0.2em] uppercase drop-shadow-[0_0_5px_rgba(34,197,94,0.6)]">
        {text} &nbsp; /// &nbsp; {text} &nbsp; /// &nbsp; {text} &nbsp; /// &nbsp; {text}
      </div>
    </div>
    <div className="w-20 h-full bg-green-600 text-black flex items-center justify-center font-bold text-xs animate-pulse">
      ON AIR
    </div>
  </div>
);

const MatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
        if (canvas.parentElement) {
            canvas.width = canvas.parentElement.offsetWidth;
            canvas.height = canvas.parentElement.offsetHeight;
        }
    };
    
    // Throttle
    const onResize = () => {
        cancelAnimationFrame(animId);
        resize();
        draw(0);
    };

    resize();
    window.addEventListener('resize', onResize);

    const columns = Math.floor(canvas.width / 10);
    const drops: number[] = new Array(columns).fill(1);

    let lastTime = 0;
    const draw = (time: number) => {
        // Throttling for style
        if (time - lastTime < 33) { // ~30fps
             animId = requestAnimationFrame(draw);
             return;
        }
        lastTime = time;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#0F0';
        ctx.font = '10px monospace';

        // Pulse effect every ~3 seconds
        const isPulse = Math.floor(time / 3000) % 2 === 0 && (time % 3000) < 200;
        if (isPulse) ctx.fillStyle = '#AFA'; // Bright flash

        for (let i = 0; i < drops.length; i++) {
            const text = String.fromCharCode(0x30A0 + Math.random() * 96);
            ctx.fillText(text, i * 10, drops[i] * 10);

            if (drops[i] * 10 > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
        animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);
    return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', onResize);
    }
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-20 z-0 pointer-events-none mix-blend-screen" />;
};

const Countdown = () => {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const target = new Date('2026-01-06T09:00:00-08:00').getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = target - now;
      if (diff < 0) { clearInterval(interval); return; }
      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((diff % (1000 * 60)) / 1000),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full z-40 bg-black/90 border-t border-green-900/60 backdrop-blur-md shrink-0 relative shadow-[0_-5px_20px_rgba(34,197,94,0.1)] translate-z-30 overflow-hidden">
      <MatrixRain />
      
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-center py-6 px-8 gap-6 md:gap-0">
        
        {/* LEFT: CES HEADER */}
        <div className="flex items-center gap-6 hidden md:flex">
           <h2 className="text-6xl font-mono font-black text-green-500 drop-shadow-[4px_4px_0_rgba(0,50,0,1)] tracking-tighter animate-pulse">
             CES
           </h2>
           <div className="h-12 w-[2px] bg-green-800/50"></div>
           <div className="flex flex-col justify-center">
              <span className="font-display font-bold text-xl text-green-100 tracking-[0.2em] leading-none">
                <SlotText text="THE COOLEST" />
              </span>
              <span className="font-display font-bold text-xl text-green-600 tracking-[0.2em] leading-none">
                <SlotText text="TECH EXPO" />
              </span>
           </div>
        </div>

        {/* CENTER: TIMER + ROBOT HEAD + LOCATION */}
        <div className="flex gap-6 md:gap-12 items-end">
            {['DAYS', 'HRS', 'MIN', 'SEC'].map((label, i) => {
            const val = Object.values(timeLeft)[i];
            return (
                <div key={label} className="flex flex-col items-center group">
                <div className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-green-100 to-green-600 tabular-nums tracking-tighter drop-shadow-[0_0_15px_rgba(34,197,94,0.4)] group-hover:translate-y-[-2px] transition-transform">
                    {String(val).padStart(2, '0')}
                </div>
                <div className="text-green-600 text-[10px] font-bold tracking-[0.5em] border-t border-green-800/50 pt-1 mt-1 translate-z-10">{label}</div>
                </div>
            );
            })}
            
            {/* ROBOT HEAD: Centered between SECONDS and LOCATION */}
            <div className="animate-bounce flex flex-col items-center">
              <Bot size={96} className="text-green-500 animate-spin-y" />
            </div>
            
            {/* LOCATION INFO */}
            <div className="flex flex-col items-center text-center hidden md:flex">
              <div className="text-2xl font-mono font-bold text-green-50 tracking-widest">LAS VEGAS</div>
              <div className="text-green-600 text-xs font-mono tracking-[0.3em]">NV // 36.1716° N</div>
              <div className="text-green-400 text-[10px] font-mono tracking-[0.5em] mt-1 border-t border-green-900/50 pt-1 drop-shadow-[0_0_5px_rgba(74,222,128,0.8)] animate-pulse">COUNTDOWN</div>
            </div>
        </div>

      </div>
    </div>
  );
};

const IntroSequence = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setStep(1), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center text-green-500 font-mono cursor-pointer" onClick={onComplete}>
      <div className="max-w-lg w-full p-8 border border-green-900/50 bg-green-900/10 backdrop-blur relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-green-500/50 animate-scanlines"></div>
        
        <div className="text-center space-y-6 relative z-10">
           <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-green-300 to-green-800">
             CES 2026
           </h1>
           
           <div className="text-sm tracking-[0.5em] text-green-400/80">
             CONSUMER ELECTRONICS SHOW
           </div>

           <div className="h-px w-full bg-green-800/50 my-8"></div>

           <div className={`transition-opacity duration-1000 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`}>
              <button 
                className="px-8 py-3 bg-green-500 text-black font-bold tracking-widest hover:bg-green-400 transition-all shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_40px_rgba(34,197,94,0.6)] uppercase"
              >
                Initialize System
              </button>
           </div>
           
           <div className="mt-8 text-[10px] text-green-800 animate-pulse">
             SECURE CONNECTION REQUIRED // CLICK TO ENTER
           </div>
        </div>
      </div>
      <MatrixRain />
    </div>
  );
};

const MediaPlayer = ({ media, currentIndex, onNext }: { media: MediaItem[], currentIndex: number, onNext: () => void }) => {
  const item = media[currentIndex];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Reset load state when index changes
  useEffect(() => {
      setIsLoaded(false);
  }, [item]);

  useEffect(() => {
    if (!item) return;

    if (item.type === 'image' || item.type === 'gif') {
      const timer = setTimeout(() => {
        onNext();
      }, (item.duration || 5) * 1000);
      return () => clearTimeout(timer);
    } else if (item.type === 'video') {
       if (videoRef.current) {
           videoRef.current.currentTime = 0;
           videoRef.current.play().catch(e => console.warn("Video play failed", e));
       }
    }
  }, [item, onNext]);

  // Preload next item
  useEffect(() => {
    if (media.length > 1) {
        const nextItem = media[(currentIndex + 1) % media.length];
        if (nextItem.type === 'image' || nextItem.type === 'gif') {
            const img = new Image();
            img.src = nextItem.url;
        }
    }
  }, [currentIndex, media]);

  if (!item && media.length === 0) {
     return (
         <div className="w-full h-full flex flex-col items-center justify-center text-green-500/50 gap-4">
             <AlertTriangle size={48} />
             <div className="font-mono tracking-widest">NO MEDIA DATA</div>
             <div className="text-xs">UPLOAD CONTENT IN ADMIN PANEL</div>
         </div>
     );
  }

  if (!item) return null;

  return (
    <div className="w-full h-full bg-black relative group">
       {/* Media Content */}
       {(item.type === 'image' || item.type === 'gif') && (
         <img 
            src={item.url} 
            alt="Display" 
            className={`w-full h-full object-contain transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} 
            onLoad={() => setIsLoaded(true)}
            key={item.id} // Force remount for animation
         />
       )}
       
       {item.type === 'video' && (
         <video
            ref={videoRef}
            src={item.url}
            className={`w-full h-full object-contain transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            muted
            playsInline
            onEnded={onNext}
            onLoadedData={() => setIsLoaded(true)}
            key={item.id}
         />
       )}

       {/* Overlay Info */}
       <div className="absolute top-4 left-4 bg-black/50 backdrop-blur px-2 py-1 border-l-2 border-green-500 text-[10px] font-mono text-green-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
         ID: {item.id.slice(0,8).toUpperCase()} // TYPE: {item.type.toUpperCase()}
       </div>
    </div>
  );
};

const AdminDashboard = ({ 
  media, 
  settings, 
  user, 
  onExit, 
  actions 
}: { 
  media: MediaItem[], 
  settings: AppSettings, 
  user: any, 
  onExit: () => void, 
  actions: any 
}) => {
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<MediaType>('image');
  const [newDuration, setNewDuration] = useState(10);
  const [activeTab, setActiveTab] = useState<'media' | 'settings'>('media');
  
  // Settings State
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => { setLocalSettings(settings); }, [settings]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;
    await actions.addMedia(newUrl, newType, newDuration);
    setNewUrl('');
  };

  const handleSaveSettings = async () => {
      await actions.updateSettings(localSettings);
      alert("Settings Saved");
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-200 font-mono p-4 md:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-700">
          <div>
            <h1 className="text-2xl font-bold text-green-500 flex items-center gap-2"><Terminal size={24}/> CES CONTROL DECK</h1>
            <div className="text-xs text-zinc-500 mt-1">USER: {user?.uid || 'GHOST'} // MODE: ADMIN</div>
          </div>
          <button onClick={onExit} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-sm rounded flex items-center gap-2">
            <Monitor size={16} /> EXIT TO DISPLAY
          </button>
        </div>

        <div className="flex gap-4 mb-6">
           <button 
             onClick={() => setActiveTab('media')}
             className={`px-4 py-2 rounded ${activeTab === 'media' ? 'bg-green-600 text-black font-bold' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
           >
             MEDIA PLAYLIST
           </button>
           <button 
             onClick={() => setActiveTab('settings')}
             className={`px-4 py-2 rounded ${activeTab === 'settings' ? 'bg-green-600 text-black font-bold' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
           >
             GLOBAL SETTINGS
           </button>
        </div>

        {activeTab === 'media' && (
          <div className="grid md:grid-cols-3 gap-8">
             {/* Add Form */}
             <div className="md:col-span-1">
                <div className="bg-zinc-800 p-6 rounded-lg border border-zinc-700 sticky top-4">
                   <h3 className="text-green-400 font-bold mb-4 flex items-center gap-2">
                     <span className="animate-pulse">{'>'}</span> 
                     <Plus size={16}/> ADD ARTIFACT
                   </h3>
                   <form onSubmit={handleAdd} className="space-y-4">
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">MEDIA URL</label>
                        <input 
                          type="text" 
                          value={newUrl}
                          onChange={e => setNewUrl(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 p-2 text-sm rounded focus:border-green-500 focus:outline-none"
                          placeholder="https://..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1">TYPE</label>
                          <select 
                            value={newType}
                            onChange={e => setNewType(e.target.value as MediaType)}
                            className="w-full bg-zinc-900 border border-zinc-700 p-2 text-sm rounded focus:border-green-500 focus:outline-none"
                          >
                            <option value="image">IMAGE</option>
                            <option value="video">VIDEO</option>
                            <option value="gif">GIF</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1">DURATION (S)</label>
                          <input 
                            type="number" 
                            value={newDuration}
                            onChange={e => setNewDuration(Number(e.target.value))}
                            className="w-full bg-zinc-900 border border-zinc-700 p-2 text-sm rounded focus:border-green-500 focus:outline-none"
                            min={1}
                          />
                        </div>
                      </div>
                      <button type="submit" className="w-full bg-green-600 text-black font-bold py-2 rounded hover:bg-green-500 transition-colors">
                        ADD TO QUEUE
                      </button>
                   </form>
                </div>
             </div>

             {/* List */}
             <div className="md:col-span-2 space-y-2">
                <div className="flex justify-between items-center mb-2 text-xs text-zinc-500 px-2">
                  <span>QUEUE ORDER ({media.length})</span>
                  <button onClick={actions.clearAllMedia} className="text-red-500 hover:underline flex items-center gap-1"><Trash2 size={12}/> CLEAR ALL</button>
                </div>
                {media.map((item, idx) => (
                  <div key={item.id} className="bg-zinc-800/50 border border-zinc-700 p-3 rounded flex items-center gap-4 group hover:border-green-500 hover:bg-zinc-800 transition-all duration-200 hover:shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                     <div className="text-zinc-600 font-bold text-lg w-8 text-center group-hover:text-green-500 transition-colors">{idx + 1}</div>
                     <div className="w-16 h-10 bg-black rounded overflow-hidden shrink-0 relative group/thumb">
                        {item.type === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center text-zinc-500"><Film size={16}/></div>
                        ) : (
                          <img src={item.url} alt="thumb" className="w-full h-full object-cover" />
                        )}
                        {/* Hover Preview */}
                        {(item.type === 'image' || item.type === 'gif') && (
                           <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-48 h-auto z-50 hidden group-hover/thumb:block border-2 border-green-500 bg-black shadow-xl rounded overflow-hidden pointer-events-none">
                               <img src={item.url} alt="preview" className="w-full h-auto" />
                           </div>
                        )}
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="truncate text-sm text-zinc-300 group-hover:text-white transition-colors">{item.url}</div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase mt-1">
                          <span className="bg-zinc-900 px-1 rounded text-green-600/70 border border-green-900/30">{item.type}</span>
                          <span>{item.duration}s</span>
                        </div>
                     </div>
                     <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => actions.reorderMedia(idx, 'up')} disabled={idx === 0} className="p-1 hover:text-green-400 disabled:opacity-20 transition-colors"><MoveUp size={16}/></button>
                        <button onClick={() => actions.reorderMedia(idx, 'down')} disabled={idx === media.length-1} className="p-1 hover:text-green-400 disabled:opacity-20 transition-colors"><MoveDown size={16}/></button>
                        <button onClick={() => actions.deleteMedia(item.id)} className="p-1 hover:text-red-500 ml-2 transition-colors"><Trash2 size={16}/></button>
                     </div>
                  </div>
                ))}
                {media.length === 0 && (
                  <div className="text-center py-12 text-zinc-600 italic">
                    Playlist is empty. Add artifacts to begin.
                  </div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'settings' && (
           <div className="max-w-2xl">
             <div className="bg-zinc-800 p-6 rounded-lg border border-zinc-700 space-y-6">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">MARQUEE TEXT</label>
                  <input 
                    type="text" 
                    value={localSettings.marqueeText}
                    onChange={e => setLocalSettings({...localSettings, marqueeText: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-700 p-2 text-sm rounded focus:border-green-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">LOGO URL</label>
                  <input 
                    type="text" 
                    value={localSettings.logoUrl}
                    onChange={e => setLocalSettings({...localSettings, logoUrl: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-700 p-2 text-sm rounded focus:border-green-500 focus:outline-none"
                  />
                </div>
                
                <div className="pt-4 border-t border-zinc-700">
                   <h4 className="text-sm font-bold text-green-500 mb-4 flex items-center gap-2"><Disc size={16}/> AUDIO CHANNELS</h4>
                   <div className="space-y-4">
                      {[1, 2, 3].map((num) => {
                         const key = num === 1 ? 'audioUrl' : `audioUrl${num}`;
                         return (
                            <div key={num}>
                              <label className="block text-xs text-zinc-500 mb-1">CHANNEL {num} URL</label>
                              <input 
                                type="text" 
                                value={(localSettings as any)[key] || ''}
                                onChange={e => setLocalSettings({...localSettings, [key]: e.target.value})}
                                className="w-full bg-zinc-900 border border-zinc-700 p-2 text-sm rounded focus:border-green-500 focus:outline-none"
                                placeholder="https://... (mp3)"
                              />
                            </div>
                         );
                      })}
                   </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button onClick={handleSaveSettings} className="px-6 py-2 bg-green-600 text-black font-bold rounded hover:bg-green-500">
                    SAVE CONFIG
                  </button>
                  <button onClick={actions.resetSettings} className="px-6 py-2 bg-zinc-700 text-zinc-300 font-bold rounded hover:bg-zinc-600">
                    RESET DEFAULTS
                  </button>
                </div>
             </div>
           </div>
        )}

      </div>
    </div>
  );
};

// --- MAIN APP ---

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { media, settings, loading: dataLoading, actions } = useCESData(user);
  const [viewMode, setViewMode] = useState<'public' | 'admin'>('public');
  // Audio starts unmuted by default, relying on the Intro "Click" to unlock audio context
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Construct audio playlist
  const audioUrls = useMemo(() => {
    return [settings.audioUrl, settings.audioUrl2, settings.audioUrl3].filter(Boolean) as string[];
  }, [settings]);

  const handleNext = useCallback(() => {
    if (media.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % media.length);
    }
  }, [media.length]);

  // Single item loop fix / bounds check
  useEffect(() => {
      if (media.length > 0 && currentIndex >= media.length) {
          setCurrentIndex(0);
      }
  }, [media.length, currentIndex]);

  // Bypass intro if explicitly requested (e.g. refresh in admin mode)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true') {
        setShowIntro(false);
        setViewMode('admin');
    }
  }, []);

  if (authLoading || dataLoading) {
    return (
      <div className="w-screen h-screen bg-black text-green-500 flex items-center justify-center font-mono text-xs">
        <span className="animate-pulse">{'>'} SYSTEM_INITIALIZING...</span>
      </div>
    );
  }

  if (showIntro) {
      return <IntroSequence onComplete={() => setShowIntro(false)} />;
  }

  return (
    <div className="w-screen h-screen overflow-hidden relative font-sans selection:bg-green-500 selection:text-black bg-black">
      
      {/* Admin Toggle Button (Hidden in public view unless hovered top right) */}
      {viewMode === 'public' && (
        <button 
            onClick={() => setViewMode('admin')}
            className="fixed top-4 right-4 z-50 bg-black/30 text-green-500/20 hover:text-green-500 px-3 py-1 font-mono text-[10px] font-bold hover:bg-green-500/10 transition-all tracking-widest uppercase backdrop-blur border border-transparent hover:border-green-500/50"
        >
            {'>'} SYSTEM_LOGIN
        </button>
      )}

      {/* Mobile Audio Hint Overlay */}
      {viewMode === 'public' && audioUrls.length > 0 && isMuted && (
          <div className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center md:hidden">
              <div className="bg-black/80 border border-green-500/50 px-6 py-4 text-center animate-pulse backdrop-blur-sm">
                  <TouchpadOff size={32} className="text-green-500 mx-auto mb-2" />
                  <p className="text-green-500 text-xs font-bold tracking-widest">TAP TERMINAL TO UNMUTE</p>
              </div>
          </div>
      )}

      {viewMode === 'public' ? (
        <HoloFrame onInteract={() => setIsMuted(false)}>
          <div className="flex flex-col h-full relative z-40">
            <Marquee text={settings.marqueeText} logoUrl={settings.logoUrl} />
            
            <div className="flex-1 relative overflow-hidden flex flex-col">
               <div className="flex-1 relative">
                  <BookNowSidebar />
                  <TelemetrySidebar 
                    isMuted={isMuted} 
                    toggleMute={() => setIsMuted(!isMuted)}
                    isShuffle={isShuffle}
                    toggleShuffle={() => setIsShuffle(!isShuffle)}
                    hasAudio={audioUrls.length > 0}
                    nextItem={media.length > 1 ? media[(currentIndex + 1) % media.length] : undefined}
                  />
                  
                  {/* Confined Media Player */}
                  <div className="absolute inset-0 z-0 left-0 right-0 top-12 bottom-24 md:left-32 md:right-40 md:top-4 md:bottom-4 border border-green-900/30 bg-black/50 overflow-hidden rounded-sm shadow-[inset_0_0_20px_rgba(0,255,65,0.1)]">
                    <MediaPlayer 
                        media={media} 
                        currentIndex={currentIndex}
                        onNext={handleNext}
                    />
                  </div>
                  
                  <BackgroundAudio 
                    urls={audioUrls} 
                    isMuted={isMuted} 
                    isShuffle={isShuffle}
                    setAnalyser={setAnalyser}
                  />
               </div>
               <FullWidthVisualizer analyser={analyser} />
            </div>
            <Countdown />
          </div>
        </HoloFrame>
      ) : (
        <AdminDashboard media={media} settings={settings} user={user} onExit={() => setViewMode('public')} actions={actions} />
      )}
    </div>
  );
}