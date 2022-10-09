import { Pile } from "./helpers";

function register(card: Pile): Effect[] {
  card.color = [COLOR.BLUE];
  card.playCost = 2;
  card.level = LEVEL.ROOKIE;
  card.id = "ST2-02";
  card.dp = 3000;
  card.type = [TYPE["Sea Beast"]];
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
