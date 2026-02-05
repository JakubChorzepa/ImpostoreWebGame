import { Server } from 'socket.io';
import { createServer } from 'http';
import type { Lobby, Player, GameResult } from './types.js';
import {
  generateLobbyCode,
  getRandomSecretWord,
  selectImpostor,
  createPlayer,
  createLobby,
  allPlayersVoted,
  allPlayersReady,
  calculateResults,
  getLobbyForClient,
} from './gameLogic.js';

const PORT = 3001;

// In-memory state
const lobbies = new Map<string, Lobby>();
const playerToLobby = new Map<string, string>(); // socketId -> lobbyCode
const pendingDisconnects = new Map<string, { lobbyCode: string; playerId: string; timeoutId: NodeJS.Timeout }>(); // playerId -> disconnect info

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // CREATE_LOBBY
  socket.on('CREATE_LOBBY', (data: { playerName: string }) => {
    const code = generateLobbyCode();
    const host = createPlayer(socket.id, data.playerName, true);
    const lobby = createLobby(code, host);
    
    lobbies.set(code, lobby);
    playerToLobby.set(socket.id, code);
    socket.join(code);
    
    socket.emit('LOBBY_CREATED', { code, playerId: socket.id });
    io.to(code).emit('LOBBY_UPDATED', getLobbyForClient(lobby));
    
    console.log(`Lobby ${code} created by ${data.playerName}`);
  });

  // JOIN_LOBBY
  socket.on('JOIN_LOBBY', (data: { lobbyCode: string; playerName: string }) => {
    const code = data.lobbyCode.toUpperCase();
    const lobby = lobbies.get(code);
    
    if (!lobby) {
      socket.emit('ERROR', { message: 'Lobby not found' });
      return;
    }
    
    if (lobby.status !== 'waiting') {
      socket.emit('ERROR', { message: 'Game already in progress' });
      return;
    }
    
    if (lobby.players.some(p => p.name === data.playerName)) {
      socket.emit('ERROR', { message: 'Name already taken in this lobby' });
      return;
    }
    
    const player = createPlayer(socket.id, data.playerName, false);
    lobby.players.push(player);
    playerToLobby.set(socket.id, code);
    socket.join(code);
    
    socket.emit('LOBBY_JOINED', { code, playerId: socket.id, playerName: data.playerName });
    io.to(code).emit('LOBBY_UPDATED', getLobbyForClient(lobby));
    
    console.log(`${data.playerName} joined lobby ${code}`);
  });

  // START_GAME
  socket.on('START_GAME', () => {
    const code = playerToLobby.get(socket.id);
    if (!code) return;
    
    const lobby = lobbies.get(code);
    if (!lobby) return;
    
    const player = lobby.players.find(p => p.id === socket.id);
    if (!player?.isHost) {
      socket.emit('ERROR', { message: 'Only host can start the game' });
      return;
    }
    
    if (lobby.players.length < 3) {
      socket.emit('ERROR', { message: 'Need at least 3 players to start' });
      return;
    }
    
    // Assign roles
    const secretWord = getRandomSecretWord();
    const impostorId = selectImpostor(lobby.players);
    
    lobby.secretWord = secretWord;
    lobby.impostorId = impostorId;
    lobby.status = 'reveal';
    lobby.votes = [];
    
    // Reset player states
    lobby.players.forEach(p => {
      p.isImpostor = p.id === impostorId;
      p.secretWord = p.isImpostor ? undefined : secretWord;
      p.hasVoted = false;
      p.isReady = false;
    });
    
    // Send role to each player privately
    lobby.players.forEach(p => {
      io.to(p.id).emit('ROLE_ASSIGNED', {
        isImpostor: p.isImpostor,
        secretWord: p.secretWord,
      });
    });
    
    io.to(code).emit('GAME_STARTED', getLobbyForClient(lobby));
    
    console.log(`Game started in lobby ${code}. Impostor: ${lobby.players.find(p => p.isImpostor)?.name}`);
  });

  // PLAYER_READY
  socket.on('PLAYER_READY', () => {
    const code = playerToLobby.get(socket.id);
    if (!code) return;
    
    const lobby = lobbies.get(code);
    if (!lobby) return;
    
    const player = lobby.players.find(p => p.id === socket.id);
    if (!player) return;
    
    player.isReady = true;
    
    io.to(code).emit('LOBBY_UPDATED', getLobbyForClient(lobby));
    
    // Check if all players are ready
    if (allPlayersReady(lobby)) {
      lobby.status = 'voting';
      io.to(code).emit('VOTING_STARTED', getLobbyForClient(lobby));
      console.log(`Voting started in lobby ${code}`);
    }
  });

  // CAST_VOTE
  socket.on('CAST_VOTE', (data: { targetId: string }) => {
    const code = playerToLobby.get(socket.id);
    if (!code) return;
    
    const lobby = lobbies.get(code);
    if (!lobby || lobby.status !== 'voting') return;
    
    const player = lobby.players.find(p => p.id === socket.id);
    if (!player || player.hasVoted) return;
    
    // Check if voter is eliminated (Spectator) - Security check
    if (player.isEliminated) {
      socket.emit('ERROR', { message: 'Eliminated players cannot vote' });
      return;
    }
    
    // Cannot vote for self
    if (data.targetId === socket.id) {
      socket.emit('ERROR', { message: 'Cannot vote for yourself' });
      return;
    }
    
    // Check target exists
    const target = lobby.players.find(p => p.id === data.targetId);
    if (!target) {
      socket.emit('ERROR', { message: 'Invalid vote target' });
      return;
    }

    // Check target is not eliminated
    if (target.isEliminated) {
       socket.emit('ERROR', { message: 'Cannot vote for eliminated players' });
       return;
    }
    
    player.hasVoted = true;
    lobby.votes.push({ voterId: socket.id, targetId: data.targetId });
    
    io.to(code).emit('VOTE_UPDATE', getLobbyForClient(lobby));
    
    console.log(`${player.name} voted in lobby ${code}`);
    
    // Check if all active players have voted
    const activePlayers = lobby.players.filter(p => !p.isEliminated);
    const votesCount = lobby.votes.length;
    // We need to count votes from ACTIVE players.
    // Actually allPlayersVoted function checks every player. 
    // We need to update allPlayersVoted in gameLogic or check manually here.
    // Let's check manually here for safety as logic changed.
    const allActiveVoted = activePlayers.every(p => p.hasVoted);
    
    if (allActiveVoted) {
      const results = calculateResults(lobby);
      lobby.lastResult = results;
      
      if (results.gameOver) {
        lobby.status = 'results';
        io.to(code).emit('GAME_ENDED', { lobby: getLobbyForClient(lobby), results });
        console.log(`Game ended in lobby ${code}. Winner: ${results.winner}`);
      } else {
        lobby.status = 'round_results';
        io.to(code).emit('ROUND_ENDED', { lobby: getLobbyForClient(lobby), results });
        console.log(`Round ended in lobby ${code}. Eliminated: ${results.eliminatedName || 'None'}`);
      }
    }
  });

  // NEXT_ROUND
  socket.on('NEXT_ROUND', () => {
    const code = playerToLobby.get(socket.id);
    if (!code) return;
    
    const lobby = lobbies.get(code);
    if (!lobby) return;
    
    const player = lobby.players.find(p => p.id === socket.id);
    if (!player?.isHost) {
      socket.emit('ERROR', { message: 'Only host can start next round' });
      return;
    }
    
    // Reset round state
    lobby.status = 'voting';
    lobby.votes = [];
    lobby.lastResult = undefined;
    
    lobby.players.forEach(p => {
      p.hasVoted = false;
    });
    
    io.to(code).emit('VOTING_STARTED', getLobbyForClient(lobby));
    console.log(`Next round started in lobby ${code}`);
  });

  // RESTART_GAME
  socket.on('RESTART_GAME', () => {
    const code = playerToLobby.get(socket.id);
    if (!code) return;
    
    const lobby = lobbies.get(code);
    if (!lobby) return;
    
    const player = lobby.players.find(p => p.id === socket.id);
    if (!player?.isHost) {
      socket.emit('ERROR', { message: 'Only host can restart the game' });
      return;
    }
    
    // Reset lobby state
    lobby.status = 'waiting';
    lobby.secretWord = undefined;
    lobby.impostorId = undefined;
    lobby.votes = [];
    lobby.lastResult = undefined;
    
    lobby.players.forEach(p => {
      p.isImpostor = false;
      p.secretWord = undefined;
      p.hasVoted = false;
      p.isReady = false;
      p.isEliminated = false;
    });
    
    io.to(code).emit('LOBBY_UPDATED', getLobbyForClient(lobby));
    
    console.log(`Game restarted in lobby ${code}`);
  });

  // REJOIN_LOBBY - reconnect a player after temporary disconnect
  socket.on('REJOIN_LOBBY', (data: { lobbyCode: string; playerName: string }) => {
    const code = data.lobbyCode.toUpperCase();
    const lobby = lobbies.get(code);
    
    if (!lobby) {
      socket.emit('ERROR', { message: 'Lobby no longer exists' });
      return;
    }
    
    // Find the player by name
    const player = lobby.players.find(p => p.name === data.playerName);
    if (!player) {
      socket.emit('ERROR', { message: 'Player not found in lobby' });
      return;
    }
    
    const oldSocketId = player.id;
    
    // Cancel any pending disconnect timeout
    const pendingDisconnect = pendingDisconnects.get(oldSocketId);
    if (pendingDisconnect) {
      clearTimeout(pendingDisconnect.timeoutId);
      pendingDisconnects.delete(oldSocketId);
    }
    
    // Update player's socket ID and mark as connected
    playerToLobby.delete(oldSocketId);
    player.id = socket.id;
    player.isDisconnected = false;
    playerToLobby.set(socket.id, code);
    socket.join(code);
    
    // Send the player their current state
    socket.emit('LOBBY_JOINED', { code, playerId: socket.id, playerName: data.playerName });
    
    // If game is in progress, send role info
    if (lobby.status !== 'waiting') {
      socket.emit('ROLE_ASSIGNED', {
        isImpostor: player.isImpostor,
        secretWord: player.secretWord,
      });
      
      // If showing results, send them too
      if ((lobby.status === 'results' || lobby.status === 'round_results') && lobby.lastResult) {
        if (lobby.status === 'results') {
          socket.emit('GAME_ENDED', { lobby: getLobbyForClient(lobby), results: lobby.lastResult });
        } else {
          socket.emit('ROUND_ENDED', { lobby: getLobbyForClient(lobby), results: lobby.lastResult });
        }
      }
    }
    
    io.to(code).emit('LOBBY_UPDATED', getLobbyForClient(lobby));
    
    console.log(`${data.playerName} rejoined lobby ${code}`);
  });

  // LEAVE_LOBBY
  socket.on('LEAVE_LOBBY', () => {
    const code = playerToLobby.get(socket.id);
    if (!code) return;
    
    const lobby = lobbies.get(code);
    if (!lobby) return;
    
    const playerIndex = lobby.players.findIndex(p => p.id === socket.id);
    if (playerIndex === -1) return;
    
    const player = lobby.players[playerIndex];
    const wasHost = player.isHost;
    
    // Remove player immediately (explicit leave)
    lobby.players.splice(playerIndex, 1);
    playerToLobby.delete(socket.id);
    
    // Cancel any pending disconnect timeout if they were somehow in that state
    const pendingDisconnect = pendingDisconnects.get(socket.id);
    if (pendingDisconnect) {
      clearTimeout(pendingDisconnect.timeoutId);
      pendingDisconnects.delete(socket.id);
    }
    
    socket.leave(code);
    console.log(`${player.name} left lobby ${code}`);
    
    // If lobby is empty, delete it
    if (lobby.players.length === 0) {
      lobbies.delete(code);
      console.log(`Lobby ${code} deleted (empty)`);
      return;
    }
    
    // If host left, assign new host (prefer connected players)
    if (wasHost && lobby.players.length > 0) {
      const newHost = lobby.players.find(p => !p.isDisconnected) || lobby.players[0];
      newHost.isHost = true;
      console.log(`${newHost.name} is now host of lobby ${code}`);
    }
    
    io.to(code).emit('LOBBY_UPDATED', getLobbyForClient(lobby));
  });

  // CLOSE_LOBBY
  socket.on('CLOSE_LOBBY', () => {
    const code = playerToLobby.get(socket.id);
    if (!code) return;
    
    const lobby = lobbies.get(code);
    if (!lobby) return;
    
    const player = lobby.players.find(p => p.id === socket.id);
    if (!player?.isHost) {
      socket.emit('ERROR', { message: 'Only host can close the lobby' });
      return;
    }
    
    console.log(`Lobby ${code} closed by host ${player.name}`);
    
    // Notify all players that lobby is closed
    io.to(code).emit('LOBBY_CLOSED');
    
    // Clean up all players
    lobby.players.forEach(p => {
      playerToLobby.delete(p.id);
      
      const pendingDisconnect = pendingDisconnects.get(p.id);
      if (pendingDisconnect) {
        clearTimeout(pendingDisconnect.timeoutId);
        pendingDisconnects.delete(p.id);
      }
      
      // We can't easily force them to leave the room socket-wise without iterating sockets
      // But the client will handle the LOBBY_CLOSED event by navigating away
    });
    
    lobbies.delete(code);
    io.in(code).socketsLeave(code); // Force leave socket room
  });

  // KICK_PLAYER
  socket.on('KICK_PLAYER', (data: { targetId: string }) => {
    const code = playerToLobby.get(socket.id);
    if (!code) return;
    
    const lobby = lobbies.get(code);
    if (!lobby) return;
    
    const player = lobby.players.find(p => p.id === socket.id);
    if (!player?.isHost) {
      socket.emit('ERROR', { message: 'Only host can kick players' });
      return;
    }

    if (data.targetId === socket.id) {
       socket.emit('ERROR', { message: 'Cannot kick yourself' });
       return;
    }

    const targetIndex = lobby.players.findIndex(p => p.id === data.targetId);
    if (targetIndex === -1) {
       socket.emit('ERROR', { message: 'Player not found' });
       return;
    }

    const targetPlayer = lobby.players[targetIndex];

    // Remove player
    lobby.players.splice(targetIndex, 1);
    playerToLobby.delete(targetPlayer.id);

    // Cancel any pending disconnect timeout (though we disabled auto-remove, good safely)
    const pendingDisconnect = pendingDisconnects.get(targetPlayer.id);
    if (pendingDisconnect) {
      clearTimeout(pendingDisconnect.timeoutId);
      pendingDisconnects.delete(targetPlayer.id);
    }
    
    // Notify target they were kicked
    io.to(targetPlayer.id).emit('KICKED');
    // Force socket leave
    io.in(targetPlayer.id).socketsLeave(code);

    console.log(`${targetPlayer.name} kicked from lobby ${code} by ${player.name}`);
    io.to(code).emit('LOBBY_UPDATED', getLobbyForClient(lobby));
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const code = playerToLobby.get(socket.id);
    if (!code) return;
    
    const lobby = lobbies.get(code);
    if (!lobby) return;
    
    const player = lobby.players.find(p => p.id === socket.id);
    if (!player) return;
    
    const playerName = player.name;
    console.log(`${playerName} disconnected from lobby ${code}`);
    
    // Always just mark as disconnected
    // Never remove automatically unless lobby is closed or they reconnect
    player.isDisconnected = true;
    io.to(code).emit('LOBBY_UPDATED', getLobbyForClient(lobby));
    console.log(`${playerName} marked as disconnected`);
    
    // Store pending disconnect just in case we need it later, but no timeout callback
    // (Or we can just avoid using pendingDisconnects map since we don't have a timeout anymore?
    //  Actually, REJOIN_LOBBY currently checks pendingDisconnects to clear timeout. 
    //  We can leave it empty or just not set it. Let's not set it to keep it clean.)
  });
});

httpServer.listen(PORT, () => {
  console.log(`🎮 Impostor game server running on port ${PORT}`);
});
