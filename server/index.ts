import { fork } from 'child_process';
import * as logger from './logger';
import { WebSocketServer, WebSocket } from 'ws';
import { Deck } from './core/lib_validate_deck';
import { ChildProcess } from 'child_process';
import { GameState } from './core/core';
import { validate, validateSession } from './endpoint_users';
import { saveDeck, deleteDeck } from './endpoint_decks';
import { logDuel } from './endpoint_services';

interface Client extends WebSocket {
  id?: string;
  username?: string;
  session?: string;
}

class ClientMessage {
  target: string;
  from: string;
  roompass: string;
  session: string;
  username: string;
  action: string;
  info: {};
  deck?: Deck;

  constructor(message: any) {
    this.target = message.target;
    this.from = message.from;
    this.roompass = message.roompass;
    this.session = message.session;
    this.username = message.username;
    this.action = message.action;
    this.info = message.info;
    this.deck = message.deck;
  }
}

type ServerMessage = {};

export type CoreMessage = {
  action: string;
  game: GameState;
  roompass: string;
  port: number;
  username: string;
  session: string;
};

const 
  
  { log } = logger.create(logger.config.main, '[INDEX]'),
  { log: debug } = logger.create(logger.config.debug, '[DEBUG]'),
  { log: logError } = logger.create(logger.config.error, '[ERROR]'),
  gamelist = {},
  gamePorts = {};

let userlist = [],
  wsServer: WebSocketServer,
  acklevel = 0;

/**
 * Server wide client onmessage Event
 */
function announce(announcement: ServerMessage): void {
  wsServer.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(announcement);
    }
  });
}

/**
 * Request that ever client respond and say it is connected.
 */
function sendMassAck(): void {
  acklevel = 0;
  userlist = [];
  announce({
    clientEvent: 'ack',
    serverEvent: 'ack'
  });
}

/**
 * Send out updates about the user count.
 */
function sendAckResult(socket?: Client): void {
  const message = {
    clientEvent: 'ackresult',
    ackresult: acklevel,
    userlist: userlist
  };

  socket ? socket.send(message) : announce(message);
}

/**
 * Send out updates to the game list
 */
function sendGameList(socket?: Client): void {
  const message = {
    clientEvent: 'gamelist',
    gamelist,
    ackresult: acklevel,
    userlist: userlist
  };

  socket ? socket.send(message) : announce(message);
}

/**
 * Pick a port to use
 */
function getUnsafePort(): number {
  const minPort = process.env.PORT_RANGE_MIN ? Number(process.env.PORT_RANGE_MIN) : 2000,
    maxPort = process.env.PORT_RANGE_MAX ? Number(process.env.PORT_RANGE_MAX) : 9000;

  return Math.floor(Math.random() * (maxPort - minPort) + minPort);
}

/**
 * Login a user using username and password.
 */
function loginUser(socket: Client, data: ClientMessage): void {
  validate(true, data, function (error, valid, responseData) {
    if (error) {
      logError(error);
      socket.send({
        clientEvent: 'login',
        info: {
          message: error.message
        },
        error: error
      });
      return;
    }
    const info = responseData.user;
    info.session = responseData.jwt;
    info.decks = responseData.decks;
    if (valid) {
      socket.username = info.username;

      socket.session = info.session;
      log(`${socket.username} has logged in`.bold);

      sendAckResult(socket);
      sendGameList(socket);
      socket.send({
        clientEvent: 'login',
        info: {
          username: info.username,
          decks: info.decks,
          friends: info.friends,
          session: info.session,
          sessionExpiration: info.sessionExpiration,
          ranking: info.ranking,
          admin: info.admin,
          rewards: info.rewards,
          settings: info.settings,
          bans: info.bans
        }
      });

      return;
    }

    socket.send({
      clientEvent: 'login',
      info: info
    });
  });
}

/**
 * Send a game request user to user
 */
function sendGameRequest(data: ClientMessage): void {
  announce({
    clientEvent: 'duelrequest',
    target: data.target,
    from: data.from,
    roompass: data.roompass
  });
}

/**
 * Process an ack response
 */
function processAckResponse(socket: Client): void {
  acklevel += 1;
  if (socket.username) {
    userlist.push(socket.username);
  }
}

/**
 * Load a user session, send them their decks.
 */
function loadSession(socket: Client, data: ClientMessage): void {
  validateSession(
    {
      session: data.session,
      username: data.username
    },
    function (error, valid, info) {
      if (error || !valid) {
        return;
      }
      socket.username = info.username;
      socket.session = data.session;
      log(`${socket.username} has rejoined session!`.bold);

      sendAckResult();
      socket.send({
        clientEvent: 'login',
        info: {
          username: info.username,
          decks: info.decks,
          friends: info.friends,
          session: data.session,
          admin: info.admin,
          rewards: info.rewards,
          settings: info.settings,
          bans: info.bans
        }
      });
    }
  );
}

