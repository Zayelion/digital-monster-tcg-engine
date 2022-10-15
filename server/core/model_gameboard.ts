// You should be drinking scotch and listening to german electronica while reading this.

import { Deck } from './lib_validate_deck';

type FieldView = {
  DECK: Pile[];
  HAND: Pile[];
  TRASH: Pile[];
  EGG: Pile[];
  SECURITY: Pile[];
  BREEDINGZONE: Pile[];
  BATTLEZONE: Pile[];
  ONFIELD: Pile[];
  INMATERIAL: Pile[];
};

type FieldViewCount = {
  DECK: number;
  HAND: number;
  TRASH: number;
  EGG: number;
  SECURITY: number;
  BREEDINGZONE: number;
  BATTLEZONE: number;
  ONFIELD: number;
  INMATERIAL: number;
};

type GameState = {
  turn: number;
  turnOfPlayer: number;
  memory: number;
};

export type UIPayloadUnit = {
  action?: string;
  gameAction?: string;
  state?: GameState;
  view?: FieldView;
  player?: PLAYER;
  info?: any;
  field?: any;
  reveal?: any;
  call?: any;
};

export type UIPayload = {
  names?: string[];
  p0: UIPayloadUnit;
  p1: UIPayloadUnit;
  spectator: UIPayloadUnit;
};

export type Announcement = {
  command : string
  slot?: number
}

interface Query extends Partial<Pile> {
  player: PLAYER;
  location: LOCATION;
  index: number;
}

export type GameBoardState = {
  turn: number;
  turnOfPlayer: number;
  phase: number;
  memory: number;
};

export type MoveRequest = {
  player: PLAYER;
  location: LOCATION;
  index: number;
  moveplayer?: PLAYER;
  movelocation?: LOCATION;
  moveindex?: number;
  position?: string;
};

export type UICallback = (view: UIPayload, payload: Pile[]) => void;

const EventEmitter = require('events'), // a way to "notice" things occuring
  uniqueIdenifier = require('uuid/v4'); // time based unique identifier, RFC4122 version 1

/**
 * Sort function, sorts by card index
 */
function sortByIndex(first: Pile, second: Pile): number {
  return first.index - second.index;
}

/**
 * Filters out cards based on if they are a specific UID
 */
function getByUID(stack: Pile[], uid: string) {
  return stack.find(function (item) {
    return item.uid === uid;
  });
}

/**
 * Filters out cards based on if they are a specific UID
 */
function getByOrigin(stack: Pile[], uid: string) {
  return stack.find(function (item) {
    return item.origin === uid;
  });
}

/**
 * Represents a single card. Keeps track of all cards that are stacked under it.
 */
export class Pile {
  id: string;
  uid: string;
  player: PLAYER;
  location: LOCATION;
  index: number;
  position?: string;
  counters?: any;
  origin?: string;
  effects?: [];
  dp?: number;
  currentDP?: number;
  originalcontroller?: PLAYER;
  overlayindex?: number;
  list: Pile[];
  pileuid?: string;
  level?: LEVEL;
  type?: TYPE[];
  digivolutionCosts?: DigivolutionCost[];
  attribute?: ATTRIBUTE;
  blocked: boolean = false;
  playCost: number = 0;
  color: COLOR[] = [COLOR.COLORLESS];
  flags: any;
  isPublic: false;

  constructor(
    movelocation: LOCATION,
    player: PLAYER = 0,
    index: number = 0,
    uid: string = '',
    id: string = ''
  ) {
    this.id = id;
    this.uid = uid;
    this.player = player;
    this.location = movelocation;
    this.index = index;
    this.position = 'FaceDown';
    this.counters = {};
    this.origin = uid;
    this.effects = [];
    this.originalcontroller = player;

    this.list = [this];
  }

  /**
   * Returns the card and all items under it.
   */
  render(): Pile[] {
    return this.list.reduce((output, card, overlayindex) => {
      output.push(Object.assign({ overlayindex } as Pile, card, this));
      return output;
    }, []);
  }

  /**
   * Attaches a card underneath another card.
   */
  attach(card: Pile, sequence: number = this.list.length): void {
    card.pileuid = this.origin;
    this.list.splice(sequence, 0, card);
  }

  /**
   * Detaches a card from underneath another card and moves it somewhere.
   */
  detach(sequence): Pile {
    const card = this.list.splice(sequence, 1)[0];
    card.pileuid = undefined;
    return card;
  }

