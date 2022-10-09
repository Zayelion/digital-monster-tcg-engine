import { Pile, Engine, getOpponentsDigimon, isThisOption } from "./helpers";

function duringYourTurn(card: Pile, engine: Engine): Effect {
  return {
    type: ["ON_PLAY"],
    trigger: ({ player, cards, targets }) => {
      return isThisOption(engine, card, cards);
    },
    effect: async () => {
      const options = getOpponentsDigimon(engine, card).filter((digimon) => {
        return digimon.list.length < 2;
      });
      if (options.length) {
        return;
      }

      engine.gameboard.question(
        card.player,
        "select",
        options,
        1,
        async (index) => {
          const digimon = options[index];
          digimon.flags.cannotAttack = true;
          digimon.flags.cannontBlock = true;
          engine.atEndOfYourOpponentsNextTurn(card, () => {
            digimon.flags.cannotAttack = false;
            digimon.flags.cannontBlock = false;
          });
        }
      );
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
      const options = getOpponentsDigimon(engine, card).filter((digimon) => {
        return digimon.list.length < 2;
      });
      if (options.length) {
        return;
      }

      engine.gameboard.question(
        card.player,
        "select",
        options,
        1,
        async (index) => {
          const digimon = options[index];
          digimon.flags.cannotAttack = true;
          digimon.flags.cannontBlock = true;
          engine.atEndOfYourNextTurn(card, () => {
            digimon.flags.cannotAttack = false;
            digimon.flags.cannontBlock = false;
          });
        }
      );
    },
  };
}

function register(card: Pile, engine: Engine): Effect[] {
  card.playCost = 2;
  card.color = [COLOR.BLUE];
  card.id = "ST2-14";

  return [duringYourTurn(card, engine), security(card, engine)];
}

export default {
  register,
};
