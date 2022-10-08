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

function register(card: Pile) {
  card.playCost = 2;
  card.color = [COLOR.RED];
  card.level = LEVEL.ROOKIE;
  card.id = "ST1-04";
  card.dp = 4000;
  card.type = [TYPE.Dragon];
  card.attribute = ATTRIBUTE.Data
  card.digivolutionCosts = [
    {
      color: COLOR.RED,
      level: 2,
      cost: 0,
      digimon: [],
    },
  ];
  return [];
}

export default {
  register,
};
