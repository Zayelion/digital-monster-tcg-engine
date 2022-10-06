const GameBoard = require('../model_gameboard');

const gameEvents = [];

function raiseEvent(action, triggeredEffect,  player, cards, target) {
  gameEvents.push({ action, triggeredEffect, player, cards, target });
}

function getCanDigivolve(gameBoard) {
  const cards = gameBoard.getCards();
}

function getTriggerEffects(action, gameBoard, player, cards, targets) {
  const cards = gameBoard.getCards();

  const effects = cards
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

async function registerTrigger(action, gameBoard, player, cards, targets) {
  const triggeredEffects = getTriggerEffects(action, gameBoard, player, cards, targets);

  triggeredEffects.map((triggeredEffect) => {
    raiseEvent(action, triggeredEffect, player, cards, targets);
    return triggeredEffect;
  });

  while (gameEvents.length) {
    const action = gameEvents.pop();
    await action();
  }
}

function unsuspendPhase(gameBoard, player) {
  const gameStack = gameBoard.getState();

  const unsuspended = gameStack.filter((card) => {
    if (card.player === player && card.location === 'BATTLEZONE') {
      gameStack.setState({ ...card, position: 'Unsuspended' });
      return card;
    }
  });

  registerTrigger('ON_TURN_START', gameBoard, player, []);

  return unsuspended;
}

function drawPhase(gameBoard, player) {
  if (!generateViewCount(player).DECK) {
    return false;
  }

  if (gameBoard.state.turn) {
    gameBoard.drawCard(player, numberOfCards, cards);
  }

  return true;
}

function endPhase(gameBoard, player) {
  actionCheck(gameBoard, player);
  gameBoard.nextTurn();
}

function suggestMainAction(gameBoard, player) {
  const field = generateSinglePlayerView(player);
  const attack = field.battlezone; // filter digimon that are untapped;
  const tamer = getTriggerEffects('PLAY_TAMER', gameBoard, player)
  const option = getTriggerEffects('PLAY_OPTION', gameBoard, player)
  const digivolve = getTriggerEffects('CAN_DIGIVOLVE', gameBoard, player)
  const play = field.hand // filter for digimon

  const options = {
    play,
    digivolve,
    tamer,
    option,
    attack,
    next: true
  };

  gameBoard.question(player, 'main', options, 1, async (answer) => {
    const field = generateSinglePlayerView(player);

    let digimon;
    let tamer;
    let option;

    switch (answer.action) {
      case 'play':
        digimon = field.hand[answer.index];
        gameStack.setState({ ...digimon, location: 'BATTLEZONE', position: 'Unsuspended' });
        await registerTrigger(phase, gameBoard, player, [digimon]);
        break;

      case 'digivolve':
        digimon = field.hand[answer.index];
        previous = field.battlezone[answer.target];
        gameStack.evolve({ ...digimon, previous });
        await registerTrigger(answer.action, gameBoard, player, [digimon, previous]);
        break;

      case 'tamer':
        tamer = field.hand[answer.index];
        gameStack.setState({ ...tamer, location: 'BATTLEZONE' });
        await registerTrigger(answer.action, gameBoard, player, [tamer]);
        break;

      case 'option':
        option = field.hand[answer.index];
        gameStack.setState({ ...option, location: 'BATTLEZONE' });
         await registerTrigger(answer.action, gameBoard, player, [option]);
        break;

      case 'attack':
        digimon = field.battlezone[answer.index];
        gameStack.setState({ ...digimon, location: 'BATTLEZONE', position: 'Suspended' });
        await registerTrigger(answer.action, gameBoard, player, [digimon], answer.target);
        break;

      case 'next':
        gameBoard.nextPhase(4);
        break;
    }
  });
}

function suggestBreedingAction(gameBoard, player) {
  const field = generateSinglePlayerView(player);
  const hatch = !field.breedingzone.length;
  const move = hatch ? false : field.breedingzone[0][field.breedingzone[0].length - 1].level > 2;

  const options = {
    hatch,
    move,
    nothing: true
  };

  return new Promise((resolve, reject) => {
    gameBoard.question(player, 'breeding', options, 1, (answer) => {
      const field = generateSinglePlayerView(player);
      switch (answer) {
        case 'hatch':
          {
            const digimon = field.egg[field.egg.length - 0];
            gameStack.setState({ ...digimon, location: 'BREEDINGZONE', position: 'Unsuspended' });
          }
          break;
        case 'move':
          {
            const digimon = field.breedingzone[0];
            gameStack.setState({ ...digimon, location: 'BATTLEZONE' });
          }
          break;
        case 'nothing':
          break;
      }
      resolve();
    });
  });
}

function suggestAction() {
  suggestBreedingAction(phase, gameBoard, player);
}

async function turn(player) {
  let gameLoss;
  let outOfMemory = false;

  unspendedCards = unsuspendPhase(gameBoard, player);
  nextPhase(1);
  gameLoss = !drawPhase(gameBoard, player);
  if (gameLoss) {
    return gameLoss;
  }
  nextPhase(2);
  gameLoss = await suggestBreedingAction(gameBoard, player);
  gameBoard.nextPhase(3);

  while (!outOfMemory) {
    gameLoss = await suggestMainAction(gameBoard, player);
    if (gameLoss) {
      return gameLoss;
    }
    outOfMemory = player ? gameBoard.memory > -1 : gameBoard.memory < 1;
  }

  endPhase(gameBoard, player);

  const nextPlayer = 0 ? 1 : 0;
  turn(nextPlayer);
}

function suggestAction() {
  const attack = getAttackers();
}

function Game(decks, playerInterface) {
  // decide who goes first

  const gameBoard = new GameBoard(playerInterface);

  // load decks into deckspace and egg zone
  gameBoard.load(decks[0], decks[1]);

  // load security
  gameBoard.recover(0, 5);
  gameBoard.recover(1, 5);

  // draw 5
  gameBoard.drawCard(0, 5);
  gameBoard.drawCard(1, 5);

  // start phases

  turn(0);
}
