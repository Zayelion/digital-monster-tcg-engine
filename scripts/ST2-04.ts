import { Pile } from "./helpers";

function register(card: Pile) : Effect[]{
  card.color = [COLOR.BLUE];
  card.playCost = 3;
  card.level = LEVEL.ROOKIE;
  card.id = "ST2-04";
  card.dp = 4000;
  card.type = [TYPE.Beast];
  card.attribute = ATTRIBUTE.Vaccine;
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
