import type { Lobby, Player, Vote, GameResult } from './types.js';

// Static list of secret words
const SECRET_WORDS = [
  'Beach', 'Pizza', 'Doctor', 'Airport', 'Library',
  'Hospital', 'Restaurant', 'School', 'Museum', 'Cinema',
  'Camping', 'Wedding', 'Funeral', 'Concert', 'Zoo',
  'Gym', 'Bank', 'Casino', 'Circus', 'Farm'
];

// Generate a 6-character alphanumeric lobby code
export function generateLobbyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0, O, 1, I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Get a random secret word
export function getRandomSecretWord(): string {
  return SECRET_WORDS[Math.floor(Math.random() * SECRET_WORDS.length)];
}

// Select a random player as impostor
export function selectImpostor(players: Player[]): string {
  const randomIndex = Math.floor(Math.random() * players.length);
  return players[randomIndex].id;
}

// Create a new player
export function createPlayer(id: string, name: string, isHost: boolean): Player {
  return {
    id,
    name,
    isHost,
    isImpostor: false,
    hasVoted: false,
    isReady: false,
    isEliminated: false,
  };
}

// Create a new lobby
export function createLobby(code: string, host: Player): Lobby {
  return {
    code,
    players: [host],
    status: 'waiting',
    votes: [],
  };
}

// Check if all players have voted
export function allPlayersVoted(lobby: Lobby): boolean {
  return lobby.players.every(p => p.hasVoted);
}

// Check if all players are ready
export function allPlayersReady(lobby: Lobby): boolean {
  return lobby.players.every(p => p.isReady);
}

// Calculate game results
// Calculate game results
export function calculateResults(lobby: Lobby): GameResult {
  const voteCounts: Record<string, number> = {};
  
  // Count votes (only from active players, but inactive can't vote anyway)
  for (const vote of lobby.votes) {
    voteCounts[vote.targetId] = (voteCounts[vote.targetId] || 0) + 1;
  }
  
  // Find the player(s) with most votes
  let maxVotes = 0;
  let mostVotedIds: string[] = [];
  
  for (const [playerId, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count;
      mostVotedIds = [playerId];
    } else if (count === maxVotes) {
      mostVotedIds.push(playerId);
    }
  }
  
  let eliminatedId: string | undefined;
  let eliminatedName: string | undefined;
  const isTie = mostVotedIds.length > 1;
  
  // Eliminate player if not a tie
  if (!isTie && mostVotedIds.length === 1) {
    const victimId = mostVotedIds[0];
    const victim = lobby.players.find(p => p.id === victimId);
    if (victim) {
      victim.isEliminated = true;
      eliminatedId = victimId;
      eliminatedName = victim.name;
    }
  }
  
  // Check Win Conditions
  const impostor = lobby.players.find(p => p.id === lobby.impostorId)!;
  const activePlayers = lobby.players.filter(p => !p.isEliminated);
  const activeImpostor = activePlayers.find(p => p.isImpostor);
  const activeInnocents = activePlayers.filter(p => !p.isImpostor);
  
  let gameOver = false;
  let winner: 'players' | 'impostor' | undefined;
  
  // Condition 1: Impostor Eliminated -> Players Win
  if (impostor.isEliminated) {
    gameOver = true;
    winner = 'players';
  }
  // Condition 2: Impostors Majority (or equal) -> Impostor Wins
  // e.g. 1 Impostor, 1 Innocent -> Impostor Wins
  else if (activeImpostor && activeInnocents.length <= 1) { // Assuming 1 impostor
     // logic: if 1 impostor and 1 innocent left = 2 players. Impostor voting power is 50%.
     // Usually game ends when impostors >= innocents.
     // With 1 impostor, this means 1 innocent left.
     gameOver = true;
     winner = 'impostor';
  }
  
  // Build vote breakdown
  const voteDetails = lobby.votes.map(vote => {
    const voter = lobby.players.find(p => p.id === vote.voterId)!;
    const target = lobby.players.find(p => p.id === vote.targetId)!;
    return {
      voterName: voter.name,
      targetName: target.name,
    };
  });
  
  return {
    gameOver,
    winner,
    eliminatedId,
    eliminatedName,
    isTie,
    impostorId: lobby.impostorId!,
    impostorName: impostor.name,
    secretWord: lobby.secretWord!,
    votes: voteDetails,
  };
}

// Get sanitized lobby state for clients (removes sensitive data)
export function getLobbyForClient(lobby: Lobby): Omit<Lobby, 'secretWord' | 'impostorId'> {
  return {
    code: lobby.code,
    players: lobby.players.map(p => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      hasVoted: p.hasVoted,
      isReady: p.isReady,
      isEliminated: p.isEliminated,
      isDisconnected: p.isDisconnected,
    })),
    status: lobby.status,
    votes: [], // Don't send votes until results
  };
}
