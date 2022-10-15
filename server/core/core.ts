/**
 * Configuration is passed via enviromental variables.
 */

import * as logger from '../logger';
import * as dotenv from 'dotenv';
import EventEmitter from 'events';
import { WebSocketServer, WebSocket, Server } from 'ws';
import uuid from 'uuid';
import { choice } from './lib_choice';
import { validateDeck, Deck } from './lib_validate_deck';
import { Game } from './model_game';
import { Socket } from 'net';
import { UIPayload, UIPayloadUnit } from './model_gameboard';

type Person = {
  _id: string;
  username: string;
  avatar: string;
  points: number;
  elo: number;
};
// this is a room
interface Client extends WebSocket {
  id?: string;
  slot: number;
  join: Function;
  username?: string;
  avatar?: string;
  points?: number;
  elo?: number;
}

type ClientMessage = {
  action: string;
  chat?: string;
  deck?: Deck;
  turn_player?: number;
  room?: string;
  username?: string;
  response?: number[];
  session?: string;
  slot?: number;
  verification?: string;
  type?: string;
  result?: string;
  winner?: number;
  gameAction?: string;
  field?: any;
};

type ChatMessage = {
  message: string;
};

type ApplicationState = {
  clients: any[];
  chat: ChatMessage[];
  lifeCycle: LifeCycle;
  password: string;
  reconnection: any;
  verification: string;
};

type PlayerInfo = {
  id: string;
  wins: number;
  ready: boolean;
  points: number;
  elo: number;
  slot: number;
  settings: any;
  username: string;
  session: string;
  avatar: string;
};

const WARNING_COUNTDOWN = 3000000,
  CLEANUP_LATENCY = 100000,
  MAX_GAME_TIME = 33000000,
  banlist = [{}],
  database = [],
  defaultPlayer = {},
  shuffle = require('./lib_shuffle.js'),
  verificationSystem = new EventEmitter(),
  { log } = logger.create(logger.config.main, '[CORE/INDEX]');

const core = <any>process;

let lastInteraction = new Date();

/**
 * Broadcast current game lobby status to connected clients and management system.
 */
function broadcast(server, game) {
  server.write({
    action: 'lobby',
    game
  });
  core.send({
    action: 'lobby',
    game
  });
}

/**
 * Broadcast current game lobby status to connected clients and management system.
 */
function clearField(server): void {
  server.write({
    action: 'clear'
  });
}

/**
 * Report back to the client that they are registered.
 */
function enableClient(client: Client, person) {
  client.username = person.username;
  client.avatar = person.avatar;
  client.points = person.points || 0;
  client.elo = person.elo || 1200;
  // eslint-disable-next-line no-underscore-dangle
  client.id = person._id;
  client.send({
    action: 'registered'
  });

  if (person.decks) {
    client.send({
      action: 'decks',
      decks: person.decks
    });
  }
}

/**
 * Register the user with the server via external authentication, if avaliable.
 * @param {Spark} client connected websocket and Primus user (spark in documentation).
 * @param {ClientMessage} message JSON communication sent from client.
 * @returns {void}
 */
function register(client, message) {
  if (!core.child) {
    enableClient(client, Object.assign(message, defaultPlayer));
    return;
  }

  if (typeof message.session !== 'string') {
    throw Error('Session information required to proceed');
  }

  client.session = message.session;
  verificationSystem.once(message.session, function (error, valid, person) {
    if (error) {
      throw error;
    }
    if (valid) {
      enableClient(client, person);
      return;
    }
  });
  core.send({
    action: 'register',
    username: message.username,
    session: message.session
  });
}

/**
 * Chat with other users.
 * @param {Object} server Primus instance.
 * @param {ApplicationState} state internal private state information not shown on the game list.
 * @param {Spark} client connected websocket and Primus user (spark in documentation).
 * @param {String} message JSON communication sent from client.
 * @param {Date} date built in date object, used for timestamping.
 * @returns {Object} formated chat message.
 */
function chat(server, state, client, message, date) {
  date = date || new Date();
  const chatMessage = {
    action: 'chat',
    message, // :sanitize(message)
    username: client.username,
    date: date.toISOString()
  };
  server.room('chat').write(chatMessage);
  //state.chat.push(chatMessage);
  return chatMessage;
}

