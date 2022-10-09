import { Pile, Engine } from "./helpers";

function register(card: Pile) {
  card.playCost = 2;
  card.color = [COLOR.RED];
  card.level = LEVEL.ROOKIE;
  card.id = "ST1-04";
  card.dp = 4000;
  card.type = [TYPE.Dragon];
  card.attribute = ATTRIBUTE.Data;
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