  /**
   * Change some meta information about a card.
   */
  update(data: Partial<Pile>): void {
    if (!data) {
      return;
    }
    Object.assign(this, data);
  }
}

/**
 * Represents all the cards on the gameboards.
 */
class Field {
  stack: Pile[] = [];
  lookup = {};

  constructor() {}

  /**
   * Return a list of all cards on the field.
   */
  cards(): Pile[] {
    return this.stack.reduce((output, pile) => {
      output = output.concat(pile.render());
      return output;
    }, []);
  }

  get length(): number {
    return this.stack.length;
  }

  /**
   * Find a specific card
   */
  search(query: Query): Pile {
    const code = query.player + query.location + query.index,
      card =
        this.lookup[code] ||
        this.stack.find((pile) => {
          return (
            pile.player === query.player &&
            pile.location === query.location &&
            pile.index === query.index
          );
        });
    return card;
  }

  /**
   * Add a new card to the field. Creates it from thin air.
   */
  add(location: LOCATION, player: PLAYER, index: number, code = 'unknown'): Pile {
    const uuid = uniqueIdenifier();
    const card = new Pile(location, player, index, uuid, code);
    this.stack.push(card);
    return card;
  }

  /**
   * Moves a card to location where it is marked as not to be interacted with.
   */
  remove(query: Query): Pile {
    const card = this.search(query);
    card.location = LOCATION.INMATERIAL;
    return card;
  }

  /**
   * Removes counters from places counters should not exist.
   */
  cleanCounters(): void {
    const list = this.stack.filter((pile: Pile) => {
      return (
        pile.location === LOCATION.DECK ||
        pile.location === LOCATION.HAND ||
        pile.location === LOCATION.EGG ||
        pile.location === LOCATION.TRASH ||
        pile.location === LOCATION.SECURITY
      );
    });
    list.forEach((pile) => {
      pile.counters = {};
    });
  }

  /**
   * Recalulates the lookup code for all the cards in a stack.
   */
  updateIndex(): void {
    this.stack.forEach((card: Pile) => {
      const code = card.player + card.location + card.index;
      this.lookup[code] = card.list.length ? card : undefined;
    });
  }

  /**
   * Reindexs all the cards in a field location.
   */
  reIndex(player: PLAYER, location: LOCATION): void {
    const zone = this.stack.filter((pile) => {
      return pile.player === player && pile.location === location;
    });

    if (location === LOCATION.EGG) {
      zone.sort(function (primary, secondary) {
        if (primary.position === secondary.position) {
          return 0;
        }
        if (primary.position === 'Unsuspended' && secondary.position !== 'Unsuspended') {
          return 1;
        }
        if (secondary.position === 'Unsuspended' && primary.position !== 'Unsuspended') {
          return -1;
        }
        return 0;
      });
    }

    zone.sort(sortByIndex);

    zone.forEach(function (pile, index) {
      pile.index = index;
    });

    this.stack.sort(sortByIndex);
    this.updateIndex();
  }

  /**
   * Moves a card from one location to another.
   */
  move(previous: Query, current: Query) {
    const pile = this.search(previous);
    if (!pile) {
      console.log('error', previous, current);
    }

    pile.player = current.player;
    pile.location = current.location;
    pile.index = current.index;
    pile.position = current.position || pile.position;

    if (pile.list[0].id !== undefined) {
      pile.list[0].id = current.id;
    }

    if (pile.location === LOCATION.HAND) {
      pile.position = 'Unsuspended';
    }

    this.reIndex(current.player, LOCATION.TRASH);
    this.reIndex(current.player, LOCATION.HAND);
    this.reIndex(current.player, LOCATION.EGG);
    this.reIndex(current.player, LOCATION.BATTLEZONE);
    this.reIndex(current.player, LOCATION.EXCAVATED);

    this.cleanCounters();

    return pile;
  }

  /**
   * Removes a card from under another card.
   */
  detach(previous: Query, sequence: number, current: Query): Pile {
    const parent = this.search(previous),
      card = parent.detach(sequence),
      original = getByOrigin(this.stack, card.uid);

    original.list = [card];
    this.move(original, current);
    return original;
  }

  /**
   * Places a card underneath another card.
   */
  attach(previous: Query, current: Query): Pile {
    const parent = this.search(previous),
      adopter = this.search(current);

    adopter.list.push(parent.list.shift());
    return adopter;
  }

