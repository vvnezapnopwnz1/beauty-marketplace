import 'expo-router/entry';
import { Provider } from 'react-redux';
import { useAuthStore } from './src/stores/authStore';

// Mock provider for Zustand (since it doesn't need a provider like Redux)
const ZustandProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default function App() {
  return (
    <ZustandProvider>
      {/* Expo Router will automatically use app/_layout.tsx as the root layout */}
    </ZustandProvider>
  );
}
