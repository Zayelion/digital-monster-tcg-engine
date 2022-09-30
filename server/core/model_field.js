// You should be drinking scotch and listening to german electronica while reading this.

/**
 * @file Creates instances of game state, and methods of manipulating them.
 */

/**
 * @typedef {Object} Pile
 * @property {String} type Card/Token/Etc
 * @property {String} movelocation 'DECK'/'EGG' etc, in caps. 
 * @property {Number} player player int 0,1, etc of controlling player
 * @property {Number} originalController  player int 0,1, etc of owner
 * @property {Number} index  sequence of the card in the stack group. Example, nth card of DECK.
 * @property {Number} unique unique ID of the card
 * @property {Number} id   passcode of the card
 * @property {Object} counters  counters on the card
 * @property {Number} overlayIndex  counters on the card
 * @property {String} position Faceup, Facedown, etc
 */

/**
 * @typedef  {Object} FieldView
 * @property {Pile[]} DECK Cards in the deck of one player.
 * @property {Pile[]} HAND Cards in the hand of one player.
 * @property {Pile[]} TRASH Cards in the trashyard "GY" of one player.
 * @property {Pile[]} EGG Cards in the egg deck of one player.
 * @property {Pile[]} SECURITY Cards SECURITY from play,"Banished" of one player.
 * @property {Pile[]} BREEDINGZONE Cards in the spell and pendulum zones of one player.
 * @property {Pile[]} BATTLEZONE Cards in the Main Monster zones and Extra Monster zone of one player.
 * @property {Pile[]} EXCAVATED Cards Excavated by one player atm, or held.
 * @property {Pile[]} INMATERIAL Tokens removed from the board after being created.
 */

/**
 * @typedef {Object} GameState
 * @property {Number} turn Current total turn count
 * @property {Number} turnOfPlayer player int, 0, 1, etc that is currently making moves
 * @property {Array.<Number>} lifepoints LP count of all players
 */

/**
 * @typedef  {Object} UIPayloadUnit
 * @property {String} action Action the UI cases off of when it gets this message
 * @property {GameState} state State of the game for the UI to update itself with
 * @property {FieldView} view view of the field
 */

/**
 * @typedef  {Object} UIPayload
 * @property {Array.<String>} name Names of each player
 * @property {UIPayloadUnit} p0 State of the game for the UI to update itself with
 * @property {UIPayloadUnit} p1 view of the field
 * @property {Number} player slot of the player, shifts view angle.
 * @property {UIPayloadUnit} spectator
 */

/**
 * @typedef {Function} UICallback callback of initiation module, shoots directly to UI.
 * @param {UIPayload} view view of the field
 * @param {Pile[]} payload updated cards
 * @param {Function(Card[]))} }
 */


/**
 * @typedef  {Object} FieldCoordinate
 * @property {Number} uid   Unique card identifier in this game
 * @property {Number} player current player int 0,1, etc of controlling player
 * @property {String} location current location of the target card 'DECK'/'EGG' etc, in caps. 
 * @property {Number} index  current sequence of the card in the stack group. Example, nth card of DECK. in the current location
 * @property {Number} code passcode of the card
 */

 const deckPiles = ['DECK', 'HAND', 'EGG', 'SECURITY'],
 EventEmitter = require('events'), // a way to "notice" things occuring
 uniqueIdenifier = require('uuid/v4'); // time based unique identifier, RFC4122 version 1


/**
* Sort function, sorts by card index
* @param   {Pile}   first  card Object
* @param   {Pile}   second card Object
* @returns {Number}  if it comes before or after
*/
function sortByIndex(first, second) {
 return first.state.index - second.state.index;
}

/**
* Filters out cards based on if they are a specific UID
* @param {Pile[]} stack a stack of cards attached to a single monster as overlay units.
* @param {Number} uid unique identifier
* @returns {Boolean} if a card is that UID
*/
function getByUID(stack, uid) {
 return stack.find(function (item) {
     return item.uid === uid;
 });
}

