import type { RankingAvatar } from '@/lib/contracts/public';

interface AvatarPlaceholderProps {
  avatar: RankingAvatar;
  name: string;
  size?: 'small' | 'medium' | 'large';
}

export function AvatarPlaceholder({
  avatar,
  name,
  size = 'medium',
}: AvatarPlaceholderProps) {
  return (
    <figure
      aria-label={`${name} character render placeholder`}
      className={`character-avatar character-avatar-${size}`}
      style={{ '--avatar-accent': avatar.accent } as React.CSSProperties}
    >
      <div className="avatar-silhouette" aria-hidden="true">
        <span className="avatar-head" />
        <span className="avatar-body" />
      </div>
      <span className="avatar-initials">{avatar.initials}</span>
    </figure>
  );
}
