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

function register(card: Pile) {
  card.playCost = 4;
  card.level = LEVEL.CHAMPION;
  card.id = "ST1-05";
  card.dp = 5000;
  card.type = [TYPE["Giant Bird"]];
  card.attribute = ATTRIBUTE.Vaccine;
  card.digivolutionCosts = [
    {
      color: COLOR.RED,
      level: 3,
      cost: 2,
      digimon: [],
    },
  ];
  return [];
}

export default {
  register,
};
