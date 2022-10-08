/**
Coredramon
DP 6000
Play Cost	5
Evolution Cost 2 from Lv.3
Level 4
ST1-06
Level: Champion | Attribute: Virus | Type: Dragon
Effects:
• Blocker (When the opponent Digimon performs an attack, if this Digimon is in the Active position, you may Rest this Digimon and change the target of the attack to this Digimon)
• When Attacking Memory -2.
Evolution Base Effects:
-
**/

import { Engine } from "../server/core/engine_api";
import { GameBoard, Pile } from "../server/core/model_gameboard";

function blocker(card: Pile, engine: Engine) {
  return {
    type: "BLOCKER",
    trigger: () => {
      return true
    },
    effect: (target) => {
      engine.blocker(card, target);
    },
  };
}

function whenAttacking(card: Pile, engine: Engine) {
  return {
    type: "WHEN_ATTACKING",
    trigger: () => {
      return true
    },
    effect: () => {
      engine.memory(card.player, -2)
    },
  };
}

function register(card: Pile, engine: Engine) {
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
