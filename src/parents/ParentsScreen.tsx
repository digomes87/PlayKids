import { useSettingsStore } from '../app/settingsStore';
import { ParentalGate } from './ParentalGate';
import { ParentsDashboard } from './ParentsDashboard';
import './parents.css';

export function ParentsScreen() {
  const isUnlocked = useSettingsStore((state) => state.isParentUnlocked);
  const unlock = useSettingsStore((state) => state.unlockParents);
  return isUnlocked ? <ParentsDashboard /> : <ParentalGate onUnlock={unlock} />;
}
