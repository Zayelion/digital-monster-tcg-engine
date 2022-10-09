import {  Pile, Engine } from "./helpers";

function register(card: Pile) {
  card.playCost = 4;
  card.color = [COLOR.RED];
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
