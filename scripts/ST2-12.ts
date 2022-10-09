import { Pile, Engine, isThisTamer, getOpponentsDigimon } from "./helpers";

function duringYourTurn(card: Pile, engine: Engine): Effect {
  return {
    type: ["YOUR_TURN", "SECURITY"],
    trigger: ({ player, cards, targets }) => {
      return isThisTamer(engine, card, cards);
    },
    effect: async () => {
      const options = getOpponentsDigimon(engine, card).filter((digimon) => {
        return digimon.list.length > 1;
      });
      if (options.length) {
        return;
      }
      engine.memory(card.player, 1);
    },
  };
}

function security(card: Pile, engine: Engine): Effect {
  return {
    type: ["SECURITY"],
    trigger: ({ player, cards, targets }) => {
      return isThisTamer(engine, card, cards);
    },
    effect: async () => {
      engine.gameboard.moveCard({ ...card, location: LOCATION.BATTLEZONE });
    },
  };
}

function register(card: Pile, engine: Engine): Effect[] {
  card.playCost = 2;
  card.color = [COLOR.BLUE];
  card.id = "ST2-12";

  return [duringYourTurn(card, engine), security(card, engine)];
}

export default {
  register,
};
