import { Pile } from "./helpers";

function register(card: Pile): Effect[] {
  card.color = [COLOR.BLUE];
  card.playCost = 10;
  card.level = LEVEL.MEGA;
  card.id = "ST2-10";
  card.dp = 12000;
  card.type = [TYPE.Plesiosaur];
  card.attribute = ATTRIBUTE.Data;
  card.digivolutionCosts = [
    {
      color: COLOR.BLUE,
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
