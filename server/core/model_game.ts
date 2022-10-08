import { GameBoard, Pile } from './model_gameboard';
import { Engine } from './engine_api';
import * as scripts from '../../scripts';

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
      return effect.type === action;
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
    if (card.player === player && card.location === 'BATTLEZONE') {
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
  await engine.resolveTurnEndActions()
  gameBoard.nextTurn();
}

function attackResolve(gameBoard, player, digimon, target: Pile | 'player') {}

function suggestMainAction(gameBoard: GameBoard, engine,  player) {
  const field = gameBoard.generateSinglePlayerView(player);
  const attack = field.BATTLEZONE; // filter digimon that are untapped;
  const tamer = getTriggerEffects('PLAY_TAMER', gameBoard, player);
  const option = getTriggerEffects('PLAY_OPTION', gameBoard, player);
  const digivolve = getTriggerEffects('CAN_DIGIVOLVE', gameBoard, player);
  const play = field.HAND; // filter for digimon

  const options = {
    play,
    digivolve,
    tamer,
    option,
    attack,
    next: true
  };

  gameBoard.question(player, 'main', options, 1, async (answer) => {
    const field = gameBoard.generateSinglePlayerView(player);

    let digimon: Pile;
    let tamer: Pile;
    let option: Pile;
    let previous: Pile;

    switch (answer.action) {
      case 'play':
        digimon = field.HAND[answer.index];
        gameBoard.setState({ ...digimon, location: 'BATTLEZONE', position: 'Unsuspended' });
        await registerTrigger('ON_PLAY', gameBoard, player, [digimon]);
        break;

      case 'digivolve':
        digimon = field.HAND[answer.index];
        previous = field.BATTLEZONE[answer.target];
        gameBoard.evolve({ ...digimon, previous });
        gameBoard.drawCard(player, 1);
        await registerTrigger('WHEN_DIGIVOLVING', gameBoard, player, [digimon, previous]);
        break;

      case 'tamer':
        tamer = field.HAND[answer.index];
        gameBoard.setState({ ...tamer, location: 'BATTLEZONE' });
        await registerTrigger('ON_PLAY', gameBoard, player, [tamer]);
        break;

      case 'option':
        option = field.HAND[answer.index];
        gameBoard.setState({ ...option, location: 'BATTLEZONE' });
        await registerTrigger('ON_PLAY', gameBoard, player, [option]);
        break;

      case 'attack':
        digimon = field.BATTLEZONE[answer.index];
        gameBoard.setState({ ...digimon, location: 'BATTLEZONE', position: 'Suspended' });
        await registerTrigger('ON_ATTACKING', gameBoard, player, [digimon], answer.target);
        engine.declareBattle(digimon)
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
  const move = hatch ? false : field.BREEDINGZONE[0][field.BREEDINGZONE[0].length - 1].level > 2;

  const options = {
    hatch,
    move,
    nothing: true
  };

  return new Promise((resolve, reject) => {
    gameBoard.question(player, 'breeding', options, 1, (answer) => {
      const field = gameBoard.generateSinglePlayerView(player);
      switch (answer) {
        case 'hatch':
          {
            const digimon = field.EGG[field.EGG.length - 0];
            gameBoard.setState({ ...digimon, location: 'BREEDINGZONE', position: 'Unsuspended' });
          }
          break;
        case 'move':
          {
            const digimon = field.BREEDINGZONE[0];
            gameBoard.setState({ ...digimon, location: 'BATTLEZONE' });
          }
          break;
        case 'nothing':
          break;
      }
      resolve(answer);
    });
  });
}

async function turn(gameBoard: GameBoard, engine, player) {
  let gameLoss;
  let outOfMemory = false;

  const unspendedCards = unsuspendPhase(gameBoard, player);
  gameBoard.nextPhase(1);
  gameLoss = !drawPhase(gameBoard, player);
  if (gameLoss) {
    return gameLoss;
  }
  gameBoard.nextPhase(2);
  gameLoss = await suggestBreedingAction(gameBoard, player);
  gameBoard.nextPhase(3);

  while (!outOfMemory) {
    gameLoss = await suggestMainAction(gameBoard, engine, player);
    if (gameLoss) {
      return gameLoss;
    }
    outOfMemory = player ? gameBoard.memory > -1 : gameBoard.memory < 1;
  }

  endPhase(gameBoard, engine, player);

  const nextPlayer = 0 ? 1 : 0;
  turn(gameBoard, engine, nextPlayer);
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

export function Game(decks, playerInterface: Function) {
  // decide who goes first

  const gameBoard = new GameBoard(playerInterface);
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

  turn(gameBoard, engine, 0);
}
