import { InfinityTrack } from '../../components/ui/InfinityTrack';

export default function AppLoading() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <InfinityTrack />
    </div>
  );
}
