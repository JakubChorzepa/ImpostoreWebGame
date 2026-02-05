import { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import type { Lobby, RoleInfo, GameResult } from '../types';

// State
type GameState = {
  socket: Socket | null;
  playerId: string | null;
  playerName: string | null;
  lobby: Lobby | null;
  role: RoleInfo | null;
  results: GameResult | null;
  error: string | null;
};

const initialState: GameState = {
  socket: null,
  playerId: null,
  playerName: null,
  lobby: null,
  role: null,
  results: null,
  error: null,
};

// Session persistence helpers
const SESSION_KEY = 'impostor_game_session';

type StoredSession = {
  lobbyCode: string;
  playerName: string;
};

function saveSession(lobbyCode: string, playerName: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ lobbyCode, playerName }));
}

function getSession(): StoredSession | null {
  const data = localStorage.getItem(SESSION_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// Actions
type Action =
  | { type: 'SET_SOCKET'; socket: Socket }
  | { type: 'SET_PLAYER'; playerId: string; playerName: string }
  | { type: 'SET_LOBBY'; lobby: Lobby }
  | { type: 'SET_ROLE'; role: RoleInfo }
  | { type: 'SET_RESULTS'; results: GameResult }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' };

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_SOCKET':
      return { ...state, socket: action.socket };
    case 'SET_PLAYER':
      return { ...state, playerId: action.playerId, playerName: action.playerName };
    case 'SET_LOBBY':
      return { ...state, lobby: action.lobby };
    case 'SET_ROLE':
      return { ...state, role: action.role };
    case 'SET_RESULTS':
      return { ...state, results: action.results };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'RESET':
      return { ...initialState, socket: state.socket };
    default:
      return state;
  }
}

// Context
type GameContextType = GameState & {
  createLobby: (playerName: string) => void;
  joinLobby: (lobbyCode: string, playerName: string) => void;
  startGame: () => void;
  playerReady: () => void;
  castVote: (targetId: string) => void;
  restartGame: () => void;
  leaveLobby: () => void;
  closeLobby: () => void;
  startNextRound: () => void;
  kickPlayer: (targetId: string) => void;
  clearError: () => void;
};

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const navigate = useNavigate();

  // Initialize socket connection
  useEffect(() => {
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Connected to server');
      dispatch({ type: 'SET_SOCKET', socket });
      
      // Try to rejoin if we have a stored session
      const session = getSession();
      if (session) {
        console.log('Attempting to rejoin lobby:', session.lobbyCode);
        socket.emit('REJOIN_LOBBY', {
          lobbyCode: session.lobbyCode,
          playerName: session.playerName,
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    socket.on('LOBBY_CREATED', (data: { code: string; playerId: string }) => {
      dispatch({ type: 'SET_PLAYER', playerId: data.playerId, playerName: state.playerName || '' });
      // Save session for reconnection
      if (state.playerName) {
        saveSession(data.code, state.playerName);
      }
    });

    socket.on('LOBBY_JOINED', (data: { code: string; playerId: string; playerName: string }) => {
      dispatch({ type: 'SET_PLAYER', playerId: data.playerId, playerName: data.playerName });
      // Save session for reconnection
      saveSession(data.code, data.playerName);
    });

    socket.on('LOBBY_UPDATED', (lobby: Lobby) => {
      dispatch({ type: 'SET_LOBBY', lobby });
    });

    socket.on('GAME_STARTED', (lobby: Lobby) => {
      dispatch({ type: 'SET_LOBBY', lobby });
    });

    socket.on('ROLE_ASSIGNED', (role: RoleInfo) => {
      dispatch({ type: 'SET_ROLE', role });
    });

    socket.on('VOTING_STARTED', (lobby: Lobby) => {
      dispatch({ type: 'SET_LOBBY', lobby });
    });

    socket.on('VOTE_UPDATE', (lobby: Lobby) => {
      dispatch({ type: 'SET_LOBBY', lobby });
    });

    socket.on('GAME_ENDED', (data: { lobby: Lobby; results: GameResult }) => {
      dispatch({ type: 'SET_LOBBY', lobby: data.lobby });
      dispatch({ type: 'SET_RESULTS', results: data.results });
    });

    socket.on('ROUND_ENDED', (data: { lobby: Lobby; results: GameResult }) => {
      dispatch({ type: 'SET_LOBBY', lobby: data.lobby });
      dispatch({ type: 'SET_RESULTS', results: data.results });
    });

    socket.on('ERROR', (data: { message: string }) => {
      if (data.message === 'Lobby no longer exists') {
        clearSession();
        dispatch({ type: 'RESET' });
        navigate('/'); // Redirect to home
      }
      dispatch({ type: 'SET_ERROR', error: data.message });
    });

    socket.on('LOBBY_CLOSED', () => {
      clearSession();
      dispatch({ type: 'RESET' });
      dispatch({ type: 'SET_ERROR', error: 'The host has closed the lobby' });
      navigate('/');
    });

    socket.on('KICKED', () => {
      clearSession();
      dispatch({ type: 'RESET' });
      dispatch({ type: 'SET_ERROR', error: 'You have been kicked from the lobby' });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createLobby = useCallback((playerName: string) => {
    if (state.socket) {
      dispatch({ type: 'SET_PLAYER', playerId: '', playerName });
      state.socket.emit('CREATE_LOBBY', { playerName });
    }
  }, [state.socket]);

  const joinLobby = useCallback((lobbyCode: string, playerName: string) => {
    if (state.socket) {
      dispatch({ type: 'SET_PLAYER', playerId: '', playerName });
      state.socket.emit('JOIN_LOBBY', { lobbyCode, playerName });
    }
  }, [state.socket]);

  const startGame = useCallback(() => {
    if (state.socket) {
      state.socket.emit('START_GAME');
    }
  }, [state.socket]);

  const playerReady = useCallback(() => {
    if (state.socket) {
      state.socket.emit('PLAYER_READY');
    }
  }, [state.socket]);

  const castVote = useCallback((targetId: string) => {
    if (state.socket) {
      state.socket.emit('CAST_VOTE', { targetId });
    }
  }, [state.socket]);

  const restartGame = useCallback(() => {
    if (state.socket) {
      dispatch({ type: 'SET_ROLE', role: null as unknown as RoleInfo });
      dispatch({ type: 'SET_RESULTS', results: null as unknown as GameResult });
      state.socket.emit('RESTART_GAME');
    }
  }, [state.socket]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const leaveLobby = useCallback(() => {
    if (state.socket) {
      state.socket.emit('LEAVE_LOBBY');
    }
    clearSession();
    dispatch({ type: 'RESET' });
  }, [state.socket]);

  const closeLobby = useCallback(() => {
    if (state.socket) {
      state.socket.emit('CLOSE_LOBBY');
    }
    clearSession();
    dispatch({ type: 'RESET' });
  }, [state.socket]);

  const startNextRound = useCallback(() => {
    if (state.socket) {
      state.socket.emit('NEXT_ROUND');
    }
  }, [state.socket]);

  const kickPlayer = useCallback((targetId: string) => {
    if (state.socket) {
      state.socket.emit('KICK_PLAYER', { targetId });
    }
  }, [state.socket]);

  return (
    <GameContext.Provider
      value={{
        ...state,
        createLobby,
        joinLobby,
        startGame,
        playerReady,
        castVote,
        restartGame,
        leaveLobby,
        closeLobby,
        startNextRound,
        kickPlayer,
        clearError,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
