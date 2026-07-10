import { useEffect, useRef, useState } from 'react';
import SongRow from './SongRow';
import type { Track } from '../lib/mediaStore';

type Props = {
  trackIds: string[];
  tracksById: Map<string, Track>;
  currentTrackId: string | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onAddToPlaylist: (track: Track) => void;
  onReorder: (newTrackIds: string[]) => void;
};

// Must stay roughly in sync with .song-row's actual rendered height (min
// height 60px + 4px vertical margin from song-list gap). It only needs to
// be close — it's used to decide when a dragged row has crossed far enough
// over a neighbor to swap with it, not for exact pixel positioning.
const ROW_HEIGHT = 64;

export default function ReorderableSongList({
  trackIds,
  tracksById,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onAddToPlaylist,
  onReorder
}: Props) {
  // The ref is the live source of truth read/written by the pointer
  // handlers (which are attached once per drag gesture and must never
  // work off a stale closure of React state). `renderTick` just forces
  // this component to re-render whenever the ref changes during a drag.
  const orderRef = useRef<string[]>(trackIds);
  const [, setRenderTick] = useState(0);
  const rerender = () => setRenderTick(t => t + 1);

  useEffect(() => {
    // Only resync from props when nothing is being dragged right now —
    // otherwise an incoming prop update mid-drag (from the debounced
    // commit below) would yank the list back under the user's finger.
    if (!dragInfo.current) {
      orderRef.current = trackIds;
      rerender();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIds]);

  const dragInfo = useRef<{ id: string; startClientY: number; originIndex: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const handlePointerMove = (e: PointerEvent) => {
    if (!dragInfo.current) return;
    const delta = e.clientY - dragInfo.current.startClientY;
    const steps = Math.round(delta / ROW_HEIGHT);
    setDragOffset(delta - steps * ROW_HEIGHT);

    const prev = orderRef.current;
    const currentIndex = prev.indexOf(dragInfo.current.id);
    const targetIndex = Math.min(Math.max(dragInfo.current.originIndex + steps, 0), prev.length - 1);

    if (targetIndex !== currentIndex && currentIndex !== -1) {
      const next = [...prev];
      const [moved] = next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, moved);
      orderRef.current = next;
      rerender();
    }
  };

  const handlePointerUp = () => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerUp);
    if (dragInfo.current) {
      onReorder(orderRef.current);
    }
    dragInfo.current = null;
    setDraggingId(null);
    setDragOffset(0);
  };

  const handlePointerDown = (id: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    const index = orderRef.current.indexOf(id);
    if (index === -1) return;
    dragInfo.current = { id, startClientY: e.clientY, originIndex: index };
    setDraggingId(id);
    setDragOffset(0);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  const tracks = orderRef.current.map(id => tracksById.get(id)).filter((t): t is Track => !!t);

  return (
    <div className="song-list">
      {tracks.map(t => (
        <div
          key={t.id}
          className={draggingId === t.id ? 'dragging-row' : ''}
          style={draggingId === t.id ? { transform: `translateY(${dragOffset}px)` } : undefined}
        >
          <SongRow
            track={t}
            active={t.id === currentTrackId}
            playing={isPlaying && t.id === currentTrackId}
            onClick={() => onPlayTrack(t)}
            onAddToPlaylist={() => onAddToPlaylist(t)}
            onDragHandlePointerDown={handlePointerDown(t.id)}
          />
        </div>
      ))}
    </div>
  );
}