  /**
   * Moves a card from underneath a card and places it underneath a different card.
   */
  take(previous: Query, sequence: number, current: Query) {
    const donor = this.search(previous),
      card = donor.detach(sequence),
      recipient = this.search(current);

    recipient.attach(card);
    return recipient;
  }

  /**
   * Takes a card and places it ontop of another card.
   */
  evolve(previous: Query, current: Query): Pile {
    const target = this.search(current),
      materials = this.search(previous);

    target.list = target.list.concat(materials.list);
    materials.list = [];
    return target;
  }

  /**
   * Places a counter on a card.
   */
  addCounter(query: Query, type: string, amount: number): Pile {
    const card = this.search(query);
    if (!card.counters[type]) {
      card.counters[type] = 0;
    }
    card.counters[type] += amount;
    return card;
  }

  /**
   * Updates the meta information of a card.
   */
  update(data: Query) {
    try {
      const pile = this.search(data);
      if (pile) {
        pile.update(data);
        return;
      }
    } catch (error) {
      console.log(error, 'no card at', data);
    }
  }
}

/**
 * Filters out cards based on player.
 */
function filterPlayer(stack: Pile[], player: PLAYER): Pile[] {
  return stack.filter(function (item) {
    return item.player === player;
  });
}

/**
 * Filters out cards based on zone.
 */
function filterlocation(stack: Pile[], location: LOCATION): Pile[] {
  return stack.filter(function (item) {
    return item.location === location;
  });
}

/**
 * Changes a view of cards so the opponent can not see what they are.
 */
function hideViewOfZone(view: Pile[]): Pile[] {
  const output: any[] = [];
  view.forEach(function (card, index) {
    output[index] = {} as Pile;
    Object.assign(output[index], card);
    if (
      output[index].position === 'FaceDown' ||
      output[index].position === 'FaceDownDefence' ||
      output[index].position === 'FaceDownDefense'
    ) {
      output[index].id = 'unknown';
      output[index].counters = {};
      delete output[index].originalcontroller;
    }
  });

  return output;
}

/**
 * Changes a view of cards so the opponent can not see what they are.
 */
function hideViewOfExtra(view: Pile[]): Pile[] {
  const output: any[] = [];
  view.forEach(function (card, index) {
    output[index] = {};

    Object.assign(output[index], card);
  });

  return output;
}

/**
 * Changes a view of cards in the hand so the opponent can not see what they are.
 */
function hideHand(view: Pile[]): Pile[] {
  const output: any[] = [];
  view.forEach(function (card, index) {
    output[index] = {};
    Object.assign(output[index], card);
    output[index].position = card.isPublic ? 'Unsuspended' : 'FaceDown';
    if (!card.isPublic) {
      output[index].id = 'unknown';
    }
  });

  return output;
}

export class GameBoard {
  callback: UICallback;
  answerListener;
  lastQuestion;
  stack: Field;
  getCards: Function;
  addCard: Function;
  removeCard: Function;
  moveCard: Function;
  attachMaterial: Function;
  detachMaterial: Function;
  takeMaterial: Function;
  evolve: Function;
  update: Function;
  previousStack = [];
  names: string[];
  state: GameBoardState;
  field;
  info;
  decks;
  memory: number = 0;

