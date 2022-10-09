import { Pile, Engine, isThisOption, getYourDigimon } from "./helpers";

function onPlay(card: Pile, engine: Engine) {
  return {
    type: "ON_PLAY",
    trigger: ({ player, cards, targets }) => {
      return isThisOption(engine, card, cards);
    },
    effect: async () => {
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
            engine.atEndOfYourTurn(card, async () => {
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

function security(card: Pile, engine: Engine) {
  return {
    type: "SECURITY",
    trigger: ({ player, cards, targets }) => {
      return isThisOption(engine, card, cards);
    },
    effect: async () => {
      engine.registerSecurityCheckAugmentation(card.uid, (attacker, count) => {
        if (card.player === attacker.player) {
          return count + 1;
        }
        return count;
      });

      engine.atEndOfYourNextTurn(card, async () => {
        engine.deregisterSecurityCheckAugmentation(card.uid);
      });
    },
  };
}

function register(card: Pile, engine: Engine) {
  card.playCost = 1;
  card.color = [COLOR.RED];
  card.id = "ST1-13";

  return [onPlay(card, engine), security(card, engine)];
}

export default {
  register,
};