/**
 * Host a game
 */
function host(socket: Client, message: ClientMessage): void {
  const port = getUnsafePort(),
    execArgv = process.env.CORE_DEBUG ? [`--inspect=${getUnsafePort()}`] : undefined,
    child = fork('./core/index.js', process.argv, {
      cwd: __dirname,
      env: Object.assign({}, process.env, message.info, { PORT: port }),
      execArgv
    });
  child.on('message', function (data): void {
    const message = data as CoreMessage;
    onCoreMessage(child, socket, message);
  });
  gamePorts[port] = child;
}

/**
 * Save a deck
 */
function deckSave(socket: Client, message: ClientMessage): void {
  if (!socket.username) {
    log('no user cant save');
    return;
  }
  delete message.action;
  message.deck.owner = socket.username;
  message.username = socket.username;
  log(message);
  saveDeck(socket.session, message.deck, socket.username, function (error, savedDecks) {
    socket.send({
      clientEvent: 'savedDeck',
      error,
      savedDecks
    });
  });
}

/**
 * Delete a deck.
 */
function deckDelete(socket: Client, message: ClientMessage): void {
  if (!socket.username) {
    return;
  }
  deleteDeck(socket.session, message.deck.id, socket.username, function (error, savedDecks) {
    socket.send({
      clientEvent: 'deletedDeck',
      error,
      savedDecks,
      id: message.deck.id
    });
  });
}

/**
 * Update the gamelist that there was a state update in the lobby.
 */
function lobby(message: CoreMessage): void {
  gamelist[message.game.roompass] = message.game;
  sendGameList();
}

/**
 * Stop the game, and give the server time to wind down.
 */
function stop(message: CoreMessage): void {
  delete gamelist[message.game.roompass];
  sendGameList();
}

/**
 * Update the gamelist that the game is in a ready state.
 */
function ready(socket: Client, message: CoreMessage) {
  sendGameList();
  socket.send({
    clientEvent: 'lobby',
    roompass: message.roompass,
    port: message.port
  });
}

/**
 * Check that the person connecting to the core is registered to the server and get their saved deck.
 */
function register(child: ChildProcess, message): void {
  validateSession(
    {
      session: message.session,
      username: message.username
    },
    function (error, valid, person) {
      child.send({
        action: 'register',
        error,
        person,
        session: message.session,
        valid
      });
    }
  );
}

/**
 * When a game ends remove it from the gamelist
 */
function quit(game: GameState): void {
  delete gamelist[game.roompass];
  delete gamePorts[game.port];
  sendGameList();
}

/**
 * When the core declares a win log the duel and kill the process
 */
function win(child: ChildProcess, message: CoreMessage) {
  logDuel(message, function () {
    child.send({
      action: 'kill'
    });
  });
}

/**
 * Analyze message from child instance and take appropriate action
 */
function onCoreMessage(child: ChildProcess, socket: Client, message: CoreMessage) {
  switch (message.action) {
    case 'lobby':
      lobby(message);
      break;
    case 'stop':
      stop(message);
      break;
    case 'ready':
      ready(socket, message);
      break;
    case 'register':
      register(child, message);
      break;
    case 'quit':
      quit(message.game);
      break;
    case 'win':
      win(child, message);
      break;
  }
}

/**
 * Analyze message from websocket client and take appropriate action
 */
function onMessage(socket: Client, message: ClientMessage) {
  switch (message.action) {
    case 'duelrequest':
      sendGameRequest(message);
      break;
    case 'ack':
      processAckResponse(socket);
      break;
    case 'register':
      loginUser(socket, message);
      break;
    case 'loadSession':
      loadSession(socket, message);
      break;
    case 'host':
      host(socket, message);
      break;
    case 'save':
      deckSave(socket, message);
      break;
    case 'delete':
      deckDelete(socket, message);
      break;
    default:
      return;
  }
}

/**
 *Action to take on new websocket connection
 */
function onConnection(socket: Client): void {
  socket.on('data', function (data) {
    if (socket.readyState !== socket.OPEN) {
      return;
    }
    try {
      const message = new ClientMessage(data);
      sendGameList(socket);
      onMessage(socket, message);
    } catch (error) {
      logError(error);
    }
  });
}

/**
 * Iniate gamelist server
 */
export default function start(): NodeJS.Timer {
  wsServer = new WebSocketServer({
    port: 8080
  });

  wsServer.on('connection', onConnection);

  return setInterval(function (): void {
    sendAckResult();
    sendGameList();
    sendMassAck();
  }, 15000);
}
