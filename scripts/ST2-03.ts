import { Pile } from "./helpers";

function register(card: Pile): Effect[] {
  card.color = [COLOR.BLUE];
  card.playCost = 3;
  card.level = LEVEL.ROOKIE;
  card.id = "ST2-03";
  card.dp = 2000;
  card.type = [TYPE.Reptile];
  card.attribute = ATTRIBUTE.Data;
  card.digivolutionCosts = [
    {
      color: COLOR.BLUE,
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
