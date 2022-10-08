/**
Agumon
DP 2000
Play Cost	3
Evolution Cost 0 from Lv.2
Level 3		
ST1-03
Level: Child | Attribute: Vaccine | Type: Reptile
Effects:
-

Evolution Base Effects:
• Your Turn This Digimon gets +1000 DP.
**/

import { GameBoard, Pile } from "../server/core/model_gameboard";

function duringYourTurn(card: Pile) {
  return {
    type: "YOUR_TURN",
    trigger: () => {
      return true
    },
    effect: () => {
      const value = card.currentDP || 0;
      card.currentDP = value + 1000;
    },
  };
}

function register(card: Pile) {
  card.playCost = 3;
  card.color = [COLOR.RED];
  card.level = LEVEL.ROOKIE;
  card.id = "ST1-03";
  card.dp = 2000;
  card.type = [TYPE.Reptile];
  card.digivolutionCosts = [
    {
      color: COLOR.RED,
      level: 2,
      cost: 0,
      digimon: [],
    },
  ];
  return [duringYourTurn(card)];
}

export default {
  register,
};