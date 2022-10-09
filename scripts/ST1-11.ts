import { isThisDigimon, Pile, Engine } from "./helpers";

function duringYourTurn(card: Pile, engine: Engine): Effect {
  return {
    type: ["WHEN_DIGIVOLVING"],
    trigger: ({ player, cards, targets }) => {
      return isThisDigimon(engine, card, cards);
    },
    effect: () => {
      engine.registerSecurityCheckAugmentation(card.uid, (attacker, count) => {
        const digimon = engine.getOwner(card);
        if (digimon.uid === attacker.uid) {
          const additionalAttacks = Math.floor((digimon.list.length - 1) / 2);
          return count + additionalAttacks;
        }
        return count;
      });
    },
  };
}

function register(card: Pile, engine: Engine): Effect[]  {
  card.playCost = 12;
  card.color = [COLOR.RED];
  card.level = LEVEL.MEGA;
  card.id = "ST1-11";
  card.dp = 12000;
  card.type = [TYPE.Dragonkin];
  card.digivolutionCosts = [
    {
      color: COLOR.RED,
      level: 4,
      cost: 5,
      digimon: [],
    },
  ];
  return [duringYourTurn(card, engine)];
}

export default {
  register,
};
