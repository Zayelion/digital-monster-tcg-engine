import { Pile, Engine, isThisDigimon, getOpponentsDigimon } from "./helpers";

function whenDigivolving(card: Pile, engine: Engine): Effect {
  return {
    type: ["WHEN_DIGIVOLVING"],
    trigger: ({ cards }) => {
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
          let bottom = digimon.detach(digimon.list.length - 1);
          engine.gameboard.moveCard({ ...bottom, location: LOCATION.TRASH });
          if (bottom.list.length > 1) {
            bottom = digimon.detach(digimon.list.length - 1);
            engine.gameboard.moveCard({ ...bottom, location: LOCATION.TRASH });
          }
        }
      );
    },
  };
}

function register(card: Pile, engine: Engine): Effect[] {
  card.playCost = 6;
  card.color = [COLOR.BLUE];
  card.level = LEVEL.ULTIMATE;
  card.id = "ST2-09";
  card.dp = 7000;
  card.type = [TYPE["Sea Animal"]];
  card.digivolutionCosts = [
    {
      color: COLOR.BLUE,
      cost: 3,
      level: 4,
      digimon: [],
    },
  ];
  return [whenDigivolving(card, engine)];
}

export default {
  register,
};