/**
* Filters out cards based on if they are a specific UID
* @param {Pile[]} stack a stack of cards attached to a single monster as overlay units.
* @param {Number} uid unique identifier
* @returns {Boolean} if a card is that UID
*/
function getByOrigin(stack, uid) {
 return stack.find(function (item) {
     return item.state.origin === uid;
 });
}

function Pile(movelocation, player, index, uid, id) {
 const state = {
     player: player,
     location: movelocation,
     index: index,
     position: 'FaceDown',
     counters: 0,
     origin: uid,
     list: [{ id, uid, list: [], originalcontroller: player }]
 };

 function render() {
     return state.list.reduce((output, card, overlayindex) => {
         output.push(Object.assign({ overlayindex }, card, state));
         return output;
     }, []);
 }

 function attach(card, sequence) {
     state.list.splice(sequence, 0, card);
 }

 function detach(sequence) {
     const card = state.list.splice(sequence, 1)[0];
     return card;
 }

 function update(data) {
     if (!data) {
         return;
     }
     Object.assign(state, data);
 }

 return {
     attach,
     detach,
     render,
     update,
     state
 };
}

function Field() {
 const stack = [],
     lookup = {};

 function cards() {
     return stack.reduce((output, pile) => {
         output = output.concat(pile.render());
         return output;
     }, []);
 }

 function length() {
     return stack.length;
 }

 function search(query) {
     const code = query.player + query.location + query.index,
         card = lookup[code] || stack.find((pile) => {
             return (
                 pile.state.player === query.player
                 && pile.state.location === query.location
                 && pile.state.index === query.index);
         });
     return card;
 }

 function add(movelocation, player, index, code = 'unknown') {
     const uuid = uniqueIdenifier();
     stack.push(new Pile(movelocation, player, index, uuid, code));
 }

 function remove(query) {
     const card = search(query);
     card.location = 'INMATERIAL';
 }

 function cleanCounters() {
     const list = stack.filter((pile) => {
         return (
             pile.state.location === 'DECK'
             || pile.state.location === 'HAND'
             || pile.state.location === 'EGG'
             || pile.state.location === 'TRASH'
             || pile.state.location === 'SECURITY'
         );
     });
     list.forEach((pile) => {
         pile.state.counters = {};
     });
 }

 function updateIndex() {
     stack.forEach((card) => {
         var code = card.state.player + card.state.location + card.state.index;
         lookup[code] = (card.state.list.length) ? card : undefined;
     });
 }
 function reIndex(player, location) {
     const zone = stack.filter((pile) => {
         return (pile.state.player === player && pile.state.location === location);
     });

     if (location === 'EGG') {
         zone.sort(function (primary, secondary) {
             if (primary.position === secondary.position) {
                 return 0;
             }
             if (primary.position === 'FaceUp' && secondary.position !== 'FaceUp') {
                 return 1;
             }
             if (secondary.position === 'FaceUp' && primary.position !== 'FaceUp') {
                 return -1;
             }
         });
     }

     zone.sort(sortByIndex);

     zone.forEach(function (pile, index) {
         pile.state.index = index;
     });

     stack.sort(sortByIndex);
     updateIndex();
 }



 function move(previous, current) {
     const pile = search(previous);
     if (!pile) {
         console.log('error', previous, current);
     }

     pile.state.player = current.player;
     pile.state.location = current.location;
     pile.state.index = current.index;
     pile.state.position = current.position;

     if (pile.state.list[0].id !== undefined) {
         pile.state.list[0].id = current.id;
     }

     if (pile.state.location === 'HAND') {
         pile.state.position = 'FaceUp';
     }

     reIndex(current.player, 'TRASH');
     reIndex(current.player, 'HAND');
     reIndex(current.player, 'EGG');
     reIndex(current.player, 'EXCAVATED');

     cleanCounters();
 }

 function detach(previous, sequence, current) {
     const parent = search(previous),
         card = parent.detach(sequence),
         original = getByOrigin(stack, card.uid);

     original.state.list = [card];
     move(original.state, current);
 }

 function attach(previous, current) {
     const parent = search(previous),
         adopter = search(current);

     adopter.state.list.push(parent.state.list.shift());
 }

 function take(previous, sequence, current) {
     const donor = search(previous),
         card = donor.detach(sequence),
         recipient = search(current);

     recipient.attach(card);
 }

 function evolve(previous, current) {
     const target = search(current),
         materials = search(previous);

     target.cards = target.cards.concat(materials.cards);
     materials.cards = [];
 }

 function addCounter(query, type, amount) {
     const card = search(query);
     if (!card.counters[type]) {
         card.counters[type] = 0;
     }
     card.counters[type] += amount;
 }

 function update(data) {
     //console.log(data.player, data.location, data.index, stack.length);
     try {
         const pile = search(data);
         if (pile) {
             pile.update(data);
             return;
         }
        // console.log('error', data);
     } catch (error) {
         console.log(error, 'no card at', data);
     }
 }

 return {
     add,
     addCounter,
     attach,
     cards,
     detach,
     move,
     evolve,
     reIndex,
     remove,
     take,
     update,
     updateIndex
 };
}

