import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGame } from '../context/GameContext';

export default function Reveal() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { lobby, role, playerReady, playerId } = useGame();

  // Navigate based on lobby status
  useEffect(() => {
    if (lobby) {
      if (lobby.status === 'voting') {
        navigate(`/vote/${lobby.code}`);
      } else if (lobby.status === 'results') {
        navigate(`/results/${lobby.code}`);
      } else if (lobby.status === 'waiting') {
        navigate(`/lobby/${lobby.code}`);
      }
    }
  }, [lobby, navigate]);

  // Redirect if no lobby or role
  if (!lobby || lobby.code !== code || !role) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <p className="text-xl text-gray-400 mb-6">Loading...</p>
      </div>
    );
  }

  const currentPlayer = lobby.players.find(p => p.id === playerId);
  const isReady = currentPlayer?.isReady;
  const readyCount = lobby.players.filter(p => p.isReady).length;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="text-center">
        <p className="text-gray-400 text-lg mb-6">Your Role</p>
        
        {role.isImpostor ? (
          <>
            <div className="bg-red-900/50 border-2 border-red-500 rounded-2xl p-8 mb-8">
              <h1 className="text-4xl font-bold text-red-400 mb-4">
                😈 IMPOSTOR
              </h1>
              <p className="text-xl text-gray-300">
                You don't know the word!
              </p>
              <p className="text-lg text-gray-400 mt-4">
                Blend in and don't get caught.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-green-900/50 border-2 border-green-500 rounded-2xl p-8 mb-8">
              <h1 className="text-2xl font-semibold text-green-300 mb-6">
                The secret word is:
              </h1>
              <p className="text-5xl font-bold text-white mb-4">
                {role.secretWord}
              </p>
              <p className="text-lg text-gray-400 mt-4">
                Find the impostor who doesn't know!
              </p>
            </div>
          </>
        )}

        <p className="text-gray-500 mb-6">
          Ready: {readyCount} / {lobby.players.length}
        </p>

        {!isReady ? (
          <button
            onClick={playerReady}
            className="bg-purple-600 hover:bg-purple-500 text-white text-xl font-semibold py-4 px-12 rounded-xl transition-colors"
          >
            I'm Ready
          </button>
        ) : (
          <p className="text-green-400 text-xl">
            ✓ Waiting for others...
          </p>
        )}
      </div>
    </div>
  );
}
