import { GameBoard, Pile } from "../server/core/model_gameboard";

function register(card: Pile): Effect[] {
  card.playCost = 10;
  card.color = [COLOR.RED];
  card.level = LEVEL.MEGA;
  card.id = "ST1-02";
  card.dp = 12000;
  card.type = [TYPE["Holy Beast"]];
  card.attribute = ATTRIBUTE.Vaccine;
  card.digivolutionCosts = [
    {
      color: COLOR.RED,
      cost: 2,
      level: 5,
      digimon: [],
    },
  ];
  return [];
}

export default {
  register,
};
