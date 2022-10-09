import { Pile, Engine, isThisDigimon, getOpponentsDigimon } from "./helpers";

function onPlay(card: Pile, engine: Engine): Effect {
  return {
    type: ["ON_PLAY", "WHEN_DIGIVOLVING"],
    trigger: ({ cards }) => {
      return isThisDigimon(engine, card, cards);
    },
    effect: () => {
      engine.registerSecurityCheckAugmentation(card.uid, (card, count) => {
        const enabler = getOpponentsDigimon(engine, card).some((digimon) => {
          return digimon.list.length > 1;
        });
        if (enabler) {
          return count + 1;
        }
        return count;
      });
    },
  };
}

function register(card: Pile, engine: Engine): Effect[]  {
  card.playCost = 7;
  card.color = [COLOR.BLUE];
  card.level = LEVEL.ULTIMATE;
  card.id = "ST2-08";
  card.dp = 7000;
  card.type = [TYPE.Beastkin];
  card.digivolutionCosts = [
    {
      color: COLOR.BLUE,
      cost: 3,
      level: 4,
      digimon: [],
    },
  ];
  return [onPlay(card, engine)];
}

export default {
  register,
};
