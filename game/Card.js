class Card {
    constructor(suit, value, power) {
        this.suit = suit;   // 'hearts', 'diamonds', 'clubs', 'spades'
        this.value = value; // '3', '4', ..., 'K', 'A', '2'
        this.power = power; // 1 to 13 (3 = 1, 2 = 13)
    }
}

module.exports = Card;