/**
 * If authorized reconnect a client to an active duel.
 * @param {Duel} duel Duel Field Instance
 * @param {ApplicationState} state internal private state information not shown on the game list.
 * @param {Spark} client connected websocket and Primus user (spark in documentation).
 * @param {ClientMessage} message JSON communication sent from client.
 * @returns {void}
 */
function reconnect(duel, state, client, message) {
  if (!state.reconnection[message.room]) {
    return;
  }
  if ((state.reconnection[message.room] = client.username)) {
    client.join(message.room);
  }
  if (message.room !== 'spectator') {
    duel.getField();
  }
}

/**
 * Join the user to a room
 * @param {Duel} duel Duel Field Instance
 * @param {GameState} game public gamelist state information.
 * @param {ApplicationState} state internal private state information not shown on the game list.
 * @param {Spark} client connected websocket and Primus user (spark in documentation).
 * @param {Function} callback trigger after spectator add is complete
 * @returns {void}
 */
function join(duel, game: GameState, state, client, callback) {
  if (game.player.length < 2) {
    client.slot = game.player.length;
    game.player.push({
      id: client.id,
      wins: 0,
      ready: Boolean(client.ready),
      points: client.points,
      elo: client.elo,
      slot: client.slot,
      settings: client.settings,
      username: client.username,
      session: client.session,
      avatar: client.avatar ? client.avatar.url : ''
    });
    state.clients[client.slot] = client;
    game.usernames[client.slot] = client.username;
    callback();
    return;
  }

  client.slot = 'spectator';
  client.join('spectator', function () {
    if (game.started) {
      duel.getField(client);
    }
    callback();
  });
}

/**
 * Join the user to a room
 * @param {Duel} duel Duel Field Instance
 * @param {GameState} game public gamelist state information.
 * @param {ApplicationState} state internal private state information not shown on the game list.
 * @param {Spark} client connected websocket and Primus user (spark in documentation).
 * @param {Function} callback trigger after spectator add is complete
 * @returns {void}
 */
function attemptJoin(duel, game: GameState, state, client, callback) {
  delete state.clients[client.slot];
  client.slot = undefined;
  client.leave('spectator', function (error) {
    if (error) {
      throw error;
    }
    join(duel, game, state, client, callback);
    if (game.started) {
      duel.getField(client);
    }
  });
  client.join('chat');
}

/**
 * Remove the user from a specificed slot.
 * @param {Object} server Primus instance.
 * @param {GameState} game public gamelist state information.
 * @param {ApplicationState} state internal private state information not shown on the game list.
 * @param {ClientMessage} message JSON communication sent from client.
 * @param {String} user user that requested that slot leave.
 * @returns {void}
 */
function spectate(
  server: WebSocketServer,
  game: GameState,
  state: ServerState,
  message: ClientMessage,
  user: Socket
) {
  const slot = message.slot;
  if (!game.player[slot]) {
    return;
  }
  state.clients[slot].slot = undefined;
  state.clients[slot].send({
    action: 'leave',
    user: user
  });
  state.clients[slot].join('spectator', function (error) {
    if (error) {
      throw error;
    }
  });
  game.player.splice(slot, 1);
  state.clients.splice(slot, 1);
  game.player.forEach(function (client, index) {
    state.clients[index].slot = index;
  });
  return;
}

/**
 * Kick the user in a specific slot if authorized to do so.
 * @param {Object} server Primus instance.
 * @param {GameState} game public gamelist state information.
 * @param {ApplicationState} state internal private state information not shown on the game list.
 * @param {Spark} client connected websocket and Primus user (spark in documentation).
 * @param {ClientMessage} message JSON communication sent from client.
 * @returns {Boolean} if the kick was valid and attempted to be executed.
 */
function kick(server, game: GameState, state, client, message) {
  if (client.slot !== 0 && !client.admin) {
    return false;
  }
  spectate(server, game, state, message, client.username);
  return true;
}

/**
 * Determine if a specific player has locked in their deck.
 * @param {Object[]} player list of players.
 * @param {Number} target queried slot number.
 * @param {Boolean} status new deck lock status.
 * @returns {void}
 */
function updatePlayer(player, target, status) {
  player[target].ready = status;
}

/**
 * Create a new ocgcore duel instance with constructor, getter, and setter mechanisms.
 * @returns {Duel} OCGCore Instance
 */
