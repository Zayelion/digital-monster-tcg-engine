import { isThisDigimon, Pile, Engine } from "./helpers";

function duringYourTurn(card: Pile, engine: Engine) {
  return {
    type: "BLOCKED",
    trigger: ({ player, cards, targets }) => {
      return isThisDigimon(engine, card, cards);
    },
    effect: () => {
      engine.memory(card.player, 3);
    },
  };
}

function register(card: Pile, engine: Engine) {
  card.playCost = 5;
  card.color = [COLOR.RED];
  card.level = LEVEL.ULTIMATE;
  card.id = "ST1-09";
  card.dp = 7000;
  card.type = [TYPE.Cyborg];
  card.digivolutionCosts = [
    {
      color: COLOR.RED,
      level: 4,
      cost: 3,
      digimon: [],
    },
  ];
  return [duringYourTurn(card, engine)];
}

export default {
  register,
};
