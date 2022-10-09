import { Pile, Engine } from "./helpers";

function duringYourTurn(card: Pile, engine: Engine) {
  return {
    type: "YOUR_TURN",
    trigger: ({ cards, target }) => {
      const digimon = engine.getOwner(card);
      return digimon.list.length > 4;
    },
    effect: () => {
      const value = card.currentDP || 0;
      card.currentDP = value + 1000;
    },
  };
}

function register(card: Pile, engine: Engine) {
  card.color = [COLOR.RED];
  card.level = LEVEL.BABY;
  card.id = "ST1-01";
  card.type = [TYPE.Lesser];
  card.digivolutionCosts = [];
  return [duringYourTurn(card, engine)];
}

export default {
  register,
};
