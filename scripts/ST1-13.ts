/**
 * 		
Shadow Wing
Play Cost	1
ST1-12
Effects:
- <Main> Choose one of your Digimon; that Digimon gets +3000 DP for the rest of this turn.

Security Effect: 
- <Security> All of your Digimon gain <Security Attack + 1> until the end of your next turn.
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
        engine.registerTurnEndAction(card.uid, async () => {
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

  card.digivolutionCosts = [
    {
      color: COLOR.RED,
      level: 3,
      cost: 4,
      digimon: [],
    },
  ];
  return [duringYourTurn(card, engine), security(card, engine)];
}

export default {
  register,
};
