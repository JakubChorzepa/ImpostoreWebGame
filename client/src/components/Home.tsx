import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

export default function Home() {
  const navigate = useNavigate();
  const { createLobby, joinLobby, lobby } = useGame();
  const [name, setName] = useState('');
  const [lobbyCode, setLobbyCode] = useState('');
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');

  // Navigate when lobby is set
  if (lobby) {
    navigate(`/lobby/${lobby.code}`);
  }

  const handleCreate = () => {
    if (name.trim()) {
      createLobby(name.trim());
    }
  };

  const handleJoin = () => {
    if (name.trim() && lobbyCode.trim()) {
      joinLobby(lobbyCode.trim().toUpperCase(), name.trim());
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <h1 className="text-5xl font-bold mb-2 text-purple-400">IMPOSTOR</h1>
      <p className="text-gray-400 mb-12 text-lg">Find the fake among you</p>

      {mode === 'choose' && (
        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={() => setMode('create')}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xl font-semibold py-4 px-6 rounded-xl transition-colors"
          >
            Create Lobby
          </button>
          <button
            onClick={() => setMode('join')}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white text-xl font-semibold py-4 px-6 rounded-xl transition-colors"
          >
            Join Lobby
          </button>
        </div>
      )}

      {mode === 'create' && (
        <div className="w-full max-w-sm space-y-6">
          <div>
            <label className="block text-gray-300 mb-2 text-lg">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-4 text-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              autoFocus
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xl font-semibold py-4 px-6 rounded-xl transition-colors"
          >
            Create Game
          </button>
          <button
            onClick={() => setMode('choose')}
            className="w-full text-gray-400 hover:text-white text-lg"
          >
            ← Back
          </button>
        </div>
      )}

      {mode === 'join' && (
        <div className="w-full max-w-sm space-y-6">
          <div>
            <label className="block text-gray-300 mb-2 text-lg">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-4 text-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-2 text-lg">Lobby Code</label>
            <input
              type="text"
              value={lobbyCode}
              onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-letter code"
              maxLength={6}
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-4 text-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 uppercase tracking-widest text-center font-mono"
            />
          </div>
          <button
            onClick={handleJoin}
            disabled={!name.trim() || lobbyCode.length < 6}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xl font-semibold py-4 px-6 rounded-xl transition-colors"
          >
            Join Game
          </button>
          <button
            onClick={() => setMode('choose')}
            className="w-full text-gray-400 hover:text-white text-lg"
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}
