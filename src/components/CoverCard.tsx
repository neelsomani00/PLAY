import AlbumArt from './AlbumArt';

type Props = {
  title: string;
  subtitle: string;
  art?: string;
  active?: boolean;
  onClick: () => void;
};

export default function CoverCard({ title, subtitle, art, active, onClick }: Props) {
  return (
    <button className={`cover-card ${active ? 'active' : ''}`} onClick={onClick}>
      <AlbumArt art={art} className="cover-art" />
      <div className="cover-title">{title}</div>
      <div className="cover-subtitle">{subtitle}</div>
    </button>
  );
}