class Duel {
  getField: Function = this.failure;
  respond: Function = this.failure;

  failure() {
    throw new Error('Duel has not started');
  }

  load(game: GameState, state, errorHandler, players, spectators) {
    core.recordOutcome = new EventEmitter();
    core.recordOutcome.once('win', function (command) {
      // core.replay requires filtering.
      log(game.player, command);
      core.send({
        action: 'win',
        replay: core.replay,
        ranked: Boolean(game.ranked),
        loserID: game.player[Math.abs(command - 1)].id,
        loserSession: game.player[Math.abs(command - 1)].session,
        winnerID: game.player[command].id,
        winnerSession: game.player[command].session
      });
    });

    if (game.shuffle) {
      shuffle(players[0].main);
      shuffle(players[1].main);
    }

    const instance = new Game(game, state, errorHandler, players, spectators);
    this.respond = instance.respond;
    this.getField = function (client) {
      client.send(instance.getField(client));
    };
    return;
  }
}

function startSiding(players, state, duel) {
  players.forEach(function (player, slot) {
    updatePlayer(players, slot, false);
  });

  state.clients.forEach(function (client) {
    client.leave('');
    client.send({
      action: 'side',
      deck: client.deck
    });
  });
  duel = new Duel();
}

/**
 * Notify connected users and parent process that the game has ended.
 * @param {Object} server Primus instance.
 * @param {GameState} game public gamelist state information.
 * @param {ApplicationState} state internal private state information not shown on the game list.
 * @returns {NodeJS.Timeout} setTimeout reference number for lifetime cycle.
 */
function quit(server, game: GameState, state) {
  chat(
    server,
    state,
    {
      username: '[SYSTEM]'
    },
    'Game has expired!',
    undefined
  );
  core.send({
    action: 'quit',
    game: game
  });
  return setTimeout(core.exit, CLEANUP_LATENCY);
}

/**
 * Surrender in active duel.
 * @param {Object} server Primus instance.
 * @param {GameState} game public gamelist state information.
 * @param {ApplicationState} state internal private state information not shown on the game list.
 * @param {Duel} duel Duel Field Instance
 * @param {Number} slot surrendering player identifier.
 * @returns {void}
 */
function surrender(server, game: GameState, state, duel, slot) {
  const winner = Math.abs(slot - 1),
    bestOfXGames = game.min_wins,
    aheadBy = Math.abs(game.player[0].wins - game.player[1].wins);

  game.player[winner].wins = game.player[winner].wins + 1;
  game.started = false;

  if (aheadBy >= bestOfXGames) {
    core.recordOutcome.emit('win', winner);
    chat(
      server,
      state,
      {
        username: '[SYSTEM]'
      },
      `${game.player[winner].username} has won!`,
      undefined
    );
    quit(server, game, state);
    return;
  }

  startSiding(game.player, state, duel);

  state.predetermined = { slot };
}

/**
 * Validate a requested deck.
 * @param {GameState} game public gamelist state information.
 * @param {Spark} client connected websocket and Primus user (spark in documentation).
 * @param {ClientMessage} message JSON communication sent from client.
 * @returns {Boolean} If the deck is valid or not.
 */
function deckCheck(game: GameState, client, message) {
  const validation = validateDeck(message.deck, banlist[game.banlist], database, game.cardpool);

  if (!game.deckcheck) {
    client.send({
      action: 'lock',
      result: 'success'
    });
    return true;
  }

  if (validation.error) {
    client.send({
      errorType: 'validation',
      action: 'error',
      error: validation.error,
      msg: validation
    });
    return false;
  }

  client.send({
    action: 'lock',
    result: 'success'
  });
  return true;
}

/**
 * Determine if a specific player has locked in their deck.
 */
function isReady(player: PlayerInfo[], slot) {
  return player[slot].ready;
}

/**
 * Check if a new deck is a legal side
 */
function checkSideDeck(oldDeck, newDeck) {
  if (oldDeck.main.length !== newDeck.main.length) {
    return false;
  }
  if (oldDeck.extra.length !== newDeck.extra.length) {
    return false;
  }
  if (oldDeck.side.length !== newDeck.side.length) {
    return false;
  }

  const oldStack = [].concat(oldDeck.main, oldDeck.extra, oldDeck.side),
    newStack = [].concat(newDeck.main, newDeck.extra, newDeck.side);

  oldStack.sort();
  newStack.sort();

  return JSON.stringify(oldStack) === JSON.stringify(newStack);
}

