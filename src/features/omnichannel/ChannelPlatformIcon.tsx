import type { ChannelType } from '../../lib/api/omnichannel';
import { channelTypeMeta } from './shared';

interface Props {
  type: ChannelType;
  size?: number;
}

// Platformun gerçek marka renkli logosu. Rozet (avatar köşesi) ve kanal kimliği satırında kullanılır;
// ikon ve renk tek kaynaktan (CHANNEL_TYPE_META) gelir.
export function ChannelPlatformIcon({ type, size = 14 }: Props) {
  const { Icon, brandColor } = channelTypeMeta(type);
  return <Icon size={size} color={brandColor} />;
}
