import { useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { scanAudioLibrary, requestAudioPermission, trackContentUri, type Track } from './lib/mediaStore';
import { loadPlaylists, savePlaylists, createPlaylist, type Playlist } from './lib/playlists';
import { loadPlayCounts, savePlayCounts, type PlayCounts } from './lib/playCounts';
import MiniPlayer from './components/MiniPlayer';
import NowPlayingSheet from './components/NowPlayingSheet';
import PermissionGate from './components/PermissionGate';
import AddToPlaylistSheet from './components/AddToPlaylistSheet';
import TopBar from './components/TopBar';
import TabBar, { type Tab } from './components/TabBar';
import HomePage from './pages/HomePage';
import PlaylistsPage from './pages/PlaylistsPage';
import ExtractorPage from './pages/ExtractorPage';

type RepeatMode = 'off' | 'all' | 'one';
type PermissionUiState = 'checking' | 'granted' | 'needed';

const LIBRARY_QUEUE = 'library';

function randomIndexExcept(exclude: number, length: number): number {
  if (length <= 1) return exclude;
  let idx = Math.floor(Math.random() * length);
  while (idx === exclude) idx = Math.floor(Math.random() * length);
  return idx;
}

export default function App() {
  const [permissionState, setPermissionState] = useState<PermissionUiState>('checking');
  const [isScanning, setIsScanning] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('home');

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playCounts, setPlayCounts] = useState<PlayCounts>({});
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<Track | null>(null);

  // Which list next/previous should walk through — the whole library, or
  // one specific playlist. Set whenever a track is played from somewhere.
  const [activeQueueId, setActiveQueueId] = useState<string>(LIBRARY_QUEUE);

  // The currently playing track is tracked by id, not by list position.
  // Positions shift every time the library is rescanned; an id doesn't,
  // so playback never silently jumps to the wrong song after a rescan.
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [volume, setVolume] = useState(1);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const alphabetical = useMemo(
    () => [...tracks].sort((a, b) => a.title.localeCompare(b.title)),
    [tracks]
  );

  const tracksById = useMemo(() => new Map(tracks.map(t => [t.id, t])), [tracks]);

  const mostPlayed = useMemo(() => {
    return [...tracks]
      .filter(t => (playCounts[t.id] ?? 0) > 0)
      .sort((a, b) => (playCounts[b.id] ?? 0) - (playCounts[a.id] ?? 0))
      .slice(0, 15);
  }, [tracks, playCounts]);

  const filteredSongs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return alphabetical;
    return alphabetical.filter(
      t =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q)
    );
  }, [alphabetical, searchQuery]);

  // Whatever next/previous actually walks through right now.
  const activeQueue = useMemo(() => {
    if (activeQueueId === LIBRARY_QUEUE) return alphabetical;
    const pl = playlists.find(p => p.id === activeQueueId);
    if (!pl) return alphabetical;
    return pl.trackIds.map(id => tracksById.get(id)).filter((t): t is Track => !!t);
  }, [activeQueueId, playlists, alphabetical, tracksById]);

  const currentIndex = currentTrackId ? activeQueue.findIndex(t => t.id === currentTrackId) : -1;
  const currentTrack = currentIndex >= 0 ? activeQueue[currentIndex] : null;

  const doScan = async () => {
    setIsScanning(true);
    setLoadError(null);
    try {
      const found = await scanAudioLibrary();
      setTracks(found);
      setPermissionState('granted');
    } catch {
      setPermissionState('needed');
    } finally {
      setIsScanning(false);
    }
  };

  // Silent check on launch — if permission was already granted in a past
  // session this fills the library right away with no extra tap needed.
  useEffect(() => {
    doScan();
    loadPlaylists().then(setPlaylists);
    loadPlayCounts().then(setPlayCounts);
  }, []);

  const handleGrantAccess = async () => {
    setIsScanning(true);
    try {
      await requestAudioPermission();
    } catch {
      // Handled uniformly below — if it's still not granted, doScan fails
      // and the gate simply stays up.
    }
    await doScan();
  };

  // queueId defaults to the library — anything played from Home, search,
  // Most Listened, or the Extractor's result stays on the full-library
  // queue. Playing from inside a playlist passes that playlist's id so
  // next/previous stay within it instead of jumping back to the library.
  const playTrack = (track: Track, queueId: string = LIBRARY_QUEUE) => {
    setActiveQueueId(queueId);
    setCurrentTrackId(track.id);
    setIsPlaying(true);
    setPlayCounts(prev => {
      const next = { ...prev, [track.id]: (prev[track.id] ?? 0) + 1 };
      savePlayCounts(next);
      return next;
    });
  };

  const togglePlayPause = () => {
    if (!currentTrack && activeQueue.length > 0) {
      playTrack(activeQueue[0], activeQueueId);
      return;
    }
    setIsPlaying(p => !p);
  };

  const playNext = (auto = false) => {
    const len = activeQueue.length;
    if (len === 0) return;
    if (currentIndex === -1) {
      playTrack(activeQueue[0], activeQueueId);
      return;
    }
    if (shuffle) {
      playTrack(activeQueue[randomIndexExcept(currentIndex, len)], activeQueueId);
      return;
    }
    const next = currentIndex + 1;
    if (next < len) {
      playTrack(activeQueue[next], activeQueueId);
    } else if (repeatMode === 'all') {
      playTrack(activeQueue[0], activeQueueId);
    } else if (auto) {
      // Natural end of the queue during hands-off playback, repeat is
      // off — stop rather than looping unexpectedly.
      setIsPlaying(false);
    } else {
      // A manual tap on "next" at the last track — looping back around
      // feels better than a dead button.
      playTrack(activeQueue[0], activeQueueId);
    }
  };

  const playPrev = () => {
    const len = activeQueue.length;
    if (len === 0 || currentIndex === -1) return;
    if (shuffle) {
      playTrack(activeQueue[randomIndexExcept(currentIndex, len)], activeQueueId);
      return;
    }
    const prev = currentIndex - 1 >= 0 ? currentIndex - 1 : len - 1;
    playTrack(activeQueue[prev], activeQueueId);
  };

  const handleEnded = () => {
    if (repeatMode === 'one') {
      const el = audioRef.current;
      if (el) {
        el.currentTime = 0;
        el.play().catch(() => {});
      }
      return;
    }
    playNext(true);
  };

  const handleSeek = (seconds: number) => {
    const el = audioRef.current;
    if (el) el.currentTime = seconds;
    setCurrentTime(seconds);
  };

  // --- Playlist mutations -------------------------------------------------

  const commitPlaylists = (updater: (prev: Playlist[]) => Playlist[]) => {
    setPlaylists(prev => {
      const next = updater(prev);
      savePlaylists(next);
      return next;
    });
  };

  const handleCreatePlaylist = (name: string) => {
    commitPlaylists(prev => [...prev, createPlaylist(name)]);
  };

  // Used from the "Add to playlist" sheet — a brand new playlist created
  // from there should include the track that opened the sheet.
  const handleCreatePlaylistFromSheet = (name: string) => {
    const pl = createPlaylist(name);
    if (addToPlaylistTrack) pl.trackIds = [addToPlaylistTrack.id];
    commitPlaylists(prev => [...prev, pl]);
  };

  const handleDeletePlaylist = (id: string) => {
    commitPlaylists(prev => prev.filter(p => p.id !== id));
    if (activeQueueId === id) setActiveQueueId(LIBRARY_QUEUE);
  };

  const handleToggleTrackInPlaylistById = (playlistId: string, trackId: string) => {
    commitPlaylists(prev =>
      prev.map(p => {
        if (p.id !== playlistId) return p;
        const included = p.trackIds.includes(trackId);
        return {
          ...p,
          trackIds: included ? p.trackIds.filter(id => id !== trackId) : [...p.trackIds, trackId]
        };
      })
    );
  };

  // Used by the "Add to playlist" sheet, which starts from a specific
  // track and doesn't need to repeat its id on every call.
  const handleToggleTrackInPlaylist = (playlistId: string) => {
    if (!addToPlaylistTrack) return;
    handleToggleTrackInPlaylistById(playlistId, addToPlaylistTrack.id);
  };

  const handleReorderPlaylist = (playlistId: string, newTrackIds: string[]) => {
    commitPlaylists(prev =>
      prev.map(p => (p.id === playlistId ? { ...p, trackIds: newTrackIds } : p))
    );
  };

  // --- Audio element wiring ------------------------------------------------

  // If the playing track disappears from the active queue (file deleted,
  // or removed from the playlist being played), stop cleanly instead of
  // leaving a silent phantom.
  useEffect(() => {
    if (currentTrackId && !currentTrack && isPlaying) {
      setIsPlaying(false);
    }
  }, [currentTrackId, currentTrack, isPlaying]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !currentTrack) return;
    const src = Capacitor.convertFileSrc(trackContentUri(currentTrack.id));
    if (el.src !== src) {
      el.src = src;
    }
  }, [currentTrack?.id]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !currentTrack) return;
    if (isPlaying) {
      el.play().catch(err => setLoadError(err?.message ?? 'Playback failed'));
    } else {
      el.pause();
    }
  }, [isPlaying, currentTrack?.id]);

  useEffect(() => {
    const el = audioRef.current;
    if (el) el.volume = volume;
  }, [volume]);

  // Web Audio analyser for the live visualizer bars — wired once per
  // <audio> element, which stays mounted for the whole app lifetime.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || sourceRef.current) return;

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = ctx.createMediaElementSource(el);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    analyser.connect(ctx.destination);

    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;

    return () => {
      ctx.close().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      const analyser = analyserRef.current;
      if (canvas && analyser) {
        const bufferLength = analyser.frequencyBinCount;
        const data = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(data);

        const ctx2d = canvas.getContext('2d');
        if (ctx2d) {
          const w = canvas.width;
          const h = canvas.height;
          ctx2d.clearRect(0, 0, w, h);
          const barWidth = w / bufferLength;
          for (let i = 0; i < bufferLength; i++) {
            const value = isPlaying ? data[i] : 0;
            const barHeight = (value / 255) * h;
            ctx2d.fillStyle = i % 2 === 0 ? '#3ecf8e' : '#3de0e8';
            ctx2d.fillRect(i * barWidth, h - barHeight, barWidth - 1.5, barHeight);
          }
        }
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying]);

  const tabTitle =
    activeTab === 'home' ? `${tracks.length} song${tracks.length === 1 ? '' : 's'} on this device`
    : activeTab === 'playlist' ? 'Your library'
    : 'Video → Audio';

  return (
    <div className="app">
      <audio
        ref={audioRef}
        onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
        onEnded={handleEnded}
        onError={() => setLoadError('Could not read this file. It may have been moved or deleted.')}
      />

      {permissionState !== 'granted' ? (
        <PermissionGate isScanning={isScanning} onGrantAccess={handleGrantAccess} />
      ) : (
        <>
          <TopBar
            title="PLAY"
            subtitle={tabTitle}
            rightSlot={
              activeTab === 'home' ? (
                <button className="icon-btn" onClick={doScan} disabled={isScanning} aria-label="Rescan library">
                  <span className={isScanning ? 'spin' : ''}>↻</span>
                </button>
              ) : undefined
            }
          />

          {loadError && <div className="error-banner">{loadError}</div>}

          {activeTab === 'home' && (
            <HomePage
              hasTracks={tracks.length > 0}
              isScanning={isScanning}
              mostPlayed={mostPlayed}
              filteredSongs={filteredSongs}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              currentTrackId={currentTrack?.id ?? null}
              isPlaying={isPlaying}
              onPlayTrack={t => playTrack(t, LIBRARY_QUEUE)}
              onAddToPlaylist={setAddToPlaylistTrack}
            />
          )}

          {activeTab === 'playlist' && (
            <PlaylistsPage
              playlists={playlists}
              tracksById={tracksById}
              currentTrackId={currentTrack?.id ?? null}
              isPlaying={isPlaying}
              onPlayTrack={(t, queueId) => playTrack(t, queueId)}
              onCreatePlaylist={handleCreatePlaylist}
              onDeletePlaylist={handleDeletePlaylist}
              onAddToPlaylist={setAddToPlaylistTrack}
              onReorderPlaylist={handleReorderPlaylist}
              onToggleTrackInPlaylist={handleToggleTrackInPlaylistById}
            />
          )}

          {activeTab === 'extractor' && <ExtractorPage onExtracted={doScan} />}

          {currentTrack && !nowPlayingOpen && (
            <MiniPlayer
              track={currentTrack}
              isPlaying={isPlaying}
              onToggle={togglePlayPause}
              onExpand={() => setNowPlayingOpen(true)}
            />
          )}

          {currentTrack && nowPlayingOpen && (
            <NowPlayingSheet
              track={currentTrack}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              shuffle={shuffle}
              repeatMode={repeatMode}
              volume={volume}
              canvasRef={canvasRef}
              onSeek={handleSeek}
              onTogglePlay={togglePlayPause}
              onNext={() => playNext(false)}
              onPrev={playPrev}
              onToggleShuffle={() => setShuffle(s => !s)}
              onCycleRepeat={() =>
                setRepeatMode(m => (m === 'off' ? 'all' : m === 'all' ? 'one' : 'off'))
              }
              onVolumeChange={setVolume}
              onCollapse={() => setNowPlayingOpen(false)}
              onAddToPlaylist={() => currentTrack && setAddToPlaylistTrack(currentTrack)}
            />
          )}

          {addToPlaylistTrack && (
            <AddToPlaylistSheet
              trackTitle={addToPlaylistTrack.title}
              trackId={addToPlaylistTrack.id}
              playlists={playlists}
              onToggleTrack={handleToggleTrackInPlaylist}
              onCreatePlaylist={handleCreatePlaylistFromSheet}
              onClose={() => setAddToPlaylistTrack(null)}
            />
          )}

          <TabBar active={activeTab} onChange={setActiveTab} />
        </>
      )}
    </div>
  );
}
