import { Pile, Engine, isThisDigimon } from "./helpers";

function duringYourTurn(card: Pile, engine: Engine): Effect {
  return {
    type: ["WHILE_ATTACKING"],
    trigger: ({ cards, target }) => {
      const digimon = engine.getOwner(card);
      return target[0].list.length < 4 && isThisDigimon(engine, digimon, cards)
      
    },
    effect: () => {
      const value = card.currentDP || 0;
      card.currentDP = value + 1000;
    },
  };
}

function register(card: Pile, engine: Engine): Effect[]  {
  card.color = [COLOR.BLUE];
  card.level = LEVEL.BABY;
  card.id = "ST2-01";
  card.type = [TYPE.Lesser];
  card.digivolutionCosts = [];
  return [duringYourTurn(card, engine)];
}

export default {
  register,
};
