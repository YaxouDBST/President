const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const Game = require('./game/Game'); // Import de la logique de jeu

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir les fichiers statiques du dossier public
app.use(express.static(path.join(__dirname, 'public')));

// Stocker l'état des rooms
// Format: { roomCode: { players: [{id, name, isHost}], state: 'lobby', game: null } }
const rooms = {};

// Générer un code de room à 5 caractères alphanumériques
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

io.on('connection', (socket) => {
    console.log(`Nouvelle connexion: ${socket.id}`);

    // Création d'une room
    socket.on('createRoom', (playerName) => {
        const roomCode = generateRoomCode();
        rooms[roomCode] = {
            players: [{ id: socket.id, name: playerName, isHost: true }],
            state: 'lobby',
            game: null
        };
        socket.join(roomCode);
        socket.emit('roomCreated', roomCode);
        io.to(roomCode).emit('updateLobby', rooms[roomCode].players);
        console.log(`${playerName} a créé la room ${roomCode}`);
    });

    // Rejoindre une room
    socket.on('joinRoom', ({ roomCode, playerName }) => {
        const room = rooms[roomCode];
        
        if (!room) {
            return socket.emit('error', 'Room introuvable.');
        }
        
        if (room.state !== 'lobby') {
            return socket.emit('error', 'La partie a déjà commencé.');
        }

        if (room.players.length >= 6) {
            return socket.emit('error', 'La room est pleine (6 joueurs max).');
        }
        
        // Vérifier si le joueur est déjà dans la room (au cas où)
        if (room.players.find(p => p.id === socket.id)) {
            return socket.emit('error', 'Vous êtes déjà dans cette room.');
        }

        room.players.push({ id: socket.id, name: playerName, isHost: false });
        socket.join(roomCode);
        socket.emit('roomJoined', roomCode);
        io.to(roomCode).emit('updateLobby', room.players);
        console.log(`${playerName} a rejoint la room ${roomCode}`);
    });

    // Lancement de la partie
    socket.on('startGame', (roomCode) => {
        const room = rooms[roomCode];
        if (room) {
            const player = room.players.find(p => p.id === socket.id);
            if (player && player.isHost) {
                if (room.players.length < 4) {
                    return socket.emit('error', 'Il faut au moins 4 joueurs pour lancer la partie.');
                }
                room.state = 'playing';
                room.game = new Game(room.players);
                room.game.startRound();
                
                io.to(roomCode).emit('gameStarted');
                updateGameState(roomCode);
                console.log(`Partie lancée dans la room ${roomCode}`);
            }
        }
    });

    // Actions en jeu
    socket.on('playCards', ({ roomCode, cardIndices }) => {
        const room = rooms[roomCode];
        if (room && room.game) {
            try {
                room.game.playCards(socket.id, cardIndices);
                updateGameState(roomCode);
            } catch (err) {
                socket.emit('error', err.message);
            }
        }
    });

    socket.on('passTurn', (roomCode) => {
        const room = rooms[roomCode];
        if (room && room.game) {
            try {
                room.game.pass(socket.id);
                updateGameState(roomCode);
            } catch (err) {
                socket.emit('error', err.message);
            }
        }
    });

    function updateGameState(roomCode) {
        const room = rooms[roomCode];
        if (room && room.game) {
            // Envoyer à chaque joueur son état de jeu personnalisé (pour voir que ses propres cartes)
            room.players.forEach(p => {
                io.to(p.id).emit('gameState', room.game.getGameState(p.id));
            });
            
            // Si la manche est finie, gérer la suite
            if (room.game.state === 'finished') {
                setTimeout(() => {
                    io.to(roomCode).emit('roundFinished', room.game.players);
                    // Relancer automatiquement une manche après 5 secondes
                    room.game.startRound();
                    updateGameState(roomCode);
                }, 5000);
            }
        }
    }

    // Gestion de la déconnexion
    socket.on('disconnect', () => {
        console.log(`Déconnexion: ${socket.id}`);
        // Trouver dans quelle room était le joueur
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            
            if (playerIndex !== -1) {
                const player = room.players[playerIndex];
                room.players.splice(playerIndex, 1);
                console.log(`${player.name} a quitté la room ${roomCode}`);
                
                if (room.players.length === 0) {
                    // Supprimer la room si elle est vide
                    delete rooms[roomCode];
                    console.log(`Room ${roomCode} supprimée (vide)`);
                } else {
                    // Si l'hôte part, réassigner l'hôte au premier joueur restant
                    if (player.isHost) {
                        room.players[0].isHost = true;
                    }
                    io.to(roomCode).emit('updateLobby', room.players);
                    
                    if (room.state === 'playing') {
                        // Logique basique: alerter les joueurs, on met fin à la partie pour l'instant
                        io.to(roomCode).emit('error', 'Un joueur s\'est déconnecté. La partie est annulée.');
                        room.state = 'lobby';
                        io.to(roomCode).emit('gameCancelled');
                    }
                }
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur en écoute sur http://localhost:${PORT}`);
});
