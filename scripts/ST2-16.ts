import {
  Pile,
  Engine,
  isThisOption,
  removeEvolutionStack,
  getOpponentsDigimon,
} from "./helpers";

function onPlay(card: Pile, engine: Engine): Effect {
  return {
    type: ["ON_PLAY", "SECURITY"],
    trigger: ({ player, cards, targets }) => {
      return isThisOption(engine, card, cards);
    },
    effect: async () => {
      const options = getOpponentsDigimon(engine, card);
      if (!options.length) {
        return;
      }
      engine.gameboard.question(
        card.player,
        "select",
        options,
        1,
        async (index) => {
          const digimon = options[index];
          removeEvolutionStack(engine, digimon);
          engine.gameboard.moveCard({...digimon, location: LOCATION.HAND})
        }
      );
    },
  };
}

function register(card: Pile, engine: Engine): Effect[] {
  card.playCost = 7;
  card.color = [COLOR.BLUE];
  card.id = "ST2-16";

  return [onPlay(card, engine)];
}

export default {
  register,
};