/**
 * Add additional error handling and then, process incoming messages from clients.
 * @returns {void}
 */
function side(server, game: GameState, client, message) {
  if (isReady(game.player, client.slot)) {
    updatePlayer(game.player, client.slot, false);
    return;
  }

  const validSideOption = checkSideDeck(client.deck, message.deck);

  if (validSideOption) {
    client.deck = message.deck;
    updatePlayer(game.player, client.slot, true);
  }

  if (isReady(game.player, 0) && isReady(game.player, 1)) {
    clearField(server);
  }
}

/**
 * Validate a requested deck and if valid lock in the player as ready, otherwise toggle it off.
 */
function lock(game: GameState, client, message) {
  if (game.started) {
    return;
  }
  if (isReady(game.player, client.slot)) {
    updatePlayer(game.player, client.slot, false);
    delete client.deck;
    return;
  }
  try {
    updatePlayer(game.player, client.slot, deckCheck(game, client, message));
    client.deck = message.deck;
  } catch (error) {
    updatePlayer(game.player, client.slot, false);
    delete client.deck;
    throw error;
  }
}

/**
 * Create reconnection service for a client.
 */
export class PlayerAbstraction {
  id: string;
  session: string;
  deck: Deck;
  server;
  room: string;
  username: string;
  wins: number;
  ready: boolean;
  slot?: number;

  constructor(server, state: ApplicationState, room: string, client) {
    if (client.username) {
      client.join(room);
      state.reconnection[room] = client.username;
    }

    server.room(room).write({
      action: 'reconnection',
      room: room
    });

    this.server = server;
    this.deck = client.deck;
    this.room = room;
  }

  write(data: ClientMessage | UIPayloadUnit) {
    this.server.room(this.room).write({
      action: 'action',
      message: data
    });
  }
}

/**
 * Determine who goes first via a coin toss.
 * Its stupid but humans like feeling in control.
 */
function determine(server, game: GameState, state, client) {
  if (!game.player[0] || !game.player[1]) {
    return;
  }

  if (client.slot !== 0 && !game.predetermined) {
    return;
  }

  if (!game.player[0].ready && !game.player[1].ready) {
    return;
  }

  game.started = true;
  state.verification = uuid.v4();

  if (state.predetermined) {
    const oppossingPlayer = Math.abs(state.predetermined.slot - 1),
      defeatedPlayer = state.predetermined.slot;

    server.write({
      action: 'start'
    });
    state.clients[defeatedPlayer].write({
      action: 'turn_player',
      verification: state.verification
    });
    state.clients[oppossingPlayer].write({
      action: 'choice',
      type: 'waiting'
    });
    return;
  }

  choice(state.clients, game.start_game).then(function () {
    server.write({
      action: 'start'
    });
    state.clients[0].write({
      action: 'turn_player',
      verification: state.verification
    });
    state.clients[1].write({
      action: 'choice',
      type: 'waiting'
    });
  });
}

/**
 * Start the duel
 */
function start(server, duel, game: GameState, state, message) {
  if (message.verification !== state.verification) {
    throw 'Incorrect Validation Code';
  }
  if (message.turn_player) {
    state.clients = state.clients.reverse();
    state.clients[0].slot = 0;
    state.clients[1].slot = 1;
  }

  server.empty('player1');
  server.empty('player2');

  const players = [
      new PlayerAbstraction(server, state, 'player1', state.clients[0]),
      new PlayerAbstraction(server, state, 'player2', state.clients[1])
    ],
    spectators = new PlayerAbstraction(server, state, 'spectator', {});

  duel.load(
    game,
    state,
    function (error, type) {
      chat(
        server,
        state,
        {
          username: '[SYSTEM]'
        },
        error,
        undefined
      );
    },
    players,
    spectators
  );
}

/**
 * Respond to a question from the OCGCore game engine.
 */
function question(duel, client, message) {
  duel.respond(message);
}

/**
 * Check if a message requires the manual engine or the automatic one.
 */
