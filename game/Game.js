const Card = require('./Card');
const Deck = require('./Deck');

class Game {
    constructor(players) {
        this.players = players.map(p => ({
            ...p,
            hand: [],
            role: null, // 'president', 'vice-president', 'vice-trou-du-cul', 'trou-du-cul', 'neutre'
            hasPassed: false,
            rank: null // Ordre de fin dans la manche
        }));
        
        this.deck = new Deck();
        this.table = []; // Cartes posées au centre (le dernier pli)
        this.currentPlayerIndex = 0;
        this.turnHistory = []; // Pour savoir qui a posé quoi
        this.lastPlayerToPlayIndex = -1; // Le dernier à avoir posé des cartes
        this.ranksAssigned = 0;
        this.state = 'dealing'; // dealing, exchange, playing, finished
    }

    startRound() {
        this.deck.initialize();
        this.deck.shuffle();
        this.table = [];
        this.turnHistory = [];
        this.ranksAssigned = 0;
        this.players.forEach(p => {
            p.hand = [];
            p.hasPassed = false;
            p.rank = null;
        });

        // Distribution
        let playerIndex = 0;
        while (this.deck.cards.length > 0) {
            this.players[playerIndex].hand.push(this.deck.draw());
            playerIndex = (playerIndex + 1) % this.players.length;
        }

        // Tri des mains
        this.players.forEach(p => {
            p.hand.sort((a, b) => a.power - b.power);
        });

        // Gestion de l'échange de cartes si des rôles sont déjà assignés
        const hasRoles = this.players.some(p => p.role);
        if (hasRoles) {
            this.state = 'exchange';
            // TODO: Gérer l'attente des choix d'échange
            // Pour l'instant on skip l'échange dans cette v1 de base et on passe à 'playing'
            this.state = 'playing';
            this.determineFirstPlayer();
        } else {
            this.state = 'playing';
            this.determineFirstPlayer();
        }
    }

    determineFirstPlayer() {
        // En général, le Trou du cul commence (s'il y a des rôles), 
        // sinon aléatoire ou celui qui a la Dame de Coeur (selon les variantes).
        // Ici, on fait simple : premier joueur aléatoire pour la première manche, 
        // ou le Trou du cul pour les suivantes.
        const trouDuCulIndex = this.players.findIndex(p => p.role === 'trou-du-cul');
        if (trouDuCulIndex !== -1) {
            this.currentPlayerIndex = trouDuCulIndex;
        } else {
            this.currentPlayerIndex = Math.floor(Math.random() * this.players.length);
        }
        this.lastPlayerToPlayIndex = this.currentPlayerIndex;
    }