/**
* Filters out cards based on player.
* @param {Pile[]} stack Array a stack of cards.
* @param {Number} player player int 0,1, etc0 or 1
* @returns {Pile[]} a stack of cards that belong to only one specified player. 
*/
function filterPlayer(stack, player) {

 return stack.filter(function (item) {
     return item.player === player;
 });
}

/**
* Filters out cards based on zone.
* @param {Pile[]} stack a stack of cards.
* @param {String} location zone the card is in.
* @returns {Pile[]} a stack of cards that are in only one location/zone.
*/
function filterlocation(stack, location) {
 return stack.filter(function (item) {
     return item.location === location;
 });
}

/**
* Changes a view of cards so the opponent can not see what they are.
* @param   {Pile[]} view a collection of cards
* @returns {Pile[]} a collection of cards
*/
function hideViewOfZone(view) {
 var output = [];
 view.forEach(function (card, index) {
     output[index] = {};
     Object.assign(output[index], card);
     if (output[index].position === 'FaceDown' || output[index].position === 'FaceDownDefence' || output[index].position === 'FaceDownDefense') {
         output[index].id = 'unknown';
         output[index].counters = {};
         delete output[index].originalcontroller;
     }
 });

 return output;
}

/**
* Changes a view of cards so the opponent can not see what they are.
* @param   {Pile[]} view a collection of cards
* @param   {Boolean} allowed is the player allowed to see the card?
* @returns {Pile[]} a collection of cards
*/
function hideViewOfExtra(view, allowed) {
 var output = [];
 view.forEach(function (card, index) {
     output[index] = {};
     Object.assign(output[index], card);
     // if (card.position === 'FaceUpAttack') {
     //     output[index].id = (allowed) ? card.id : 0;
     // }
 });

 return output;
}


/**
* Changes a view of cards in the hand so the opponent can not see what they are.
* @param   {Pile[]} view a collection of cards
* @returns {Pile[]} a collection of cards
*/
function hideHand(view) {
 var output = [];
 view.forEach(function (card, index) {
     output[index] = {};
     Object.assign(output[index], card);    
         output[index].position = (card.isPublic) ? 'FaceUp' : 'FaceDown';
     if (!card.isPublic) {
         output[index].id = 'unknown';
     }
 });

 return output;
}


class Game {

 constructor(callback) {
     if (typeof callback !== 'function') {
         throw new Error('UI Output Callback required');
     }

     this.callback = callback;
     this.answerListener = new EventEmitter();
     this.lastQuestion = {};
     this.stack = new Field();
     this.addCard = this.stack.add;
     this.removeCard = this.stack.remove.bind(this.stack);
     this.moveCard = this.stack.move.bind(this.stack);
     this.attachMaterial = this.stack.attach.bind(this.stack);
     this.detachMaterial = this.stack.detach.bind(this.stack);
     this.takeMaterial = this.stack.take.bind(this.stack);
     this.evolve = this.stack.evolve.bind(this.stack);
     this.update = this.stack.update.bind(this.stack);
     this.previousStack = [];
     this.names = ['', ''];
     this.state = {
         turn: 0,
         turnOfPlayer: 0,
         phase: 0,
         lifepoints: [
             8000,
             8000
         ]
     };
     this.decks = {
         0: {
             main: [],
             egg: [],
             side: []
         },
         1: {
             main: [],
             egg: [],
             side: []
         }
     }; // holds decks
     return this;
 }

