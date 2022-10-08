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

export function getYourDigimon(engine: Engine, target: Pile): Pile[] {
  const battlezone = engine.gameboard.getField(target.player).BATTLEZONE;
  const options = battlezone.filter((battler) => {
    return battler.dp;
  });

  return options;
}


