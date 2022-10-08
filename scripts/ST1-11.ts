/**
 * 		
WarGreymon
DP 12000
Play Cost	12
Evolution Cost 4 from Lv.5
Level 6
ST1-10
Level: Ultimate | Attribute: Vaccine | Type: Dragonkin
Effects:
• Your Turn For every 2 Evolution Bases this Digimon has, this Digimon gains Security Attack + 1 (The number of Security cards this Digimon Checks increases by 1).
Evolution Base Effects:
  -
**/

import { isThisDigimon, Pile, Engine } from "./helpers";

function duringYourTurn(card: Pile, engine: Engine) {
  return {
    type: "WHEN_DIGIVOLVING",
    trigger: ({ player, cards, targets }) => {
      return isThisDigimon(engine, card, cards);
    },
    effect: () => {
      engine.registerSecurityAugmentation(card.uid, (attacker, count) => {
        const digimon = engine.getOwner(card);
        if (digimon.uid === attacker.uid) {
          const additionalAttacks = Math.floor((digimon.list.length - 1) /2)
          return count + additionalAttacks;
        }
        return count;
      });
    },
  };
}

function register(card: Pile, engine: Engine) {
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