 getState() {
     return Object.assign(this.info, {
         names: this.names,
         stack: this.stack
     });
 }

 setState(message) {
     this.stack.move({
         player: message.player,
         location: message.location,
         index: message.index
     }, {
         player: message.moveplayer,
         location: message.movelocation,
         index: message.moveindex,
         position: message.moveposition
     });
     this.callback(this.generateView(), this.stack.cards());
 }

 /**
  * Set a username to a specific slot on lock in.
  * @public
  * @param {any} slot Index in names
  * @param {any} username name of the player
  * @returns {undefined}
  */
 setNames(slot, username) {
     this.names[slot] = username;
 }

 findUIDCollection(uid) {
     return getByUID(this.stack.cards(), uid);
 }

 findUIDCollectionPrevious(uid) {
     return getByUID(this.previousStack, uid);
 }

 filterEdited(cards) {
     return cards.filter((card) => {
         var newCards = this.findUIDCollection(card.uid),
             oldCards = this.findUIDCollectionPrevious(card.uid) || {};
         return !Object.keys(newCards).every(function (key) {
             return newCards[key] === oldCards[key];
         });
     });
 }

 /**
  * Generate the view of the field, for use by YGOPro MSG_UPDATE_DATA to get counts.
  * @param   {Number} player player int 0,1, etcthe given player
  * @returns {Object} all the cards the given player can see on their side of the field.
  */
 generateViewCount(player) {
     var playersCards = filterPlayer(this.stack.cards(), player),
         deck = filterlocation(playersCards, 'DECK'),
         hand = filterlocation(playersCards, 'HAND'),
         trash = filterlocation(playersCards, 'TRASH'),
         egg = filterlocation(playersCards, 'EGG'),
         security = filterlocation(playersCards, 'SECURITY'),
         breedingzone = filterlocation(playersCards, 'BREEDINGZONE'),
         battlezone = filterlocation(playersCards, 'BATTLEZONE'),
         onfield = filterlocation(playersCards, 'ONFIELD');

     return {
         DECK: deck.length,
         HAND: hand.length,
         TRASH: trash.length,
         EGG: egg.length,
         SECURITY: security.length,
         BREEDINGZONE: breedingzone.length,
         BATTLEZONE: battlezone.length,
         ONFIELD: onfield.length
     };
 }
 /**
  * Generate the view of the field, for use by YGOPro MSG_UPDATE_DATA to update data.
  * @param   {Number} player player int 0,1, etcthe given player
  * @returns {Object} all the cards the given player can see on their side of the field.
  */
 generateUpdateView(player) {
     var playersCards = filterPlayer(this.stack.cards(), player),
         deck = filterlocation(playersCards, 'DECK'),
         hand = filterlocation(playersCards, 'HAND'),
         trash = filterlocation(playersCards, 'TRASH'),
         egg = filterlocation(playersCards, 'EGG'),
         security = filterlocation(playersCards, 'SECURITY'),
         breedingzone = filterlocation(playersCards, 'BREEDINGZONE'),
         battlezone = filterlocation(playersCards, 'BATTLEZONE'),
         onfield = filterlocation(playersCards, 'ONFIELD');

     return {
         DECK: deck.sort(sortByIndex),
         HAND: hand.sort(sortByIndex),
         TRASH: trash.sort(sortByIndex),
         EGG: egg.sort(sortByIndex),
         SECURITY: security.sort(sortByIndex),
         BREEDINGZONE: breedingzone.sort(sortByIndex),
         BATTLEZONE: battlezone.sort(sortByIndex),
         ONFIELD: onfield.sort(sortByIndex)
     };
 }

