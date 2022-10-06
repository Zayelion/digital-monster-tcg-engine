class Engine {
  constructor(gameboard) {
    this.gameboard = gameboard;
    this.reductions = [];
  }

  getDigivolutionCost(card) {
    return card.digivolutionCosts.map((digivolutionCost) => {
      const cost = this.reductions.reduce((cost, reduction) => {
        return reduction.effect(card, cost);
      }, digivolutionCost.cost);

      return {
        color: digivolutionCost.color,
        cost,
        digimon: digivolutionCost.digimon
      };
    });
  }

  registerReduction(id, effect) {
    this.reductions.push({ id, effect });
  }

  deregisterReduction(id, effect) {
    this.reductions = this.reductions.filter((reduction) => {
      return reduction.id !== id;
    });
  }
}
