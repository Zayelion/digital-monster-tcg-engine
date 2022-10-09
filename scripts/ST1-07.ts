import { isThisDigimon, Pile, Engine } from "./helpers";

function duringYourTurn(card: Pile, engine: Engine) {
  return {
    type: "WHEN_DIGIVOLVING",
    trigger: ({ player, cards, targets }) => {
      return isThisDigimon(engine, card, cards);
    },
    effect: () => {
      engine.registerSecurityCheckAugmentation(card.uid, (attacker, count) => {
        const digimon = engine.getOwner(card);
        if (digimon.uid === attacker.uid) {
          return count + 1;
        }
        return count;
      });
    },
  };
}

function register(card: Pile, engine: Engine) {
  card.playCost = 5;
  card.color = [COLOR.RED];
  card.level = LEVEL.CHAMPION;
  card.id = "ST1-07";
  card.dp = 4000;
  card.type = [TYPE.Dinosaur];
  card.digivolutionCosts = [
    {
      color: COLOR.RED,
      level: 3,
      cost: 2,
      digimon: [],
    },
  ];
  return [duringYourTurn(card, engine)];
}

export default {
  register,
};
