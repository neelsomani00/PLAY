import AlbumArt from './AlbumArt';
import { formatMs } from '../lib/format';
import type { Track } from '../lib/mediaStore';

type Props = {
  track: Track;
  active: boolean;
  playing: boolean;
  onClick: () => void;
  onAddToPlaylist: () => void;
  // Only passed when this row is shown inside a specific playlist's
  // detail view — shows a drag handle for press-and-drag reordering.
  onDragHandlePointerDown?: (e: React.PointerEvent) => void;
};

export default function SongRow({
  track,
  active,
  playing,
  onClick,
  onAddToPlaylist,
  onDragHandlePointerDown
}: Props) {
  return (
    <div className={`song-row ${active ? 'active' : ''}`} onClick={onClick}>
      {onDragHandlePointerDown && (
        <div
          className="drag-handle"
          onPointerDown={onDragHandlePointerDown}
          onClick={e => e.stopPropagation()}
          aria-label="Drag to reorder"
        >
          <span /><span /><span />
        </div>
      )}
      <AlbumArt art={track.albumArtUri} className="song-thumb" />
      <div className="song-info">
        <div className="song-title">{track.title}</div>
        <div className="song-artist">{track.artist}</div>
      </div>
      {active && playing && <span className="song-eq" aria-hidden="true">♪</span>}
      <span className="song-duration">{formatMs(track.durationMs)}</span>
      <button
        className="song-menu-btn"
        onClick={e => { e.stopPropagation(); onAddToPlaylist(); }}
        aria-label="Add to playlist"
      >
        ⋮
      </button>
    </div>
  );
}
