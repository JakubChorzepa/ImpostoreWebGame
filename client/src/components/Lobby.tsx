import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGame } from '../context/GameContext';

export default function Lobby() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { lobby, playerId, startGame, leaveLobby, closeLobby, kickPlayer } = useGame();

  // Navigate based on lobby status
  useEffect(() => {
    if (lobby) {
      if (lobby.status === 'reveal') {
        navigate(`/reveal/${lobby.code}`);
      } else if (lobby.status === 'voting') {
        navigate(`/vote/${lobby.code}`);
      } else if (lobby.status === 'results' || lobby.status === 'round_results') {
        navigate(`/results/${lobby.code}`);
      }
    }
  }, [lobby, navigate]);

  // Redirect if no lobby
  if (!lobby || lobby.code !== code) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <p className="text-xl text-gray-400 mb-6">Lobby not found</p>
        <button
          onClick={() => navigate('/')}
          className="bg-purple-600 hover:bg-purple-500 text-white text-lg font-semibold py-3 px-6 rounded-xl"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const currentPlayer = lobby.players.find(p => p.id === playerId);
  const isHost = currentPlayer?.isHost;
  const canStart = isHost && lobby.players.length >= 3;

  return (
    <div className="flex-1 flex flex-col p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <p className="text-gray-400 text-lg mb-2">Lobby Code</p>
        <h1 className="text-4xl font-mono font-bold tracking-widest text-purple-400">
          {lobby.code}
        </h1>
        <p className="text-gray-500 mt-2">Share this code with friends</p>
      </div>

      {/* Players */}
      <div className="flex-1">
        <h2 className="text-xl font-semibold text-gray-300 mb-4">
          Players ({lobby.players.length})
        </h2>
        <ul className="space-y-3">
          {lobby.players.map((player) => (
            <li
              key={player.id}
              className={`flex items-center justify-between p-4 rounded-xl ${
                player.id === playerId
                  ? 'bg-purple-900/50 border border-purple-500'
                  : 'bg-gray-800'
              }`}
            >
              <span className="text-xl">
                {player.name}
                {player.id === playerId && (
                  <span className="text-purple-400 ml-2">(You)</span>
                )}
                {player.isDisconnected && (
                  <span className="text-red-400 text-sm ml-2">(Disconnected)</span>
                )}
              </span>
              {player.isHost && (
                <span className="bg-yellow-600 text-sm px-3 py-1 rounded-full ml-auto">
                  Host
                </span>
              )}
              
              {isHost && player.id !== playerId && (
                <button
                  onClick={() => kickPlayer(player.id)}
                  className="ml-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm px-3 py-1 rounded-lg border border-red-900/50 transition-colors"
                  title="Kick player"
                >
                  Kick
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Start Button */}
      <div className="mt-6">
        {isHost ? (
          <>
            <button
              onClick={startGame}
              disabled={!canStart}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xl font-semibold py-4 rounded-xl transition-colors"
            >
              {lobby.players.length < 3
                ? `Need ${3 - lobby.players.length} more player${3 - lobby.players.length > 1 ? 's' : ''}`
                : 'Start Game'}
            </button>
          </>
        ) : (
          <p className="text-center text-gray-400 text-lg">
            Waiting for host to start the game...
          </p>
        )}
      </div>

      {/* Exit Actions */}
      <div className="mt-4">
        {isHost ? (
          <button
            onClick={closeLobby}
            className="w-full bg-red-900/50 hover:bg-red-900/70 text-red-300 text-lg font-semibold py-3 rounded-xl transition-colors border border-red-800"
          >
            Close Lobby
          </button>
        ) : (
          <button
            onClick={leaveLobby}
            className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 text-lg font-semibold py-3 rounded-xl transition-colors"
          >
            Leave Lobby
          </button>
        )}
      </div>
    </div>
  );
}
