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

function duringYourTurn(card: Pile, engine: Engine) {
  return {
    type: "YOUR_TURN",
    trigger: ({ cards, target }) => {
      const digimon = engine.getOwner(card);
      return digimon.stack.lgenth > 4;
    },
    effect: () => {
      const value = card.currentDP || 0;
      card.currentDP = value + 1000;
    },
  };
}

function register(card: Pile, engine: Engine) {
  card.level = LEVEL.BABY;
  card.id = "ST1-01";
  card.type = [TYPE.Lesser];
  card.digivolutionCosts = [];
  return [duringYourTurn(card, engine)];
}

export default {
  register,
};
