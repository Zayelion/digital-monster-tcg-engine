import { GameBoard, Pile } from "../server/core/model_gameboard";

function register(card: Pile) {
  card.color = [COLOR.RED];
  card.playCost = 2;
  card.level = LEVEL.ROOKIE;
  card.id = "ST1-02";
  card.dp = 3000;
  card.type = [TYPE.Chick];
  card.attribute = ATTRIBUTE.Vaccine;
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
