/**
Agumon
DP2000
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

function duringYourTurn(self: Pile) {
  return {
    type: "YOUR_TURN",
    trigger: () => {
      return true
    },
    effect: () => {
      const value = self.currentDP || 0;
      self.currentDP = value + 1000;
    },
  };
}

function register(self: Pile) {
  self.level = LEVEL.ROOKIE;
  self.id = "ST1-03";
  self.type = [TYPE.Reptile];
  self.digivolutionCosts = [
    {
      color: COLOR.RED,
      level: 2,
      cost: 0,
      digimon: [],
    },
  ];
  return [duringYourTurn(self)];
}

module.exports = {
  register,
};
