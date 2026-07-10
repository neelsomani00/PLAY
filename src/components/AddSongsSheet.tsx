import { useMemo, useState } from 'react';
import AlbumArt from './AlbumArt';
import type { Track } from '../lib/mediaStore';

type Props = {
  playlistName: string;
  allTracks: Track[];
  memberIds: Set<string>;
  onToggle: (trackId: string) => void;
  onDone: () => void;
};

export default function AddSongsSheet({ playlistName, allTracks, memberIds, onToggle, onDone }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...allTracks].sort((a, b) => a.title.localeCompare(b.title));
    if (!q) return sorted;
    return sorted.filter(
      t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
    );
  }, [allTracks, query]);

  return (
    <div className="add-songs-sheet">
      <div className="add-songs-header">
        <button className="back-btn" onClick={onDone} aria-label="Done">←</button>
        <div>
          <h2 className="playlist-detail-title">Add songs</h2>
          <div className="empty-sub">to {playlistName}</div>
        </div>
      </div>

      <div className="search-row add-songs-search">
        <span className="search-icon">🔍</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search your library"
        />
      </div>

      <div className="scroll-area">
        <div className="song-list">
          {filtered.map(t => {
            const included = memberIds.has(t.id);
            return (
              <button
                key={t.id}
                className={`song-row add-songs-row ${included ? 'checked' : ''}`}
                onClick={() => onToggle(t.id)}
              >
                <AlbumArt art={t.albumArtUri} className="song-thumb" />
                <div className="song-info">
                  <div className="song-title">{t.title}</div>
                  <div className="song-artist">{t.artist}</div>
                </div>
                <span className="check-box add-songs-check">{included ? '✓' : ''}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="empty-sub" style={{ padding: '12px 4px' }}>No matches.</p>
          )}
        </div>
      </div>
    </div>
  );
}
