import { Pile } from "./helpers";

function register(card: Pile) : Effect[]{
  card.color = [COLOR.BLUE];
  card.playCost = 4;
  card.level = LEVEL.CHAMPION;
  card.id = "ST2-05";
  card.dp = 5000;
  card.type = [TYPE["Sea Beast"]];
  card.attribute = ATTRIBUTE.Vaccine;
  card.digivolutionCosts = [
    {
      color: COLOR.BLUE,
      cost: 2,
      level: 3,
      digimon: [],
    },
  ];
  return [];
}

export default {
  register,
};
