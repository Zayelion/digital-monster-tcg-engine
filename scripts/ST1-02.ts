/**

Piyomon
DP 3000
Play Cost 2
Evolution Cost	2		0 from Lv.2
Lv.3		
ST1-02	
Level: Child | Attribute: Vaccine | Type: Chick
Effects:
-

Evolution Base Effects:
-
**/

import { GameBoard, Pile } from "../server/core/model_gameboard";

function register(self: Pile) {
  self.level = LEVEL.ROOKIE;
  self.id = "ST1-02";
  self.type = [TYPE.Chick];
  self.attribute = ATTRIBUTE.Vaccine
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