    getGameState(playerId) {
        return {
            state: this.state,
            currentPlayerIndex: this.currentPlayerIndex,
            lastPlayerToPlayIndex: this.lastPlayerToPlayIndex,
            table: this.table,
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                cardCount: p.hand.length,
                role: p.role,
                hasPassed: p.hasPassed,
                rank: p.rank,
                isMe: p.id === playerId
            })),
            myHand: this.players.find(p => p.id === playerId)?.hand || []
        };
    }

    playCards(playerId, cardIndices) {
        if (this.state !== 'playing') throw new Error("Le jeu n'est pas en cours.");
        
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        if (playerIndex !== this.currentPlayerIndex) throw new Error("Ce n'est pas votre tour.");
        
        const player = this.players[playerIndex];
        if (player.hasPassed || player.hand.length === 0) throw new Error("Vous ne pouvez pas jouer.");

        const cardsToPlay = cardIndices.map(i => player.hand[i]);
        
        // Vérification de validité (même valeur)
        const firstValue = cardsToPlay[0].value;
        if (!cardsToPlay.every(c => c.value === firstValue)) {
            throw new Error("Toutes les cartes doivent avoir la même valeur.");
        }

        // Vérification par rapport au centre de la table
        if (this.table.length > 0) {
            const lastPlay = this.table[this.table.length - 1];
            if (cardsToPlay.length !== lastPlay.length) {
                throw new Error(`Vous devez jouer exactement ${lastPlay.length} carte(s).`);
            }
            if (cardsToPlay[0].power < lastPlay[0].power) {
                throw new Error("Vous devez jouer des cartes de valeur supérieure ou égale.");
            }
        }

        // Retirer les cartes de la main
        // On trie les indices de manière décroissante pour ne pas fausser le splice
        cardIndices.sort((a, b) => b - a).forEach(i => {
            player.hand.splice(i, 1);
        });

        this.table.push(cardsToPlay);
        this.lastPlayerToPlayIndex = playerIndex;
        
        // Réinitialiser les "pass" des autres joueurs (car un nouveau pli commence techniquement)
        // Mais attention, dans la Présidente, si tu as passé, tu as passé pour TOUT le pli courant.
        // Les "pass" sont réinitialisés quand tout le monde a passé.

        this.checkPlayerFinished(playerIndex);
        
        // Si la carte jouée est un 2, on ferme le pli immédiatement
        if (firstValue === '2') {
            this.resolveTrick();
            this.checkRoundFinished();
        } else {
            this.nextTurn();
        }
    }

    pass(playerId) {
        if (this.state !== 'playing') throw new Error("Le jeu n'est pas en cours.");
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        if (playerIndex !== this.currentPlayerIndex) throw new Error("Ce n'est pas votre tour.");
        
        this.players[playerIndex].hasPassed = true;
        this.nextTurn();
    }

    nextTurn() {
        let nextIndex = (this.currentPlayerIndex + 1) % this.players.length;
        let loopCount = 0;

        // Trouver le prochain joueur qui n'a pas fini et qui n'a pas passé
        while ((this.players[nextIndex].hand.length === 0 || this.players[nextIndex].hasPassed) && loopCount < this.players.length) {
            nextIndex = (nextIndex + 1) % this.players.length;
            loopCount++;
        }

        // Si on revient au dernier joueur qui a joué, c'est qu'il a gagné le pli
        if (nextIndex === this.lastPlayerToPlayIndex || loopCount === this.players.length) {
            this.resolveTrick();
        } else {
            this.currentPlayerIndex = nextIndex;
        }

        this.checkRoundFinished();
    }

    resolveTrick() {
        // Le pli est terminé. Le dernier à avoir joué gagne le pli.
        this.table = [];
        this.players.forEach(p => {
            if (p.hand.length > 0) p.hasPassed = false; // Seuls ceux en jeu peuvent rejouer
        });
        
        // Le joueur qui a remporté le pli relance.
        // S'il n'a plus de cartes, c'est le joueur suivant encore en jeu qui relance.
        let nextIndex = this.lastPlayerToPlayIndex;
        let loopCount = 0;
        while (this.players[nextIndex].hand.length === 0 && loopCount < this.players.length) {
             nextIndex = (nextIndex + 1) % this.players.length;
             loopCount++;
        }
        this.currentPlayerIndex = nextIndex;
        this.lastPlayerToPlayIndex = nextIndex;
    }

    checkPlayerFinished(playerIndex) {
        const player = this.players[playerIndex];
        if (player.hand.length === 0 && player.rank === null) {
            this.ranksAssigned++;
            player.rank = this.ranksAssigned;
        }
    }

    checkRoundFinished() {
        // La manche est finie s'il ne reste qu'un seul joueur avec des cartes
        const playersWithCards = this.players.filter(p => p.hand.length > 0);
        if (playersWithCards.length <= 1) {
            this.state = 'finished';
            if (playersWithCards.length === 1) {
                playersWithCards[0].rank = this.players.length; // Le dernier est le trou du cul
            }
            this.assignRoles();
        }
    }

    assignRoles() {
        const numPlayers = this.players.length;
        this.players.forEach(p => {
            if (p.rank === 1) p.role = 'president';
            else if (p.rank === 2 && numPlayers >= 4) p.role = 'vice-president';
            else if (p.rank === numPlayers) p.role = 'trou-du-cul';
            else if (p.rank === numPlayers - 1 && numPlayers >= 4) p.role = 'vice-trou-du-cul';
            else p.role = 'neutre';
        });
    }
}

module.exports = Game;
