import { Pile, Engine, isThisOption, getYourDigimon } from "./helpers";

function onPlay(card: Pile, engine: Engine): Effect {
  return {
    type: ["ON_PLAY"],
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

function security(card: Pile, engine: Engine): Effect {
  return {
    type: ["SECURITY"],
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

function register(card: Pile, engine: Engine): Effect[]  {
  card.playCost = 2;
  card.color = [COLOR.RED];
  card.id = "ST1-14";

  return [onPlay(card, engine), security(card, engine)];
}

export default {
  register,
};
