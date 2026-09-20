const Card = require('./Card');

class Deck {
    constructor() {
        this.cards = [];
        this.initialize();
    }

    initialize() {
        this.cards = [];
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        // L'ordre de puissance : 3=1, 4=2, ..., 10=8, J=9, Q=10, K=11, A=12, 2=13
        const values = [
            { v: '3', p: 1 }, { v: '4', p: 2 }, { v: '5', p: 3 }, { v: '6', p: 4 },
            { v: '7', p: 5 }, { v: '8', p: 6 }, { v: '9', p: 7 }, { v: '10', p: 8 },
            { v: 'J', p: 9 }, { v: 'Q', p: 10 }, { v: 'K', p: 11 }, { v: 'A', p: 12 }, { v: '2', p: 13 }
        ];

        for (let suit of suits) {
            for (let val of values) {
                this.cards.push(new Card(suit, val.v, val.p));
            }
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw() {
        return this.cards.pop();
    }
}

module.exports = Deck;
