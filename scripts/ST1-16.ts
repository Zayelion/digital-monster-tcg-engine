import { Pile, Engine, isThisOption, getOpponentsDigimon } from "./helpers";

function onPlay(card: Pile, engine: Engine): Effect {
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
    type: ["ON_PLAY", "SECURITY"],
    trigger: ({ player, cards, targets }) => {
      return isThisOption(engine, card, cards);
    },
    effect: mainEffect,
  };
}



function register(card: Pile, engine: Engine): Effect[]  {
  card.playCost = 8;
  card.color = [COLOR.RED];
  card.id = "ST1-16";

  return [onPlay(card, engine)];
}

export default {
  register,
};
