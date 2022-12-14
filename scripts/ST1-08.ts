import { isThisDigimon, getYourDigimon, Pile, Engine } from "./helpers";

function duringYourTurn(card: Pile, engine: Engine): Effect {
  return {
    type: ["WHEN_DIGIVOLVING"],
    trigger: ({ player, cards, targets }) => {
      return isThisDigimon(engine, card, cards);
    },
    effect: () => {
      const options = getYourDigimon(engine, card);
      if (!options.length) {
        return;
      }
      return new Promise((resolve) => {
        engine.gameboard.question(
          card.player,
          "select",
          options,
          1,
          async (digimon) => {
            await engine.dpChange(digimon, 3000);
            engine.atEndOfYourTurn(card.uid, async () => {
              if (digimon.location === LOCATION.BATTLEZONE) {
                await engine.dpChange(digimon, -3000);
              }
            });
          }
        );
      });
    },
  };
}

function register(card: Pile, engine: Engine): Effect[]  {
  card.playCost = 6;
  card.color = [COLOR.RED];
  card.level = LEVEL.ULTIMATE;
  card.id = "ST1-08";
  card.dp = 4000;
  card.type = [TYPE.Birdkin];
  card.digivolutionCosts = [
    {
      color: COLOR.RED,
      level: 3,
      cost: 4,
      digimon: [],
    },
  ];
  return [duringYourTurn(card, engine)];
}

export default {
  register,
};