 /**
  * Generate the view for a specific given player
  * @param   {Number} player player int 0,1, etcthe given player
  * @returns {Object} all the cards the given player can see on their side of the field.
  */
 generateSinglePlayerView(player) {
     var playersCards = this.filterEdited(filterPlayer(JSON.parse(JSON.stringify(this.stack.cards())), player)),
         deck = filterlocation(playersCards, 'DECK'),
         hand = filterlocation(playersCards, 'HAND'),
         trash = filterlocation(playersCards, 'TRASH'),
         egg = filterlocation(playersCards, 'EGG'),
         security = filterlocation(playersCards, 'SECURITY'),
         breedingzone = filterlocation(playersCards, 'BREEDINGZONE'),
         battlezone = filterlocation(playersCards, 'BATTLEZONE'),
         excavated = filterlocation(playersCards, 'EXCAVATED'),
         inmaterial = filterlocation(playersCards, 'INMATERIAL'),
         onfield = filterlocation(playersCards, 'ONFIELD');

     return {
         DECK: hideViewOfZone(deck),
         HAND: hand,
         TRASH: trash,
         EGG: egg, //hideViewOfExtra(egg, true),
         SECURITY: security,
         BREEDINGZONE: breedingzone,
         BATTLEZONE: battlezone,
         EXCAVATED: excavated,
         INMATERIAL: inmaterial,
         ONFIELD: onfield
     };
 }

 /**
  * Generate the view for a spectator or opponent
  * @param   {Number} player player int 0,1, etcthe given player
  * @returns {Object} all the cards the given spectator/opponent can see on that side of the field.
  */
 generateSinglePlayerSpectatorView(player) {
     var playersCards = this.filterEdited(filterPlayer(JSON.parse(JSON.stringify(this.stack.cards())), player)),
         deck = filterlocation(playersCards, 'DECK'),
         hand = filterlocation(playersCards, 'HAND'),
         trash = filterlocation(playersCards, 'TRASH'),
         egg = filterlocation(playersCards, 'EGG'),
         security = filterlocation(playersCards, 'SECURITY'),
         breedingzone = filterlocation(playersCards, 'BREEDINGZONE'),
         battlezone = filterlocation(playersCards, 'BATTLEZONE'),
         excavated = filterlocation(playersCards, 'EXCAVATED'),
         inmaterial = filterlocation(playersCards, 'INMATERIAL'),
         onfield = filterlocation(playersCards, 'ONFIELD');

     return {
         DECK: hideViewOfZone(deck),
         HAND: hideHand(hand),
         TRASH: trash,
         EGG: hideViewOfExtra(egg, false),
         SECURITY: hideViewOfZone(security),
         BREEDINGZONE: hideViewOfZone(breedingzone),
         BATTLEZONE: hideViewOfZone(battlezone),
         EXCAVATED: hideViewOfZone(excavated),
         INMATERIAL: inmaterial,
         onfield: onfield
     };
 }

 /**
  * Generate a full view of the field for a spectator.
  * @returns {Pile[]} complete view of the current field based on the stack.
  */
 generateSpectatorView() {
     return [
         this.generateSinglePlayerSpectatorView(0),
         this.generateSinglePlayerSpectatorView(1)
     ];
 }

 /**
  * Generate a full view of the field for a Player 1.
  * @returns {Pile[]} complete view of the current field based on the stack.
  */
 generatePlayer1View() {
     return [
         this.generateSinglePlayerView(0),
         this.generateSinglePlayerSpectatorView(1)
     ];
 }

 /**
  * Generate a full view of the field for a Player 2.
  * @returns {Pile[]} complete view of the current field based on the stack.
  */
 generatePlayer2View() {
     return [
         this.generateSinglePlayerSpectatorView(0),
         this.generateSinglePlayerView(1)
     ];
 }

