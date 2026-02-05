import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGame } from '../context/GameContext';

export default function Results() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { lobby, results, playerId, restartGame, startNextRound, closeLobby } = useGame();

  // Navigate based on lobby status
  useEffect(() => {
    if (lobby) {
      if (lobby.status === 'waiting') {
        navigate(`/lobby/${lobby.code}`);
      } else if (lobby.status === 'reveal') {
        navigate(`/reveal/${lobby.code}`);
      } else if (lobby.status === 'voting') {
        navigate(`/vote/${lobby.code}`);
      }
    }
  }, [lobby, navigate]);

  // Redirect if no lobby or results
  if (!lobby || lobby.code !== code || !results) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <p className="text-xl text-gray-400 mb-6">Loading...</p>
      </div>
    );
  }

  const currentPlayer = lobby.players.find(p => p.id === playerId);
  const isHost = currentPlayer?.isHost;
  const playersWon = results.winner === 'players';

  // Game Over View
  if (results.gameOver) {
    return (
      <div className="flex-1 flex flex-col p-6">
        <div className="text-center mb-8">
          <h1
            className={`text-4xl font-bold mb-4 ${
              playersWon ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {playersWon ? '🎉 Players Win!' : '😈 Impostor Wins!'}
          </h1>
          <p className="text-gray-400 text-lg">
            {playersWon
              ? 'The impostor was caught!'
              : 'The impostor escaped!'}
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <p className="text-gray-400 mb-2">The impostor was:</p>
          <p className="text-2xl font-bold text-red-400">
            {results.impostorName}
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <p className="text-gray-400 mb-2">The secret word was:</p>
          <p className="text-2xl font-bold text-purple-400">
            {results.secretWord}
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 mb-6 flex-1">
          <p className="text-gray-400 mb-4">Final Vote Breakdown:</p>
          <div className="space-y-2">
            {results.votes.map((vote, index) => (
              <div key={index} className="flex items-center gap-2 text-lg">
                <span className="text-gray-300">{vote.voterName}</span>
                <span className="text-gray-500">→</span>
                <span
                  className={
                    vote.targetName === results.impostorName
                      ? 'text-green-400'
                      : 'text-red-400'
                  }
                >
                  {vote.targetName}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto">
          {isHost ? (
            <>
              <button
                onClick={restartGame}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xl font-semibold py-4 rounded-xl transition-colors"
              >
                Play Again
              </button>
              <button
                 onClick={closeLobby}
                 className="w-full mt-4 bg-red-900/50 hover:bg-red-900/70 text-red-300 text-lg font-semibold py-3 rounded-xl transition-colors border border-red-800"
              >
                Close Lobby
              </button>
            </>
          ) : (
            <p className="text-center text-gray-400 text-lg">
              Waiting for host to start a new game...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Round Over View
  return (
    <div className="flex-1 flex flex-col p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-purple-400 mb-4">
          Round Over
        </h1>
        {results.eliminatedName ? (
          <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              {results.eliminatedName} was eliminated
            </h2>
          </div>
        ) : (
          <div className="bg-gray-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-gray-300">
              No one was eliminated (Tie)
            </h2>
          </div>
        )}
      </div>

      <div className="bg-gray-800 rounded-xl p-6 mb-6 flex-1">
        <p className="text-gray-400 mb-4">Votes this round:</p>
        <div className="space-y-2">
          {results.votes.map((vote, index) => (
            <div key={index} className="flex items-center gap-2 text-lg">
              <span className="text-gray-300">{vote.voterName}</span>
              <span className="text-gray-500">→</span>
              <span className="text-white">{vote.targetName}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto">
        {isHost ? (
          <>
            <button
              onClick={startNextRound}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xl font-semibold py-4 rounded-xl transition-colors"
            >
              Next Round ›
            </button>
            <button
                onClick={closeLobby}
                className="w-full mt-4 bg-red-900/50 hover:bg-red-900/70 text-red-300 text-lg font-semibold py-3 rounded-xl transition-colors border border-red-800"
            >
              Close Lobby
            </button>
          </>
        ) : (
          <p className="text-center text-gray-400 text-lg">
            Waiting for host to start next round...
          </p>
        )}
      </div>
    </div>
  );
}
