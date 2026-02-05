import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './components/Home';
import Lobby from './components/Lobby';
import Reveal from './components/Reveal';
import Vote from './components/Vote';
import Results from './components/Results';
import { useGame } from './context/GameContext';

export default function App() {
  const { error, clearError } = useGame();

  return (
    <div className="min-h-screen flex flex-col">
      {error && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-4 flex justify-between items-center z-50">
          <span className="text-lg">{error}</span>
          <button
            onClick={clearError}
            className="bg-red-800 hover:bg-red-700 px-4 py-2 rounded"
          >
            Dismiss
          </button>
        </div>
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby/:code" element={<Lobby />} />
        <Route path="/reveal/:code" element={<Reveal />} />
        <Route path="/vote/:code" element={<Vote />} />
        <Route path="/results/:code" element={<Results />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
