import { Pile, Engine, isThisDigimon } from "./helpers";

function whenAttacking(card: Pile, engine: Engine): Effect {
  return {
    type: ["WHEN_ATTACKING"],
    trigger: ({ cards }) => {
      return isThisDigimon(engine, card, cards);
    },
    effect: () => {
      if (!card.flags.usedOPT) {
        card.position === "Unsuspended";
        card.flags.usedOPT = true;
      }
      engine.atEndOfYourTurn(card, () => {
        card.flags.usedOPT = false;
      });
    },
  };
}

function register(card: Pile, engine: Engine): Effect[] {
  card.color = [COLOR.BLUE];
  card.playCost = 12;
  card.level = LEVEL.MEGA;
  card.id = "ST2-11";
  card.dp = 11000;
  card.type = [TYPE.Cyborg];
  card.attribute = ATTRIBUTE.Data;
  card.digivolutionCosts = [
    {
      color: COLOR.BLUE,
      cost: 4,
      level: 5,
      digimon: [],
    },
  ];
  card.flags.usedOPT = false;
  return [whenAttacking(card, engine)];
}

export default {
  register,
};
