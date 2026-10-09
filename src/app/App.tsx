import { ConnectionScreen } from '@/components/ConnectionScreen/ConnectionScreen';
import { ChatScreen } from '@/components/ChatScreen/ChatScreen';
import { useConnection } from '@/features/connection/useConnection';

export function App() {
  const { status, error, credentials, connect, disconnect } = useConnection();

  if (status === 'connected' && credentials !== null) {
    return <ChatScreen credentials={credentials} onDisconnect={disconnect} />;
  }
  return <ConnectionScreen status={status} error={error} onConnect={connect} />;
}
