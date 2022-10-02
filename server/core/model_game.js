const GameBoard = require('../model_gameboard');

function resolveEffects(type, cards) {}

function unsuspendPhase(gameBoard, player) {
  const gameStack = gameBoard.getState();

  const unsuspended = gameStack.filter((card) => {
    if (card.player === player && card.location === 'BATTLEZONE') {
      gameStack.setState({ ...card, position: 'Unsuspended' });
      return card;
    }
  });

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
  const option = field.hand; // filter options
  const play = field.hand; // filter options that are digimon

  const options = {
    play,
    digivolve,
    tamer,
    option,
    attack,
    next: true
  };

  gameBoard.question(player, 'main', options, 1, (answer) => {
    const field = generateSinglePlayerView(player);

    let digimon;
    let tamer;
    let option;

    switch (answer.action) {
      case 'play':
        digimon = field.hand[answer.index];
        gameStack.setState({ ...digimon, location: 'BATTLEZONE', position: 'Unsuspended' });
        resolveEffect(phase, gameBoard, player);
        break;

      case 'digivolve':
        digimon = field.hand[answer.index];
        previous = field.battlezone[answer.target];
        gameStack.evolve({ ...digimon, previous });
        resolveEffect(phase, gameBoard, player);
        break;

      case 'tamer':
        tamer = field.hand[answer.index];
        gameStack.setState({ ...tamer, location: 'BATTLEZONE' });
        resolveEffect(phase, gameBoard, player);
        break;

      case 'option':
        option = field.hand[answer.index];
        gameStack.setState({ ...option, location: 'BATTLEZONE' });
        resolveEffect(phase, gameBoard, player);
        break;

      case 'attack':
        digimon = field.battlezone[answer.index];
        gameStack.setState({ ...digimon, location: 'BATTLEZONE', position: 'Suspended' });
        resolveEffect(phase, gameBoard, player);
        break;

      case 'next':
        gameBoard.nextPhase(4);
        break;
    }

    resolveEffects(answer.action, [digimon, tamer, option]);
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
    outOfMemory = player ? gameBoard.memory > -1 : gameBoard.memory < 1;
    gameLoss = await suggestMainAction(gameBoard, player);
    if (gameLoss) {
      return gameLoss;
    }
  }

  endPhase(gameBoard, player);

  const nextPlayer = 0 ? 1 : 0;
  turn(nextPlayer);
}

function suggestAction() {
  const attack = getAttackers();
}

function Game() {
  const gameBoard = new GameBoard();

  // decide who goes first

  // load decks into deckspace and egg zone

  // load security

  // draw 5

  // start phases
}
