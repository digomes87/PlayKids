import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CalibrationScreen } from '../calibration/CalibrationScreen';
import { PlayScreen } from '../game/PlayScreen';
import { ParentsScreen } from '../parents/ParentsScreen';
import { HomeScreen } from '../story/HomeScreen';
import { RotateOverlay } from './RotateOverlay';
import { useSettingsStore } from './settingsStore';
import { usePreventZoom } from './usePreventZoom';

export function App() {
  const isLoaded = useSettingsStore((state) => state.isLoaded);
  const load = useSettingsStore((state) => state.load);
  usePreventZoom();

  useEffect(() => {
    void load();
  }, [load]);

  if (!isLoaded) return <main className="screen screen--center" aria-busy="true" />;

  return (
    // HashRouter: o GitHub Pages não reescreve rotas, então tudo fica depois do #.
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/play/:chapterId" element={<PlayScreen />} />
        <Route path="/parents" element={<ParentsScreen />} />
        <Route path="/parents/calibration" element={<CalibrationScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <RotateOverlay />
    </HashRouter>
  );
}
