import { HomeScreen } from './components/Home';
import { RoomScreen } from './components/Room';
import { ToastHost } from './components/Toast';
import { useGame } from './store';

export default function App() {
  const room = useGame((state) => state.room);

  return (
    <div className="app-bg">
      {room ? <RoomScreen /> : <HomeScreen />}
      <ToastHost />
    </div>
  );
}