function requiresManualEngine(game: GameState, client) {
  if (game.automatic !== 'Manual') {
    return;
  }
  if (!game.started) {
    return;
  }
  if (client.slot === undefined) {
    return;
  }
  return true;
}

/**
 * Process incoming messages from clients.
 */
function processMessage(server, duel, game: GameState, state, client, message) {
  if (!message.action) {
    return;
  }
  if (!client.username) {
    register(client, message);
    return;
  }

  switch (message.action) {
    case 'chat':
      chat(server, state, client, message.message, undefined);
      break;
    case 'determine':
      determine(server, game, state, client);
      broadcast(server, game);
      break;
    case 'join':
      attemptJoin(duel, game, state, client, function () {
        broadcast(server, game);
        client.send({
          action: 'slot',
          slot: client.slot
        });
      });
      break;
    case 'kick':
      if (client.slot === undefined) {
        attemptJoin(duel, game, state, client, function () {
          broadcast(server, game);
        });
        return;
      }
      kick(server, game, state, client, message);
      broadcast(server, game);
      break;
    case 'lock':
      lock(game, client, message);
      broadcast(server, game);
      state.decks[client.slot] = message.deck;
      break;
    case 'reconnect':
      reconnect(duel, state, client, message);
      break;
    case 'question':
      question(duel, client, message);
      break;
    case 'spectate':
      spectate(server, game, state, message, client.username);
      broadcast(server, game);
      break;
    case 'start':
      start(server, duel, game, state, message);
      broadcast(server, game);
      break;
    case 'surrender':
      chat(
        server,
        state,
        client,
        {
          username: '[SYSTEM]'
        },
        `${game.usernames[client.slot]} surrendered`
      );
      surrender(server, game, state, duel, client.slot);
      broadcast(server, game);
      break;
    case 'side':
      side(server, game, client, message);
      broadcast(server, game);
      break;
    case 'choice':
      client.emit('choice', message.answer);
      break;
    case 'restart':
      break;
    default:
      break;
  }
  if (!requiresManualEngine(game, client)) {
    return;
  }
  if (!duel.engine) {
    return;
  }
}

/**
 * Add additional error handling and then, process incoming messages from clients.
 */
function messageHandler(server, duel, game: GameState, state, client, data) {
  try {
    const message = JSON.stringify(data);
    processMessage(server, duel, game, state, client, message);
  } catch (error) {
    if (!core.child) {
      // while using a direct debugger, kill the process and investigate.
      throw error;
    }
    log(error);
    client.send({
      error: error.message,
      stack: error.stack,
      input: data
    });
  }
}

/**
 * Culmulative connected clients on a server.
 */
function countClients(server) {
  const total: string[] = [];
  // Primus does not have an reduce method, or length property.
  server.forEach((socket, id: string) => {
    total.push(id);
  });
  return total.length;
}

/**
 * Add additional error handling and then, process incoming messages from clients.
 */
function disconnectionHandler(server, duel, game: GameState, state, deadSpark) {
  const message = {
    action: 'spectate',
    slot: deadSpark.slot
  };
  if (deadSpark.session) {
    verificationSystem.removeListener('client.session', function () {});
  }
  if (!countClients(server)) {
    quit(server, game, state);
    return;
  }
  try {
    messageHandler(server, duel, game, state, deadSpark, message);
  } catch (error) {
    log(error);
    core.send({
      action: 'error',
      error: error
    });
  }
}

/**
 * Process incoming messages from master core.
 */
function adminMessageHandler(server, game: GameState, message) {
  switch (message.action) {
    case 'kill':
      core.exit(0);
      break;
    case 'kick':
      kick(server, game, {}, { admin: true }, message);
      break;
    case 'lobby':
      broadcast(server, game);
      break;
    case 'register':
      verificationSystem.emit(message.session, message.error, message.valid, message.person);
      break;
    default:
      break;
  }
  return undefined;
}

/**
 * Notify connected users that the game will momentarily.
 */
function notify(server, game: GameState, state) {
  chat(
    server,
    state,
    {
      username: '[SYSTEM]'
    },
    'Game will expire soon!',
    undefined
  );
  return setTimeout(quit, WARNING_COUNTDOWN, server, game, state);
}

/**
 * Check if the game is not being interacted with.
 */
function interactionCheck(server, game: GameState, state: ApplicationState): void {
  if (new Date().getTime() - lastInteraction.getTime() > WARNING_COUNTDOWN) {
    quit(server, game, state);
  }
}

