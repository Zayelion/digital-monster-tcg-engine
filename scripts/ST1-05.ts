/**

Birdramon
DP 5000
Play Cost 4
Evolution Cost 2 from Lv.3
Lv.3		
ST1-05
Level: Champion | Attribute: Data | Type: Dragon
Effects:
-

Evolution Base Effects:
-
**/

import { GameBoard, Pile } from "../server/core/model_gameboard";

function register(self: Pile) {
  self.level = LEVEL.CHAMPION;
  self.id = "ST1-05";
  self.type = [TYPE["Giant Bird"]];
  self.attribute = ATTRIBUTE.Vaccine;
  self.digivolutionCosts = [
    {
      color: COLOR.RED,
      level: 3,
      cost: 2,
      digimon: [],
    },
  ];
  return [];
}

module.exports = {
  register,
};
