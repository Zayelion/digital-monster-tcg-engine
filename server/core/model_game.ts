import { GameBoard, Pile, UIPayload, UICallback } from './model_gameboard';
import { Engine } from './engine_api';
import * as scripts from '../../scripts';
import { PlayerAbstraction } from './core';

type GameEvent = {
  action;
  triggeredEffect: Function;
  player: number;
  cards;
  target;
};

const gameEvents: GameEvent[] = [];

function raiseEvent(action, triggeredEffect, player, cards, target) {
  gameEvents.push({ action, triggeredEffect, player, cards, target });
}

async function actionCheck() {
  while (gameEvents.length) {
    await gameEvents.pop()?.triggeredEffect();
  }
}

function getTriggerEffects(
  action,
  gameBoard: GameBoard,
  player = 0,
  cards: Pile[] = [],
  targets: Pile[] = []
) {
  const allCards = gameBoard.getCards();

  const effects = allCards
    .map((card) => {
      return card.effects;
    })
    .flatten();

  return effects
    .filter((effect) => {
      return effect.type.includes(action);
    })
    .filter((effect) => {
      return effect.trigger({ action, player, cards, targets });
    });
}

async function registerTrigger(
  action,
  gameBoard: GameBoard,
  player,
  cards: Pile[] = [],
  targets: Pile[] = []
) {
  const triggeredEffects = getTriggerEffects(action, gameBoard, player, cards, targets);

  triggeredEffects.map((triggeredEffect) => {
    raiseEvent(action, triggeredEffect, player, cards, targets);
    return triggeredEffect;
  });

  await actionCheck();
}

async function unsuspendPhase(gameBoard: GameBoard, player) {
  const gameStack = gameBoard.getState();

  const unsuspended = gameStack.filter((card) => {
    if (card.player === player && card.location === LOCATION.BATTLEZONE) {
      gameStack.setState({ ...card, position: 'Unsuspended' });
      return card;
    }
  });

  await registerTrigger('ON_TURN_START', gameBoard, player, []);
  await registerTrigger('ON_YOUR_TURN', gameBoard, player, []);
  await registerTrigger('ON_OPPONENTS_TURN', gameBoard, player, []);
  await registerTrigger('ON_BOTH_PLAYERS_TURN', gameBoard, player, []);

  return unsuspended;
}

function drawPhase(gameBoard: GameBoard, player) {
  if (!gameBoard.generateViewCount(player).DECK) {
    return false;
  }

  if (gameBoard.state.turn) {
    gameBoard.drawCard(player, 1);
  }

  return true;
}

async function endPhase(gameBoard, engine: Engine, player: PLAYER) {
  await engine.resolveTurnEndActions(player);
  gameBoard.nextTurn();
}

function attackResolve(gameBoard, player, digimon, target: Pile | 'player') {}

function suggestMainAction(gameBoard: GameBoard, engine, player) {
  const field = gameBoard.generateSinglePlayerView(player);
  const attack = field.BATTLEZONE; // filter digimon that are untapped;
  const tamer = getTriggerEffects('PLAY_TAMER', gameBoard, player);
  const option = getTriggerEffects('PLAY_OPTION', gameBoard, player);
  const digivolve = getTriggerEffects('CAN_DIGIVOLVE', gameBoard, player);
  const play = field.HAND; // filter for digimon

  const options = [{ play }, { digivolve }, { tamer }, { option }, { attack }, { next: true }];

  gameBoard.question(player, 'main', options, 1, async (answer) => {
    const field = gameBoard.generateSinglePlayerView(player);

    let digimon: Pile;
    let tamer: Pile;
    let option: Pile;
    let previous: Pile;

    switch (answer.action) {
      case 'play':
        digimon = field.HAND[answer.index];
        engine.memory(player, digimon.playCost);
        gameBoard.setState({ ...digimon, movelocation: LOCATION.BATTLEZONE, position: 'Unsuspended' });
        await registerTrigger('ON_PLAY', gameBoard, player, [digimon]);
        break;

      case 'digivolve':
        digimon = field.HAND[answer.index];
        previous = field.BATTLEZONE[answer.target];
        let digivolutionCosts = digimon?.digivolutionCosts || [];
        engine.memory(player, digivolutionCosts[answer.digivolutionCost].cost);
        gameBoard.evolve({ ...digimon, previous });
        gameBoard.drawCard(player, 1);
        await registerTrigger('WHEN_DIGIVOLVING', gameBoard, player, [digimon, previous]);
        break;

      case 'tamer':
        tamer = field.HAND[answer.index];
        gameBoard.setState({ ...tamer, location: LOCATION.BATTLEZONE });
        await registerTrigger('ON_PLAY', gameBoard, player, [tamer]);
        break;

      case 'option':
        option = field.HAND[answer.index];
        gameBoard.setState({ ...option, location: LOCATION.BATTLEZONE });
        await registerTrigger('ON_PLAY', gameBoard, player, [option]);
        break;

      case 'attack':
        digimon = field.BATTLEZONE[answer.index];
        gameBoard.setState({ ...digimon, location: LOCATION.BATTLEZONE, position: 'Suspended' });
        await registerTrigger('ON_ATTACKING', gameBoard, player, [digimon], answer.target);
        engine.declareBattle(digimon);
        break;

      case 'next':
        gameBoard.nextPhase(4);
        break;
    }
  });
}

