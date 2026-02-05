export type Player = {
  id: string;
  name: string;
  isHost: boolean;
  isImpostor?: boolean;
  hasVoted?: boolean;
  secretWord?: string;
  isReady?: boolean;
  isDisconnected?: boolean;
  isEliminated?: boolean;
};

export type LobbyStatus = 'waiting' | 'reveal' | 'voting' | 'results' | 'round_results';

export type Lobby = {
  code: string;
  players: Player[];
  status: LobbyStatus;
  secretWord?: string;
  votes: Vote[];
  impostorId?: string;
  lastResult?: GameResult;
};

export type Vote = {
  voterId: string;
  targetId: string;
};

export type GameResult = {
  gameOver: boolean;
  winner?: 'players' | 'impostor';
  eliminatedId?: string;
  eliminatedName?: string;
  isTie?: boolean;
  impostorId: string;
  impostorName: string;
  secretWord: string; // Only populated if gameOver is true (or safely if round over for innocent players to see? Actually innocents know it.)
  votes: Array<{
    voterName: string;
    targetName: string;
  }>;
};
