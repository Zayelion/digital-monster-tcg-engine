/**
 * 		
Starlight Explosion
Play Cost	2
ST1-14
Effects:
- <Main> All of your Security Digimon get +7000 DP until the end of the opponent's next turn.

Security Effect: 
- <Security> All of your Security Digimon get +7000 DP for the rest of this turn.
**/

import { Pile, Engine, isThisOption, getYourDigimon } from "./helpers";

function onPlay(card: Pile, engine: Engine) {
  return {
    type: "ON_PLAY",
    trigger: ({ player, cards, targets }) => {
      return isThisOption(engine, card, cards);
    },
    effect: () => {
      engine.registerSecurityDPAugmentation(card.uid, (securityCard, dp) => {
        if (card.player === securityCard.player) {
          return dp + 7000;
        }
        return dp;
      });
      engine.atEndOfYourOpponentsNextTurn(card, () => {
        engine.deregisterSecurityDPAugmentation(card.uid);
      });
    },
  };
}

function security(card: Pile, engine: Engine) {
  return {
    type: "SECURITY",
    trigger: ({ player, cards, targets }) => {
      return isThisOption(engine, card, cards);
    },
    effect: async () => {
      engine.registerSecurityDPAugmentation(card.uid, (securityCard, dp) => {
        if (card.player === securityCard.player) {
          return dp + 7000;
        }
        return dp;
      });
      engine.atEndOfYourTurn(card, () => {
        engine.deregisterSecurityDPAugmentation(card.uid);
      });
    },
  };
}

function register(card: Pile, engine: Engine) {
  card.playCost = 2;
  card.color = [COLOR.RED];
  card.id = "ST1-14";

  return [onPlay(card, engine), security(card, engine)];
}

export default {
  register,
};
