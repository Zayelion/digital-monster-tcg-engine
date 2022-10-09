import { Pile, Engine, isThisOption, getYourDigimon } from "./helpers";

function onPlay(card: Pile, engine: Engine): Effect {
  return {
    type: ["ON_PLAY", "SECURITY"],
    trigger: ({ player, cards, targets }) => {
      return isThisOption(engine, card, cards);
    },
    effect: async () => {
      const digimonOptions = getYourDigimon(engine, card).filter((digimon) => {
        return digimon.list.length > 1;
      });
      if (digimonOptions.length) {
        return;
      }
      engine.gameboard.question(
        card.player,
        "select",
        digimonOptions,
        1,
        async (index) => {
          const options = digimonOptions[index].list.filter((item, index) => {
            return index;
          });

          engine.gameboard.question(
            card.player,
            "select",
            options,
            1,
            async (selection) => {
              const newDigimon = digimonOptions[index].detach(selection - 1);
              engine.gameboard.moveCard({
                ...newDigimon,
                location: LOCATION.BATTLEZONE,
              });
            }
          );
        }
      );
    },
  };
}


function register(card: Pile, engine: Engine): Effect[] {
  card.playCost = 4;
  card.color = [COLOR.BLUE];
  card.id = "ST2-15";

  return [onPlay(card, engine)];
}

export default {
  register,
};
