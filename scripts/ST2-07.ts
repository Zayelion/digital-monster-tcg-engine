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
  card.color = [COLOR.BLUE];
  card.level = LEVEL.CHAMPION;
  card.id = "ST2-07";
  card.dp = 6000;
  card.type = [TYPE.Beast];
  card.digivolutionCosts = [
    {
      color: COLOR.BLUE,
      cost: 2,
      level: 3,
      digimon: [],
    },
  ];
  return [blocker(card, engine), whenAttacking(card, engine)];
}

export default {
  register,
};
