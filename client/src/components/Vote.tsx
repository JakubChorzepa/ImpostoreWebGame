import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGame } from '../context/GameContext';

export default function Vote() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { lobby, playerId, castVote } = useGame();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  // Navigate based on lobby status
  useEffect(() => {
    if (lobby) {
      if (lobby.status === 'results') {
        navigate(`/results/${lobby.code}`);
      } else if (lobby.status === 'waiting') {
        navigate(`/lobby/${lobby.code}`);
      } else if (lobby.status === 'reveal') {
        navigate(`/reveal/${lobby.code}`);
      } else if (lobby.status === 'round_results') {
        navigate(`/results/${lobby.code}`);
      }
    }
  }, [lobby, navigate]);

  // Check if current player has voted
  useEffect(() => {
    if (lobby && playerId) {
      const currentPlayer = lobby.players.find(p => p.id === playerId);
      if (currentPlayer?.hasVoted) {
        setHasVoted(true);
      }
    }
  }, [lobby, playerId]);

  // Redirect if no lobby
  if (!lobby || lobby.code !== code) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <p className="text-xl text-gray-400 mb-6">Loading...</p>
      </div>
    );
  }

  const votedCount = lobby.players.filter(p => p.hasVoted && !p.isEliminated).length;
  // Active players are those not eliminated.
  // Can only vote for ACTIVE players.
  const activePlayers = lobby.players.filter(p => !p.isEliminated);
  const currentPlayer = lobby.players.find(p => p.id === playerId);
  const isSpectator = currentPlayer?.isEliminated;

  const handleVote = () => {
    if (selectedId && !hasVoted && !isSpectator) {
      castVote(selectedId);
      setHasVoted(true);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-purple-400 mb-2">
          🗳️ Vote
        </h1>
        <p className="text-gray-400">
          {isSpectator ? 'You are spectating' : 'Who is the impostor?'}
        </p>
        <p className="text-gray-500 mt-2">
          Votes: {votedCount} / {activePlayers.length}
        </p>
      </div>

      {!hasVoted && !isSpectator ? (
        <>
          {/* Player Selection */}
          <div className="flex-1 space-y-3">
            {lobby.players
              .filter(p => p.id !== playerId) // Show everyone except self (including eliminated)
              .map((player) => (
              <button
                key={player.id}
                onClick={() => !player.isEliminated && setSelectedId(player.id)}
                disabled={player.isEliminated}
                className={`w-full p-4 rounded-xl text-left text-xl transition-colors ${
                  selectedId === player.id
                    ? 'bg-purple-600 border-2 border-purple-400'
                    : player.isEliminated 
                      ? 'bg-gray-800/50 border-2 border-transparent cursor-not-allowed opacity-60'
                      : 'bg-gray-800 border-2 border-transparent hover:bg-gray-700'
                } ${player.isDisconnected ? 'opacity-75' : ''}`}
              >
                <span className="flex items-center justify-between">
                  <span>
                    <span className={player.isEliminated ? 'line-through text-gray-500' : ''}>
                      {player.name}
                    </span>
                    {player.isDisconnected && (
                      <span className="text-sm text-red-400 ml-2">(Disconnected)</span>
                    )}
                    {player.isEliminated && (
                      <span className="text-sm text-red-500 ml-2 font-bold uppercase">💀 Eliminated</span>
                    )}
                  </span>
                  {player.hasVoted && !player.isEliminated && (
                    <span className="text-sm text-gray-400">✓ Voted</span>
                  )}
                </span>
              </button>
            ))}
          </div>

          {/* Vote Button */}
          <div className="mt-6">
            <button
              onClick={handleVote}
              disabled={!selectedId}
              className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xl font-semibold py-4 rounded-xl transition-colors"
            >
              {selectedId ? 'Confirm Vote' : 'Select a player'}
            </button>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
          {isSpectator ? (
            <p className="text-2xl text-gray-400 mb-4">👀 Spectator Mode</p>
          ) : (
            <p className="text-2xl text-green-400 mb-4">✓ Vote Cast</p>
          )}
          <p className="text-gray-400">Waiting for others to vote...</p>
          
          {/* Show who has voted (Live Status) */}
          <div className="mt-8 space-y-2 w-full max-w-sm">
            {activePlayers.map((player) => (
              <div key={player.id} className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                <span className="text-gray-300">
                  {player.name}
                  {player.id === playerId && ' (You)'}
                </span>
                <span className={player.hasVoted ? 'text-green-400' : 'text-gray-500'}>
                  {player.hasVoted ? '✓ Voted' : 'Waiting...'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
