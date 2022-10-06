function digivolve(self, gameBoard) {
  return {
    type: "CAN_DIGIVOLVE",
    trigger: ({ action, owner, cards, target }) => {
      return self;
    },
    effect: () => {},
  };
}

function onPlay(self, gameBoard) {
  return {
    type: "ON_PLAY",
    trigger: ({ action, owner, cards, target }) => {},
    effect: () => {},
  };
}

function onDigivolve(self, gameBoard) {
  return {
    type: "ON_DIGIVOLVE",
    trigger: ({ owner, cards, target }) => {},
    effect: () => {},
  };
}

function onTurnStart(self, gameBoard) {
  return {
    type: "ON_TURN_START",
    trigger: ({ owner, cards, target }) => {},
    effect: () => {},
  };
}

function whileAttacking(self, gameBoard) {
  return {
    type: "WHILE_ATTACKING",
    trigger: ({ cards, target }) => {},
    effect: () => {},
  };
}

function register(self, gameBoard) {
  return [
    onTurnStart(self, gameBoard),
    onPlay(self, gameBoard),
    onDigivolve(self, gameBoard),
    whileAttacking(self, gameBoard),
  ];
}

module.exports = {
  register,
};
