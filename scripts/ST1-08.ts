/**
 * 		
Garudamon
DP 7000
Play Cost	6
Evolution Cost 3 from Lv.4
Level 5
ST1-07
Level: Ultimate | Attribute: Vaccine | Type: Bird Man
Effects:
-
Evolution Base Effects:
  Choose one of your Digimon; that Digimon gets +3000 DP for the rest of this turn.
**/

import { isThisDigimon, getYourDigimon, Pile, Engine } from "./helpers";

function duringYourTurn(card: Pile, engine: Engine) {
  return {
    type: "WHEN_DIGIVOLVING",
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
            engine.registerTurnEndAction(card.uid, () => {
              if (digimon.location === "BATTLEZONE") {
                await engine.dpChange(digimon, -3000);
              }
            });
          }
        );
      });
    },
  };
}

function register(card: Pile, engine: Engine) {
  card.playCost = 6;
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
