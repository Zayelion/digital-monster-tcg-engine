import { Pile, Engine, isThisOption, getOpponentsDigimon } from "./helpers";

function onPlay(card: Pile, engine: Engine): Effect {
  function mainEffect() {
    const options = getOpponentsDigimon(engine, card).filter((digimon) => {
      return (digimon.currentDP || 0) <= 4000;
    });
    if (!options.length) {
      return;
    }
    return new Promise((resolve) => {
      engine.gameboard.question(
        card.player,
        "optional_select",
        options,
        2,
        async (selected) => {
          selected.forEach((digimon) => {
            engine.toDelete(digimon, card);
          });
        }
      );
    });
  }

  return {
    type:[ "ON_PLAY"],
    trigger: ({ player, cards, targets }) => {
      return isThisOption(engine, card, cards);
    },
    effect: mainEffect,
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
  card.playCost = 6;
  card.color = [COLOR.RED];
  card.id = "ST1-15";

  return [onPlay(card, engine), security(card, engine)];
}

export default {
  register,
};
