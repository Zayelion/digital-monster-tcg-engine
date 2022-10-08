
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
