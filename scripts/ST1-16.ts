import { Pile, Engine, isThisOption, getOpponentsDigimon } from "./helpers";

function onPlay(card: Pile, engine: Engine) {
  function mainEffect() {
    const options = getOpponentsDigimon(engine, card);
    if (!options.length) {
      return;
    }
    return new Promise((resolve) => {
      engine.gameboard.question(
        card.player,
        "select",
        options,
        1,
        async (selected) => {
          engine.toDelete(selected, card);
        }
      );
    });
  }

  return {
    type: "ON_PLAY",
    trigger: ({ player, cards, targets }) => {
      return isThisOption(engine, card, cards);
    },
    effect: mainEffect,
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
  card.playCost = 8;
  card.color = [COLOR.RED];
  card.id = "ST1-16";

  return [onPlay(card, engine), security(card, engine)];
}

export default {
  register,
};
