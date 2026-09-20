const socket = io();

// Éléments DOM
const screens = {
    home: document.getElementById('home-screen'),
    lobby: document.getElementById('lobby-screen'),
    game: document.getElementById('game-screen')
};

const inputs = {
    playerName: document.getElementById('player-name'),
    roomCode: document.getElementById('room-code-input')
};

const buttons = {
    createRoom: document.getElementById('btn-create-room'),
    joinRoom: document.getElementById('btn-join-room'),
    startGame: document.getElementById('btn-start-game'),
    leaveGame: document.getElementById('btn-leave-game'),
    pass: document.getElementById('btn-pass')
};

const displays = {
    error: document.getElementById('error-msg'),
    lobbyRoomCode: document.getElementById('lobby-room-code'),
    playersList: document.getElementById('players-list'),
    playerCount: document.getElementById('player-count'),
    hostControls: document.getElementById('host-controls'),
    waitingMsg: document.getElementById('waiting-msg'),
    gameRoomCode: document.getElementById('game-room-code'),
    turnIndicator: document.getElementById('turn-indicator'),
    opponentsContainer: document.getElementById('opponents-container'),
    tableCards: document.getElementById('table-cards'),
    myHand: document.getElementById('my-hand')
};

let currentRoom = null;
let isHost = false;

// Fonctions Utilitaires
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
    displays.error.textContent = '';
}

function showError(msg) {
    displays.error.textContent = msg;
    setTimeout(() => { displays.error.textContent = ''; }, 5000);
}

// Événements Utilisateur
buttons.createRoom.addEventListener('click', () => {
    const name = inputs.playerName.value.trim();
    if (!name) return showError('Veuillez entrer un pseudo.');
    socket.emit('createRoom', name);
});

buttons.joinRoom.addEventListener('click', () => {
    const name = inputs.playerName.value.trim();
    const code = inputs.roomCode.value.trim().toUpperCase();
    if (!name) return showError('Veuillez entrer un pseudo.');
    if (!code || code.length !== 5) return showError('Code de room invalide.');
    socket.emit('joinRoom', { roomCode: code, playerName: name });
});

buttons.startGame.addEventListener('click', () => {
    if (currentRoom) {
        socket.emit('startGame', currentRoom);
    }
});

buttons.leaveGame.addEventListener('click', () => {
    window.location.reload(); // Simple pour l'instant
});

// Événements Socket
socket.on('roomCreated', (roomCode) => {
    currentRoom = roomCode;
    isHost = true;
    displays.lobbyRoomCode.textContent = roomCode;
    displays.hostControls.style.display = 'block';
    displays.waitingMsg.style.display = 'none';
    showScreen('lobby');
});

socket.on('roomJoined', (roomCode) => {
    currentRoom = roomCode;
    isHost = false;
    displays.lobbyRoomCode.textContent = roomCode;
    displays.hostControls.style.display = 'none';
    displays.waitingMsg.style.display = 'block';
    showScreen('lobby');
});

socket.on('updateLobby', (players) => {
    displays.playersList.innerHTML = '';
    displays.playerCount.textContent = players.length;
    
    // Mettre à jour l'état de l'hôte si besoin (en cas de déco de l'hôte précédent)
    const me = players.find(p => p.id === socket.id);
    if (me) {
        isHost = me.isHost;
        if (isHost) {
            displays.hostControls.style.display = 'block';
            displays.waitingMsg.style.display = 'none';
        }
    }

    players.forEach(player => {
        const li = document.createElement('li');
        li.textContent = player.name + (player.isHost ? ' (Hôte)' : '');
        displays.playersList.appendChild(li);
    });

    if (isHost) {
        buttons.startGame.disabled = players.length < 4;
    }
});

socket.on('gameStarted', () => {
    showScreen('game');
    displays.gameRoomCode.textContent = currentRoom;
});

socket.on('gameState', (state) => {
    renderGameState(state);
});

socket.on('roundFinished', (players) => {
    let rolesText = players.map(p => `${p.name}: ${p.role}`).join('\n');
    alert("Manche terminée !\nRôles :\n" + rolesText);
});

function renderGameState(state) {
    const { currentPlayerIndex, table, players, myHand } = state;
    const isMyTurn = players[currentPlayerIndex].isMe;
    
    // Info
    displays.turnIndicator.textContent = isMyTurn ? "C'est à votre tour !" : `Au tour de ${players[currentPlayerIndex].name}`;
    
    // Tapis
    displays.tableCards.innerHTML = '';
    if (table.length > 0) {
        const lastPlay = table[table.length - 1];
        lastPlay.forEach(card => {
            displays.tableCards.appendChild(createCardElement(card, false));
        });
    } else {
        displays.tableCards.innerHTML = '<span style="color: #ecf0f1; font-style: italic;">Table vide</span>';
    }

    // Adversaires
    displays.opponentsContainer.innerHTML = '';
    players.forEach((p, index) => {
        if (!p.isMe) {
            const div = document.createElement('div');
            div.className = 'opponent' + (index === currentPlayerIndex ? ' is-turn' : '');
            div.innerHTML = `
                <strong>${p.name}</strong><br>
                <span>${p.cardCount} cartes</span>
                ${p.hasPassed ? '<br><span style="color: #e74c3c;">A passé</span>' : ''}
                ${p.role ? `<br><small>${p.role}</small>` : ''}
            `;
            displays.opponentsContainer.appendChild(div);
        }
    });

    // Ma main
    displays.myHand.innerHTML = '';
    myHand.forEach((card, index) => {
        const cardEl = createCardElement(card, true);
        cardEl.addEventListener('click', () => {
            if (!isMyTurn) return;
            
            // Logique de clic automatique
            const cardsOfSameValueIndices = [];
            myHand.forEach((c, i) => {
                if (c.value === card.value) cardsOfSameValueIndices.push(i);
            });
            
            let indicesToPlay = [];
            if (table.length > 0) {
                const requiredCount = table[table.length - 1].length;
                if (cardsOfSameValueIndices.length >= requiredCount) {
                    // On prend exactement le nombre requis
                    indicesToPlay = cardsOfSameValueIndices.slice(0, requiredCount);
                } else {
                    return showError(`Vous devez jouer ${requiredCount} carte(s) de même valeur.`);
                }
            } else {
                // Table vide : on joue toutes les cartes de cette valeur
                indicesToPlay = cardsOfSameValueIndices;
            }

            if (indicesToPlay.length > 0) {
                socket.emit('playCards', { roomCode: currentRoom, cardIndices: indicesToPlay });
            }
        });
        displays.myHand.appendChild(cardEl);
    });

    // Boutons d'action
    buttons.pass.style.display = isMyTurn ? 'inline-block' : 'none';
}

function getSuitSymbol(suit) {
    switch(suit) {
        case 'hearts': return '♥';
        case 'diamonds': return '♦';
        case 'clubs': return '♣';
        case 'spades': return '♠';
        default: return '';
    }
}

function createCardElement(card, isClickable) {
    const el = document.createElement('div');
    el.className = 'card ' + (card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black');
    if (!isClickable) el.classList.add('card-on-table');
    el.innerHTML = `<span>${card.value}</span><span>${getSuitSymbol(card.suit)}</span>`;
    return el;
}

// Actions de jeu
buttons.pass.addEventListener('click', () => {
    socket.emit('passTurn', currentRoom);
});

socket.on('gameCancelled', () => {
    alert('La partie a été annulée car un joueur a quitté.');
    showScreen('lobby');
});

socket.on('error', (msg) => {
    showError(msg);
});
