export type Player = {
  id: string;
  name: string;
  isHost: boolean;
  isImpostor?: boolean;
  hasVoted?: boolean;
  isReady?: boolean;
  isDisconnected?: boolean;
  isEliminated?: boolean;
};

export type LobbyStatus = 'waiting' | 'reveal' | 'voting' | 'results' | 'round_results';

export type Lobby = {
  code: string;
  players: Player[];
  status: LobbyStatus;
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
  secretWord: string;
  votes: Array<{
    voterName: string;
    targetName: string;
  }>;
};

export type RoleInfo = {
  isImpostor: boolean;
  secretWord?: string;
};