class LifeCycle {
  id: NodeJS.Timeout;

  constructor(server, game: GameState, state: ApplicationState) {
    setInterval(interactionCheck, CLEANUP_LATENCY, server, game, state);
    this.id = setTimeout(notify, MAX_GAME_TIME, server, game, state);
  }
}

/**
 * Process incoming messages from clients.
 */
function boot(server: Server, game: GameState, state) {
  state.lifeCycle = new LifeCycle(server, game, state);

  core.on('message', function (message) {
    lastInteraction = new Date();
    try {
      adminMessageHandler(server, game, message);
    } catch (error) {
      log(error);
      core.send({
        action: 'error',
        error: error
      });
    }
  });

  broadcast(server, game);

  core.send({
    action: 'ready',
    roompass: game.roompass,
    password: state.password,
    port: game.port
  });
}

/**
 * Create a game object based on given and enviromental settings
 */
export class GameState {
  automatic: 'Automatic' | 'Manual';
  banlist: string;
  cardpool: string;
  deckcheck: boolean;
  draw_count: number;
  locked: boolean;
  mulligan: boolean;
  port: number;
  player: PlayerInfo[];
  bestOf: [0, 0];
  priority: false;
  prerelease: boolean;
  roompass: string;
  ranked: boolean;
  shuffle: boolean;
  started: boolean;
  time: number;
  usernames: string[];
  min_wins: number;
  start_game: 'rps' | 'coin';
  predetermined: boolean;

  constructor(configuration) {
    const settings: any = {};

    Object.assign(settings, core.env, configuration);

    this.automatic = settings.AUTOMATIC === 'true' ? 'Automatic' : 'Manual';
    this.banlist = settings.BANLIST || 'No Banlist';
    this.cardpool = settings.CARD_POOL || 'OCG/TCG';
    this.deckcheck = settings.DECK_CHECK === 'true';
    this.draw_count = settings.DRAW_COUNT || 1;
    this.locked = Boolean(settings.ROOM_PASS);
    this.port = settings.PORT || 8082;
    this.player = [];
    this.bestOf = [0, 0];
    this.priority = false;
    this.prerelease = settings.PRERELEASE || true;
    this.roompass = settings.ROOM_PASS || uuid.v4();
    this.ranked = settings.RANKED;
    this.shuffle = settings.SHUFFLE === 'true';
    this.started = false;
    this.time = settings.TIME_LIMIT || 3000;
    this.usernames = [];
    this.start_game = settings.START_GAME || 'rps';
  }
}

/**
 * Create a server state instance. States life cycle. Holds private information.
 * @param {Object} server Primus instance.
 * @param {GameState} game public gamelist state information.
 * @returns {ApplicationState} internal private state information not shown on the game list.
 */
class ServerState {
  clients: Client[];
  decks: Deck[];
  reconnection;
  verification: string;

  constructor() {
    this.verification = uuid.v4();
  }
}

/**
 * Start the server.
 * @param {Object} configuration enviromental variables.
 * @param {Function} callback replacement for core.send
 * @returns {void}
 */
export function main(configuration, callback) {
  // If the callback is given, use the callback,
  // otherwise report to parent process if it exist,
  // if it does not, print to the console.

  core.on('unhandledException', function (fatal) {
    log(fatal);
  });

  configuration = typeof configuration === 'object' ? configuration : {};
  core.child = core.send ? true : false;
  core.send = callback ? callback : core.send;
  core.send = core.send ? core.send : log;

  const duel = new Duel(),
    game: GameState = new GameState(configuration),
    server: WebSocketServer = new WebSocketServer({
      port: game.port
    }),
    state: ServerState = new ServerState(),
    title: string = `YGOSalvation Core on port: ${game.port} pid: ${core.pid}`;

  core.title = title;

  server.on('connection', function (client: WebSocket) {
    client.on('data', function (message) {
      log('Message', message);
      messageHandler(server, duel, game, state, client, message);
    });
    broadcast(server, game);
  });

  server.on('disconnection', function (deadSpark) {
    disconnectionHandler(server, duel, game, state, deadSpark);
  });

  boot(server, game, state);

  log(title);

  return {
    duel,
    game,
    server,
    state
  };
}
