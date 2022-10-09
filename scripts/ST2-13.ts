import { Pile, Engine, isThisTamer, isThisOption } from "./helpers";

function duringYourTurn(card: Pile, engine: Engine): Effect {
  return {
    type: ["ON_PLAY"],
    trigger: ({ player, cards, targets }) => {
      return isThisOption(engine, card, cards);
    },
    effect: async () => {
      engine.memory(card.player, 1);
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
      engine.memory(card.player, 2);
    },
  };
}

function register(card: Pile, engine: Engine): Effect[] {
  card.playCost = 0;
  card.color = [COLOR.BLUE];
  card.id = "ST2-13";

  return [duringYourTurn(card, engine), security(card, engine)];
}

export default {
  register,
};