 /**
  * Generate a full view of the field for all view types.
  * @param {string} action callback case statement this should trigger, defaults to 'duel'.
  * @returns {Object} complete view of the current field based on the stack for every view type.
  */
 generateView(action) {
     if (action === 'start') {
         this.previousStack = [];
     }
     var output = {
         names: this.names,
         p0: {
             duelAction: action || 'duel',
             info: this.state,
             field: this.generatePlayer1View(),
             player: 0
         },
         p1: {
             duelAction: action || 'duel',
             info: this.state,
             field: this.generatePlayer2View(),
             player: 1
         },
         spectator: {
             duelAction: action || 'duel',
             info: this.state,
             field: this.generateSpectatorView()
         }
     };
     this.previousStack = JSON.parse(JSON.stringify(this.stack.cards()));
     return output;
 }

 ygoproUpdate() {
     this.callback(this.generateView(), this.stack.cards());
 }

 /**
  * Creates a new card outside of initial start
  * @param {String} location     zone the card can be found in.
  * @param {Number} controller   player the card can be found under
  * @param {Number} sequence     exact index of card in the zone
  * @param {Number} position     position the card needs to be in   
  * @param {Number} code         passcode
  * @param {Number} index        index/sequence in the zone the card needs to become.
  * @returns {undefined}            
  */
 makeNewCard(location, controller, sequence, position, code, index) {
     this.stack.add({
         player: controller,
         location,
         controller,
         position,
         code,
         index
     });
     this.callback(this.generateView('newCard'), this.stack.cards());
 }


 /**
  * Finds a specific card and puts a counter on it.
  * @param {FieldCoordinate} query info to find the card
  * @param {String} type name of the counter
  * @param {Number} amount how many counters to add
  * @returns {undefined}
  */
 addCounter(query, type, amount) {
     this.field.addCounter(query, type, amount);
 }

 /**
  * Finds a specific card and remove a counter from it.
  * @param {FieldCoordinate} query info to find the card
  * @param {String} type name of the counter
  * @param {Number} amount how many counters to add
  * @return {undefined}
  */
 removeCounter(query, type, amount) {
     this.field.addCounter(query, type, (-1 * amount));
 }

 /**
  * Draws a card, updates state.
  * @param {Number} player           player indicator 0,1, etc       Player drawing the cards
  * @param {Number} numberOfCards    number of cards drawn
  * @param {Number[]} cards          passcodes of drawn cards
  * @param {Function} drawCallback   callback used by automatic
  * @returns {undefined}
  */
 drawCard(player, numberOfCards, cards, drawCallback) {
     var currenthand = filterlocation(filterPlayer(this.stack.cards(), player), 'HAND').length,
         topcard,
         deck;

     for (let i = 0; i < numberOfCards; i += 1) {
         deck = filterlocation(filterPlayer(this.stack.cards(), player), 'DECK');
         topcard = deck[deck.length - 1];
         this.stack.move({
             player: topcard.player,
             location: 'DECK',
             index: topcard.index
         }, {
             player,
             location: 'HAND',
             index: currenthand + i,
             position: 'FaceUp',
             id: cards[i].id || topcard.id
         });
     }

     this.callback(this.generateView(), this.stack.cards());
     if (typeof drawCallback === 'function') {
         drawCallback();
     }
 }


 /**
  * Triggers a callback that reveals the given array of cards to end users.
  * @param {Pile[]} reference reveal array of cards
  * @param {Number} player player int 0,1, etc
  * @param {function} call second callback
  * @returns {undefined}
  */
 revealCallback(reference, player, call) {
     var reveal = [];
     reference.forEach(function (card, index) {
         reveal.push(Object.assign({}, card));
         reveal[index].position = 'FaceUp'; // make sure they can see the card and all data on it.
     });
     this.callback({
         p0: {
             duelAction: 'reveal',
             info: this.state,
             reveal: reveal,
             call: call,
             player: player
         },
         p1: {
             duelAction: 'reveal',
             info: this.state,
             reveal: reveal,
             call: call,
             player: player
         },
         sepectators: {
             duelAction: 'reveal',
             info: this.state,
             reveal: reveal,
             call: call,
             player: player
         }
     }, this.stack.cards());
 }

 getField(view) {
     return this.generateView('start')[view];
 }




