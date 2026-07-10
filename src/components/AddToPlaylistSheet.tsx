import { useState } from 'react';
import type { Playlist } from '../lib/playlists';

type Props = {
  trackTitle: string;
  trackId: string;
  playlists: Playlist[];
  onToggleTrack: (playlistId: string) => void;
  onCreatePlaylist: (name: string) => void;
  onClose: () => void;
};

export default function AddToPlaylistSheet({
  trackTitle,
  trackId,
  playlists,
  onToggleTrack,
  onCreatePlaylist,
  onClose
}: Props) {
  const [newName, setNewName] = useState('');

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    onCreatePlaylist(name);
    setNewName('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add to playlist</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-subtitle">{trackTitle}</div>

        <div className="playlist-check-list">
          {playlists.length === 0 && (
            <p className="empty-sub">No playlists yet — create one below.</p>
          )}
          {playlists.map(pl => {
            const included = pl.trackIds.includes(trackId);
            return (
              <button
                key={pl.id}
                className={`playlist-check-row ${included ? 'checked' : ''}`}
                onClick={() => onToggleTrack(pl.id)}
              >
                <span className="check-box">{included ? '✓' : ''}</span>
                <span className="playlist-check-name">{pl.name}</span>
                <span className="playlist-check-count">{pl.trackIds.length}</span>
              </button>
            );
          })}
        </div>

        <div className="new-playlist-row">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="New playlist name"
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreate();
            }}
          />
          <button className="new-playlist-btn" onClick={handleCreate} disabled={!newName.trim()}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
