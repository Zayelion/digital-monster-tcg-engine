/**
 * 		
Koromon
ST1-01 U	
Level: Baby | Type: Lesser
Effects:
-

Evolution Base Effects:
• Your Turn As long as this Digimon has 4 or more Evolution Bases, this Digimon gets +1000 DP.
**/

import { Engine } from "../server/core/engine_api";
import { GameBoard, Pile } from "./../server/core/model_gameboard";

function duringYourTurn(self: Pile, engine: Engine) {
  return {
    type: "YOUR_TURN",
    trigger: ({ cards, target }) => {
      const digimon = engine.getOwner(self);
      return digimon.stack.lgenth > 4
    },
    effect: () => {
      const value = self.currentDP || 0;
      self.currentDP = value + 1000;
    },
  };
}

function register(self: Pile, engine: Engine) {
  self.level = LEVEL.BABY;
  self.id = "ST1-01";
  self.type = [TYPE.Lesser];
  self.digivolutionCosts = []
  return [duringYourTurn(self, engine)];
}

module.exports = {
  register,
};
