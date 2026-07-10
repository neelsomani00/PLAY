import { useState } from 'react';
import ReorderableSongList from '../components/ReorderableSongList';
import AddSongsSheet from '../components/AddSongsSheet';
import CreatePlaylistModal from '../components/CreatePlaylistModal';
import type { Track } from '../lib/mediaStore';
import type { Playlist } from '../lib/playlists';

type Props = {
  playlists: Playlist[];
  tracksById: Map<string, Track>;
  currentTrackId: string | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track, queueId: string) => void;
  onCreatePlaylist: (name: string) => void;
  onDeletePlaylist: (id: string) => void;
  onAddToPlaylist: (track: Track) => void;
  onReorderPlaylist: (playlistId: string, newTrackIds: string[]) => void;
  onToggleTrackInPlaylist: (playlistId: string, trackId: string) => void;
};

export default function PlaylistsPage({
  playlists,
  tracksById,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onCreatePlaylist,
  onDeletePlaylist,
  onAddToPlaylist,
  onReorderPlaylist,
  onToggleTrackInPlaylist
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [addingSongsTo, setAddingSongsTo] = useState<string | null>(null);

  const selected = playlists.find(p => p.id === selectedId) ?? null;
  const addingSongsPlaylist = playlists.find(p => p.id === addingSongsTo) ?? null;

  if (addingSongsPlaylist) {
    return (
      <AddSongsSheet
        playlistName={addingSongsPlaylist.name}
        allTracks={Array.from(tracksById.values())}
        memberIds={new Set(addingSongsPlaylist.trackIds)}
        onToggle={trackId => onToggleTrackInPlaylist(addingSongsPlaylist.id, trackId)}
        onDone={() => setAddingSongsTo(null)}
      />
    );
  }

  if (selected) {
    return (
      <div className="scroll-area">
        <div className="playlist-detail-header">
          <button className="back-btn" onClick={() => setSelectedId(null)} aria-label="Back">←</button>
          <div>
            <h2 className="playlist-detail-title">{selected.name}</h2>
            <div className="empty-sub">{selected.trackIds.length} song{selected.trackIds.length === 1 ? '' : 's'}</div>
          </div>
        </div>

        <button className="add-songs-btn" onClick={() => setAddingSongsTo(selected.id)}>
          ＋ Add songs
        </button>

        {selected.trackIds.length === 0 ? (
          <p className="empty-sub" style={{ padding: '16px 24px' }}>
            No songs here yet — tap "Add songs" above to browse your library.
          </p>
        ) : (
          <>
            <p className="empty-sub reorder-hint">Drag ☰ to reorder</p>
            <ReorderableSongList
              trackIds={selected.trackIds}
              tracksById={tracksById}
              currentTrackId={currentTrackId}
              isPlaying={isPlaying}
              onPlayTrack={t => onPlayTrack(t, selected.id)}
              onAddToPlaylist={onAddToPlaylist}
              onReorder={newOrder => onReorderPlaylist(selected.id, newOrder)}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="scroll-area">
      <button className="new-playlist-cta" onClick={() => setShowCreate(true)}>
        ＋ New Playlist
      </button>

      {playlists.length === 0 ? (
        <div className="empty-state">
          <p>No playlists yet.</p>
          <p className="empty-sub">Create one above, or add a song to a new playlist from its ⋮ menu.</p>
        </div>
      ) : (
        <div className="playlist-list">
          {playlists.map(pl => (
            <div key={pl.id} className="playlist-row" onClick={() => setSelectedId(pl.id)}>
              <div className="playlist-row-art">♬</div>
              <div className="song-info">
                <div className="song-title">{pl.name}</div>
                <div className="song-artist">{pl.trackIds.length} song{pl.trackIds.length === 1 ? '' : 's'}</div>
              </div>
              <button
                className="song-menu-btn"
                onClick={e => {
                  e.stopPropagation();
                  if (confirm(`Delete "${pl.name}"? This can't be undone.`)) onDeletePlaylist(pl.id);
                }}
                aria-label="Delete playlist"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreatePlaylistModal
          onCreate={name => {
            onCreatePlaylist(name);
            setShowCreate(false);
          }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
