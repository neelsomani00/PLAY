import AlbumArt from './AlbumArt';
import type { Track } from '../lib/mediaStore';

type Props = {
  track: Track;
  isPlaying: boolean;
  onToggle: () => void;
  onExpand: () => void;
};

export default function MiniPlayer({ track, isPlaying, onToggle, onExpand }: Props) {
  return (
    <div className="mini-player" onClick={onExpand}>
      <AlbumArt art={track.albumArtUri} className="mini-thumb" />
      <div className="mini-info">
        <div className="mini-title">{track.title}</div>
        <div className="mini-artist">{track.artist}</div>
      </div>
      <button
        className="mini-play-btn"
        onClick={e => { e.stopPropagation(); onToggle(); }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>
    </div>
  );
}
