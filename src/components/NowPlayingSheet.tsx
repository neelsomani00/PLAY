import type { RefObject } from 'react';
import AlbumArt from './AlbumArt';
import { formatSeconds } from '../lib/format';
import type { Track } from '../lib/mediaStore';

type RepeatMode = 'off' | 'all' | 'one';

type Props = {
  track: Track;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  shuffle: boolean;
  repeatMode: RepeatMode;
  volume: number;
  canvasRef: RefObject<HTMLCanvasElement>;
  onSeek: (seconds: number) => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onVolumeChange: (v: number) => void;
  onCollapse: () => void;
  onAddToPlaylist: () => void;
};

export default function NowPlayingSheet({
  track,
  isPlaying,
  currentTime,
  duration,
  shuffle,
  repeatMode,
  volume,
  canvasRef,
  onSeek,
  onTogglePlay,
  onNext,
  onPrev,
  onToggleShuffle,
  onCycleRepeat,
  onVolumeChange,
  onCollapse,
  onAddToPlaylist
}: Props) {
  return (
    <div className="now-playing-sheet">
      <div className="np-top-row">
        <button className="collapse-btn" onClick={onCollapse} aria-label="Collapse">⌄</button>
        <button className="np-playlist-btn" onClick={onAddToPlaylist} aria-label="Add to playlist">
          ＋ Playlist
        </button>
      </div>

      <AlbumArt art={track.albumArtUri} className="np-art" />

      <canvas ref={canvasRef} className="np-visualizer" width={280} height={44} />

      <div className="np-text">
        <div className="np-title">{track.title}</div>
        <div className="np-artist">{track.artist}</div>
        <div className="np-album">{track.album}</div>
      </div>

      <input
        className="seek"
        type="range"
        min={0}
        max={duration || 0}
        value={currentTime}
        onChange={e => onSeek(Number(e.target.value))}
      />
      <div className="time-row">
        <span>{formatSeconds(currentTime)}</span>
        <span>{formatSeconds(duration)}</span>
      </div>

      <div className="controls">
        <button
          className={`ctrl-btn ${shuffle ? 'ctrl-active' : ''}`}
          onClick={onToggleShuffle}
          aria-label="Toggle shuffle"
        >
          🔀
        </button>
        <button className="ctrl-btn" onClick={onPrev} aria-label="Previous">⏮</button>
        <button className="play-btn" onClick={onTogglePlay} aria-label="Play or pause">
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="ctrl-btn" onClick={onNext} aria-label="Next">⏭</button>
        <button
          className={`ctrl-btn ${repeatMode !== 'off' ? 'ctrl-active' : ''}`}
          onClick={onCycleRepeat}
          aria-label="Cycle repeat mode"
        >
          {repeatMode === 'one' ? '🔂' : '🔁'}
        </button>
      </div>

      <div className="volume-row">
        <span>🔉</span>
        <input
          className="volume"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={e => onVolumeChange(Number(e.target.value))}
        />
        <span>🔊</span>
      </div>
    </div>
  );
}