function suggestBreedingAction(gameBoard: GameBoard, player) {
  const field = gameBoard.generateSinglePlayerView(player);
  const hatch = !field.BREEDINGZONE.length;
  const move = hatch ? false : field.BREEDINGZONE[0].level > 2;

  const options = [{ hatch }, { move }, { next: true }];

  return new Promise((resolve, reject) => {
    gameBoard.question(player, 'breeding', options, 1, (answer) => {
      const field = gameBoard.generateSinglePlayerView(player);
      switch (answer) {
        case 'hatch':
          {
            const digimon = field.EGG[field.EGG.length - 0];
            gameBoard.setState({ ...digimon, location: LOCATION.BREEDINGZONE, position: 'Unsuspended' });
          }
          break;
        case 'move':
          {
            const digimon = field.BREEDINGZONE[0];
            gameBoard.setState({ ...digimon, location: LOCATION.BATTLEZONE });
          }
          break;
        case 'next':
          break;
      }
      resolve(answer);
    });
  });
}

async function turn(gameBoard: GameBoard, engine, player, errorHandler) {
  let gameLoss;
  let outOfMemory = false;
  try {
    const unspendedCards = unsuspendPhase(gameBoard, player);
    gameBoard.nextPhase(1);
    gameLoss = !drawPhase(gameBoard, player);
    if (gameLoss) {
      return player ? 0 : 1;
    }
    gameBoard.nextPhase(2);
    gameLoss = await suggestBreedingAction(gameBoard, player);
    gameBoard.nextPhase(3);

    while (!outOfMemory) {
      gameLoss = await suggestMainAction(gameBoard, engine, player);
      if (gameLoss) {
        return player ? 0 : 1;
      }
      outOfMemory = player ? gameBoard.memory > -1 : gameBoard.memory < 1;
    }

    endPhase(gameBoard, engine, player);

    const nextPlayer = player ? 1 : 0;
    return await turn(gameBoard, engine, nextPlayer, errorHandler);
  } catch (error) {
    errorHandler(error);
  }
}

function load(gameBoard, engine) {
  const cards = gameBoard.getCards();
  cards.forEach((card) => {
    try {
      const scriptId = card.id.replace(/-/g, '_');
      scripts[scriptId].register(card, engine);
    } catch (e) {
      console.log('Could not load', card.id, e);
    }
  });
}

function gameBoardInterface(players: PlayerAbstraction[], spectators: PlayerAbstraction[]): UICallback {
  return function callback(payload: UIPayload, pile: Pile[]): void {
    if (payload.p0) {
      players[0].write(payload.p0);
    }
    if (payload.p1) {
      players[1].write(payload.p1);
    }
    if (payload.spectator) {
      spectators.forEach((spectator) => {
        spectator.write(payload.spectator);
      });
    }
  };
}

async function playGame(gameBoard, engine, errorHandler) {
  const winner = await turn(gameBoard, engine, 0, errorHandler);

  // alert winner

  // record things.
}

export function Game(game, state, errorHandler, players: PlayerAbstraction[], spectators) {
  // decide who goes first

  const boardInterface = gameBoardInterface(players, spectators);
  const gameBoard = new GameBoard(boardInterface);
  const engine = new Engine(gameBoard, registerTrigger);

  // load decks into deckspace and egg zone
  gameBoard.load(decks[0], decks[1]);
  load(gameBoard, engine);

  // load security
  gameBoard.recover(0, 5);
  gameBoard.recover(1, 5);

  // draw 5
  gameBoard.drawCard(0, 5);
  gameBoard.drawCard(1, 5);

  // start phases

  playGame(gameBoard, engine, errorHandler);
}
