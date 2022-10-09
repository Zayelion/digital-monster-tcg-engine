import { Engine } from "./../server/core/engine_api";
import { Pile } from "./../server/core/model_gameboard";

export { Engine, Pile };

export function isThisDigimon(engine: Engine, target: Pile, cards: Pile[]) {
  const digimon = engine.getOwner(target);
  const isTarget = cards.some((card) => {
    card.uid === digimon.uid;
  });
  return isTarget && digimon.list.length > 1;
}

export function isThisTamer(engine: Engine, target: Pile, cards: Pile[]) {
  return isThisDigimon(engine, target, cards);
}

export function isThisOption(engine: Engine, target: Pile, cards: Pile[]) {
  return isThisDigimon(engine, target, cards);
}

export function isInPlay(target: Pile) {
  return target.location === LOCATION.BATTLEZONE;
}

export function getYourDigimon(engine: Engine, target: Pile): Pile[] {
  const battlezone = engine.gameboard.getField(target.player).BATTLEZONE;
  const options = battlezone.filter((battler) => {
    return battler.dp;
  });

  return options;
}

export function getOpponentsDigimon(engine: Engine, target: Pile): Pile[] {
  const opponent = target.player ? PLAYER.TWO : PLAYER.ONE;
  const battlezone = engine.gameboard.getField(opponent).BATTLEZONE;
  const options = battlezone.filter((battler) => {
    return battler.dp;
  });

  return options;
}

export function removeEvolutionStack(engine, digimon) {
  for (let item = digimon.list.length - 1; item <= 1; item - 1) {
    const newDigimon = digimon.detach(item);
    engine.gameboard.moveCard({
      ...newDigimon,
      location: LOCATION.TRASH,
    });
  }
}