 /**
  * Exposed method to initialize the field; You only run this once.
  * @param {Object} player1 player instance
  * @param {Object} player2 player instance
  * @param {Boolean} manual if using manual, or automatic
  * @returns {undefined}
  */
 startDuel(player1, player2) {
     this.state.lifepoints = {
         0: 8000,
         1: 8000
     };

     player1.main.forEach((card, index) => {
         this.addCard('DECK', 0, index, card);
     });
     player2.main.forEach((card, index) => {
         this.addCard('DECK', 1, index, card);
     });

     player1.egg.forEach((card, index) => {
         this.addCard('EGG', 0, index, card);
     });
     player2.egg.forEach((card, index) => {
         this.addCard('EGG', 1, index, card);
     });
     this.stack.updateIndex();
     this.announcement(0, { command: 'MSG_ORIENTATION', slot: 0 });
     this.announcement(1, { command: 'MSG_ORIENTATION', slot: 1 });
     this.callback(this.generateView('start'), this.stack.cards());
 }

 /**
  * moves game to next phase.
  * @param {Number} phase enumeral
  * @returns {undefined}
  */
 nextPhase(phase) {
     this.state.phase = phase;
     this.callback(this.generateView(), this.stack.cards());
 }

 /**
  * Shifts the game to the start of the next turn and shifts the active player.
  * @returns {undefined}
  */
 nextTurn() {
     this.state.turn += 1;
     this.state.phase = 0;
     this.state.turnOfPlayer = (this.state.turnOfPlayer === 0) ? 1 : 0;
     this.callback(this.generateView(), this.stack.cards());
 }

 announcement(player, message) {
     const slot = 'p' + player,
         output = {
             names: this.names,
             p0: {},
             p1: {},
             spectator: {}
         };
     output[slot] = {
         duelAction: 'announcement',
         message
     };
     this.callback(output, this.stack.cards());
 }

 /**
  * Change lifepoints of a player
  * @param {Number} player player int 0,1, etcplayer to edit
  * @param {Number} amount amount of lifepoints to take or remove.
  * @param {String} username name of player being viewed.
  * @return {undefined}
  */
 changeLifepoints(player, amount) {
     this.state.lifepoints[player] = this.state.lifepoints[player] + amount;
     this.callback(this.generateView(), this.stack.cards());
 }

 /**
  * Send a question to the player
  * @param {Number} slot player
  * @param {String} type question typing
  * @param {Object[]} options information about the question
  * @param {Number} answerLength how many answers 
  * @param {Function} onAnswerFromUser callback function
  * @return {undefined}
  */
 question(slot, type, options, answerLength, onAnswerFromUser) {

     // Create a mock view to populate with information so it gets sent to the right place.

     var uuid = uniqueIdenifier(),
         output = {
             names: this.names,
             p0: {},
             p1: {},
             spectator: {}
         };
     this.lastQuestion = {
         slot,
         type,
         options,
         answerLength,
         onAnswerFromUser
     };

     output[slot] = {
         duelAction: 'question',
         type: type,
         options: options,
         answerLength: answerLength,
         uuid: uuid
     };


     // So when the user answers this question we can fire `onAnswerFromUser` and pass the data to it.
     // https://nodejs.org/api/events.html#events_emitter_once_eventname_listener
     this.answerListener.once(uuid, function (data) {
         onAnswerFromUser(data);
     });

     this.callback(output, this.stack.cards());
 }

 /**
  * Answer a queued up question
  * @param {Object} message response message
  * @returns {undefined}
  */
 respond(message) {
     this.answerListener.emit(message.uuid, message.answer);
 }

 retryLastQuestion() {
     console.log('retrying', this.lastQuestion.slot, this.lastQuestion.type, this.lastQuestion.options, this.lastQuestion.answerLength, this.lastQuestion.onAnswerFromUser);
     this.question(this.lastQuestion.slot, this.lastQuestion.type, this.lastQuestion.options, this.lastQuestion.answerLength, this.lastQuestion.onAnswerFromUser);
 }

}

module.exports = Game;