import { Pile, Engine, getOpponentsDigimon, isThisDigimon } from "./helpers";

function whenAttacking(card: Pile, engine: Engine): Effect {
  return {
    type: ["WHEN_ATTACKING"],
    trigger: ({cards}) => {
      return isThisDigimon(engine, card, cards);
    },
    effect: () => {
      const options = getOpponentsDigimon(engine, card).filter((digimon) => {
        return digimon.list.length > 1;
      });
      if (!options.length) {
        return;
      }

      engine.gameboard.question(
        card.player,
        "select",
        options,
        1,
        async (digimon) => {
          const bottom = digimon.detach(digimon.list.length - 1);
          engine.gameboard.moveCard({ ...bottom, location: LOCATION.TRASH });
        }
      );
    },
  };
}

function register(card: Pile, engine: Engine): Effect[] {
  card.color = [COLOR.BLUE];
  card.playCost = 5;
  card.level = LEVEL.CHAMPION;
  card.id = "ST2-06";
  card.dp = 4000;
  card.type = [TYPE["Beast"]];
  card.attribute = ATTRIBUTE.Vaccine;
  card.digivolutionCosts = [
    {
      color: COLOR.BLUE,
      cost: 2,
      level: 3,
      digimon: [],
    },
  ];
  return [whenAttacking(card, engine)];
}

export default {
  register,
};
