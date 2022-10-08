/**

Dracomon
DP 4000
Play Cost 2
Evolution Cost	3		0 from Lv.2
Lv.3		
ST1-04
Level: Child | Attribute: Data | Type: Dragon
Effects:
-

Evolution Base Effects:
-
**/

import { GameBoard, Pile } from "../server/core/model_gameboard";

function register(self: Pile) {
  self.level = LEVEL.ROOKIE;
  self.id = "ST1-04";
  self.type = [TYPE.Dragon];
  self.attribute = ATTRIBUTE.Data
  self.digivolutionCosts = [
    {
      color: COLOR.RED,
      level: 2,
      cost: 0,
      digimon: [],
    },
  ];
  return [];
}

module.exports = {
  register,
};
