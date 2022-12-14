import { Pile, Engine, isThisDigimon } from "./helpers";

function blocker(card: Pile, engine: Engine): Effect {
  return {
    type: ["BLOCKER"],
    trigger: () => {
      return true;
    },
    effect: (target) => {
      engine.blocker(card, target);
    },
  };
}

function whenAttacking(card: Pile, engine: Engine): Effect {
  return {
    type: ["WHEN_ATTACKING"],
    trigger: ({ cards }) => {
      return isThisDigimon(engine, card, cards);
    },
    effect: () => {
      engine.memory(card.player, -2);
    },
  };
}

function register(card: Pile, engine: Engine): Effect[]  {
  card.playCost = 5;
  card.color = [COLOR.RED];
  card.level = LEVEL.CHAMPION;
  card.id = "ST1-06";
  card.dp = 6000;
  card.type = [TYPE.Dragon];
  card.digivolutionCosts = [
    {
      color: COLOR.RED,
      level: 3,
      cost: 2,
      digimon: [],
    },
  ];
  return [blocker(card, engine), whenAttacking(card, engine)];
}

export default {
  register,
};
