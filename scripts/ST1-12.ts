/**
 * 		
Yagami Taichi
Play Cost	2
ST1-12
Effects:
- Your Turn All of your Digimon get +1000 DP.
  Security Effect: Security Play this card without paying its Cost.
**/

import { Pile, Engine, isThisTamer, getYourDigimon } from "./helpers";

function duringYourTurn(card: Pile, engine: Engine) {
  return {
    type: "YOUR_TURN",
    trigger: ({ player, cards, targets }) => {
      return isThisTamer(engine, card, cards);
    },
    effect: async () => {
      const options = getYourDigimon(engine, card);
      if (!options.length) {
        return;
      }

      const registration = options.map(async(digimon) => {
        await engine.dpChange(digimon, 1000);
        engine.atEndOfYourTurn(card, async () => {
          if (digimon.location === LOCATION.BATTLEZONE) {
            await engine.dpChange(digimon, -1000);
          }
        });
      });

      Promise.all(registration);
    },
  };
}

function security(card: Pile, engine: Engine) {
  return {
    type: "SECURITY",
    trigger: ({ player, cards, targets }) => {
      return isThisTamer(engine, card, cards);
    },
    effect: async () => {
     engine.gameboard.moveCard({...card, location: LOCATION.BATTLEZONE})
    },
  };
}

function register(card: Pile, engine: Engine) {
  card.playCost = 2;
  card.color = [COLOR.RED];
  card.id = "ST1-12";

  return [duringYourTurn(card, engine), security(card, engine)];
}

export default {
  register,
};