  constructor(callback: UICallback) {
    this.callback = callback;
    this.answerListener = new EventEmitter();
    this.lastQuestion = {};
    this.stack = new Field();
    this.getCards = this.stack.cards;
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
      memory: 0
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

  setState(message: MoveRequest): void {
    this.stack.move(
      {
        player: message.player,
        location: message.location,
        index: message.index
      },
      {
        player: message.moveplayer || message.player,
        location: message.movelocation || message.location,
        index: message.moveindex !== undefined ? message.moveindex : message.index,
        position: message.position
      }
    );
    this.callback(this.generateView(), this.stack.cards());
  }

  /**
   * Set a username to a specific slot on lock in.
   */
  setNames(slot: PLAYER, username: string): void {
    this.names[slot] = username;
  }

  findUIDCollection(uid: string): Pile {
    return getByUID(this.stack.cards(), uid);
  }

  findUIDCollectionPrevious(uid: string): Pile {
    return getByUID(this.previousStack, uid);
  }

  filterEdited(cards: Pile[]): Pile[] {
    return cards.filter((card) => {
      const newCards = this.findUIDCollection(card.uid),
        oldCards = this.findUIDCollectionPrevious(card.uid) || {};
      return !Object.keys(newCards).every(function (key) {
        return newCards[key] === oldCards[key];
      });
    });
  }

  /**
   * Generate the view of the field, for use by YGOPro MSG_UPDATE_DATA to get counts.
   */
  generateViewCount(player: PLAYER): FieldViewCount {
    const playersCards = filterPlayer(this.stack.cards(), player),
      deck = filterlocation(playersCards, LOCATION.DECK),
      hand = filterlocation(playersCards, LOCATION.HAND),
      trash = filterlocation(playersCards, LOCATION.TRASH),
      egg = filterlocation(playersCards, LOCATION.EGG),
      security = filterlocation(playersCards, LOCATION.SECURITY),
      breedingzone = filterlocation(playersCards, LOCATION.BREEDINGZONE),
      battlezone = filterlocation(playersCards, LOCATION.BATTLEZONE),
      onfield = filterlocation(playersCards, LOCATION.ONFIELD),
      inmaterial = filterlocation(playersCards, LOCATION.INMATERIAL);

    return {
      DECK: deck.length,
      HAND: hand.length,
      TRASH: trash.length,
      EGG: egg.length,
      SECURITY: security.length,
      BREEDINGZONE: breedingzone.length,
      BATTLEZONE: battlezone.length,
      ONFIELD: onfield.length,
      INMATERIAL: inmaterial.length
    };
  }
  /**
   * Generate the view of the field, for use by YGOPro MSG_UPDATE_DATA to update data.
   */
  generateUpdateView(player: PLAYER): FieldView {
    const playersCards = filterPlayer(this.stack.cards(), player),
      deck = filterlocation(playersCards, LOCATION.DECK),
      hand = filterlocation(playersCards, LOCATION.HAND),
      trash = filterlocation(playersCards, LOCATION.TRASH),
      egg = filterlocation(playersCards, LOCATION.EGG),
      security = filterlocation(playersCards, LOCATION.SECURITY),
      breedingzone = filterlocation(playersCards, LOCATION.BREEDINGZONE),
      battlezone = filterlocation(playersCards, LOCATION.BATTLEZONE),
      onfield = filterlocation(playersCards, LOCATION.ONFIELD),
      inmaterial = filterlocation(playersCards, LOCATION.INMATERIAL);

    return {
      DECK: deck.sort(sortByIndex),
      HAND: hand.sort(sortByIndex),
      TRASH: trash.sort(sortByIndex),
      EGG: egg.sort(sortByIndex),
      SECURITY: security.sort(sortByIndex),
      BREEDINGZONE: breedingzone.sort(sortByIndex),
      BATTLEZONE: battlezone.sort(sortByIndex),
      ONFIELD: onfield.sort(sortByIndex),
      INMATERIAL: inmaterial.sort(sortByIndex)
    };
  }

  /**
   * Generate the view for a specific given player
   */
  generateSinglePlayerView(player: PLAYER): FieldView {
    const playersCards = this.filterEdited(
        filterPlayer(JSON.parse(JSON.stringify(this.stack.cards())), player)
      ),
      deck = filterlocation(playersCards, LOCATION.DECK),
      hand = filterlocation(playersCards, LOCATION.HAND),
      trash = filterlocation(playersCards, LOCATION.TRASH),
      egg = filterlocation(playersCards, LOCATION.EGG),
      security = filterlocation(playersCards, LOCATION.SECURITY),
      breedingzone = filterlocation(playersCards, LOCATION.BREEDINGZONE),
      battlezone = filterlocation(playersCards, LOCATION.BATTLEZONE),
      inmaterial = filterlocation(playersCards, LOCATION.INMATERIAL),
      onfield = filterlocation(playersCards, LOCATION.ONFIELD);

    return {
      DECK: hideViewOfZone(deck),
      HAND: hand,
      TRASH: trash,
      EGG: egg, //hideViewOfExtra(egg, true),
      SECURITY: security,
      BREEDINGZONE: breedingzone,
      BATTLEZONE: battlezone,
      INMATERIAL: inmaterial,
      ONFIELD: onfield
    };
  }

  /**
   * Generate the view for a spectator or opponent
   */
  generateSinglePlayerSpectatorView(player: PLAYER): FieldView {
    const playersCards = this.filterEdited(
        filterPlayer(JSON.parse(JSON.stringify(this.stack.cards())), player)
      ),
      deck = filterlocation(playersCards, LOCATION.DECK),
      hand = filterlocation(playersCards, LOCATION.HAND),
      trash = filterlocation(playersCards, LOCATION.TRASH),
      egg = filterlocation(playersCards, LOCATION.EGG),
      security = filterlocation(playersCards, LOCATION.SECURITY),
      breedingzone = filterlocation(playersCards, LOCATION.BREEDINGZONE),
      battlezone = filterlocation(playersCards, LOCATION.BATTLEZONE),
      inmaterial = filterlocation(playersCards, LOCATION.INMATERIAL),
      onfield = filterlocation(playersCards, LOCATION.ONFIELD);

    return {
      DECK: hideViewOfZone(deck),
      HAND: hideHand(hand),
      TRASH: trash,
      EGG: hideViewOfExtra(egg),
      SECURITY: hideViewOfZone(security),
      BREEDINGZONE: hideViewOfZone(breedingzone),
      BATTLEZONE: hideViewOfZone(battlezone),
      INMATERIAL: inmaterial,
      ONFIELD: onfield
    };
  }

  /**
   * Generate a full view of the field for a spectator.
   */
  generateSpectatorView(): FieldView[] {
    return [this.generateSinglePlayerSpectatorView(0), this.generateSinglePlayerSpectatorView(1)];
  }

  /**
   * Generate a full view of the field for a Player 1.
   */
  generatePlayer1View(): FieldView[] {
    return [this.generateSinglePlayerView(0), this.generateSinglePlayerSpectatorView(1)];
  }

  /**
   * Generate a full view of the field for a Player 2.
   */
  generatePlayer2View(): FieldView[] {
    return [this.generateSinglePlayerSpectatorView(0), this.generateSinglePlayerView(1)];
  }

  /**
   * Generate a full view of the field for all view types.
   */
  generateView(action = ''): UIPayload {
    if (action === 'start') {
      this.previousStack = [];
    }
    const output = {
      names: this.names,
      p0: {
        gameAction: action || 'game',
        info: this.state,
        field: this.generatePlayer1View()
      },
      p1: {
        gameAction: action || 'game',
        info: this.state,
        field: this.generatePlayer2View()
      },
      spectator: {
        gameAction: action || 'game',
        info: this.state,
        field: this.generateSpectatorView()
      }
    };
    this.previousStack = JSON.parse(JSON.stringify(this.stack.cards()));
    return output;
  }

  gameUpdate(): void {
    this.callback(this.generateView(), this.stack.cards());
  }

  /**
   * Creates a new card outside of initial start
   */
  makeNewCard(
    location: LOCATION,
    controller: PLAYER,
    sequence: number,
    position: string,
    code: string,
    index: number
  ): Pile {
    const card = this.stack.add(location, controller, sequence, code);
    this.callback(this.generateView('newCard'), this.stack.cards());

    return card;
  }

  /**
   * Finds a specific card and puts a counter on it.
   */
  addCounter(query: Query, type: string, amount: number): void {
    this.field.addCounter(query, type, amount);
  }

  /**
   * Finds a specific card and remove a counter from it.
   */
  removeCounter(query: Query, type: string, amount: number): void {
    this.field.addCounter(query, type, -1 * amount);
  }

  /**
   * Draws a card, updates state.
   */
  drawCard(player: PLAYER, numberOfCards: number): void {
    const currenthand = filterlocation(filterPlayer(this.stack.cards(), player), LOCATION.HAND).length;
    let topcard;
    let deck;
    let cards: Pile[] = [];

    for (let i = 0; i < numberOfCards; i += 1) {
      deck = filterlocation(filterPlayer(this.stack.cards(), player), LOCATION.DECK);
      topcard = deck[deck.length - 1];
      this.stack.move(
        {
          player: topcard.player,
          location: LOCATION.DECK,
          index: topcard.index
        },
        {
          player,
          location: LOCATION.HAND,
          index: currenthand + i,
          position: 'Unsuspended',
          id: cards[i].id || topcard.id
        }
      );
    }

    this.callback(this.generateView(), this.stack.cards());
  }

  recover(player: PLAYER, numberOfCards: number): void {
    const security = filterlocation(filterPlayer(this.stack.cards(), player), LOCATION.SECURITY).length;
    let topcard;
    let deck;

    for (let i = 0; i < numberOfCards; i += 1) {
      deck = filterlocation(filterPlayer(this.stack.cards(), player), LOCATION.DECK);
      topcard = deck[deck.length - 1];
      this.stack.move(
        {
          player: topcard.player,
          location: LOCATION.DECK,
          index: topcard.index
        },
        {
          player,
          location: LOCATION.SECURITY,
          index: security + i,
          position: 'Unsuspended'
        }
      );
    }

    this.callback(this.generateView(), this.stack.cards());
  }

  /**
   * Triggers a callback that reveals the given array of cards to end users.
   */
  revealCallback(cards: Pile[], player: PLAYER, call: any): void {
    const reveal: Pile[] = [];
    cards.forEach(function (card, index): void {
      reveal.push(Object.assign({}, card));
      reveal[index].position = 'Unsuspended'; // make sure they can see the card and all data on it.
    });
    this.callback(
      {
        p0: {
          gameAction: 'reveal',
          info: this.state,
          reveal: reveal,
          call: call,
          player: player
        },
        p1: {
          gameAction: 'reveal',
          info: this.state,
          reveal: reveal,
          call: call,
          player: player
        },
        spectator: {
          gameAction: 'reveal',
          info: this.state,
          reveal: reveal,
          call: call,
          player: player
        }
      },
      this.stack.cards()
    );
  }

  getField(player: PLAYER): Field {
    return this.generateView('start')['p' + player].field;
  }

  /**
   * Exposed method to initialize the field; You only run this once.
   */
  load(player1: Deck, player2: Deck): void {
    this.state.memory = 0;

    player1.main.forEach((card, index) => {
      this.addCard(LOCATION.DECK, 0, index, card);
    });
    player2.main.forEach((card, index) => {
      this.addCard(LOCATION.DECK, 1, index, card);
    });

    player1.egg.forEach((card, index) => {
      this.addCard(LOCATION.EGG, 0, index, card);
    });
    player2.egg.forEach((card, index) => {
      this.addCard(LOCATION.EGG, 1, index, card);
    });
    this.stack.updateIndex();
    this.announcement(0, { command: 'MSG_ORIENTATION', slot: 0 });
    this.announcement(1, { command: 'MSG_ORIENTATION', slot: 1 });
    this.callback(this.generateView('start'), this.stack.cards());
  }

  /**
   * moves game to next phase.
   */
  nextPhase(phase): void {
    this.state.phase = phase;
    this.callback(this.generateView(), this.stack.cards());
  }

  /**
   * Shifts the game to the start of the next turn and shifts the active player.
   */
  nextTurn(): void {
    this.state.turn += 1;
    this.state.phase = 0;
    this.state.turnOfPlayer = this.state.turnOfPlayer === 0 ? 1 : 0;
    this.callback(this.generateView(), this.stack.cards());
  }

  announcement(player: PLAYER, message: Announcement): void {
    const slot = 'p' + player,
      output = {
        names: this.names,
        p0: {},
        p1: {},
        spectator: {}
      };
    output[slot] = {
      gameAction: 'announcement',
      message
    };
    this.callback(output, this.stack.cards());
  }

  /**
   * Change memory gague
   */
  changeMemory(player: PLAYER, amount: number) {
    this.state.memory = player ? this.state.memory + amount : this.state.memory - amount;
    this.callback(this.generateView(), this.stack.cards());
  }

  /**
   * Send a question to the player
   */
  question(
    player: PLAYER,
    type: string,
    options: any[],
    answerLength: number,
    onAnswerFromUser: Function
  ) {
    // Create a mock view to populate with information so it gets sent to the right place.

    const slot = 'p' + player;
    const uuid = uniqueIdenifier(),
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
      gameAction: 'question',
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
   */
  respond(message: any): void {
    this.answerListener.emit(message.uuid, message.answer);
  }

  retryLastQuestion(): void {
    console.log(
      'retrying',
      this.lastQuestion.slot,
      this.lastQuestion.type,
      this.lastQuestion.options,
      this.lastQuestion.answerLength,
      this.lastQuestion.onAnswerFromUser
    );
    this.question(
      this.lastQuestion.slot,
      this.lastQuestion.type,
      this.lastQuestion.options,
      this.lastQuestion.answerLength,
      this.lastQuestion.onAnswerFromUser
    );
  }
}
