import { resolve } from 'path';
import { GameBoard, Pile } from './model_gameboard';

export type CostReduction = {
  id: string;
  effect: Function;
};

export type SecurityAugmentation = {
  id: string;
  effect: (card: Pile, cost: number) => number;
};

export type TurnEndAction = {
  id: string;
  effect: () => Promise<void>;
};

export class Engine {
  gameboard: GameBoard;
  costReductions: CostReduction[] = [];
  securityAugmentations: SecurityAugmentation[] = [];
  turnEndActions: TurnEndAction[] = [];
  registerTrigger: Function;

  constructor(gameboard: GameBoard, registerTrigger: Function) {
    this.gameboard = gameboard;
    this.registerTrigger = registerTrigger;
  }

  getDigivolutionCost(card: Pile) {
    return card.digivolutionCosts?.map((digivolutionCost) => {
      const cost = this.costReductions.reduce((cost, reduction) => {
        return reduction.effect(card, cost);
      }, digivolutionCost.cost);

      return {
        color: digivolutionCost.color,
        cost,
        digimon: digivolutionCost.digimon
      };
    });
  }

  registerCostReduction(id, effect) {
    this.costReductions.push({ id, effect });
  }

  deregisterReduction(id) {
    this.costReductions = this.costReductions.filter((reduction) => {
      return reduction.id !== id;
    });
  }

  getSecurityAugmentation(card): number {
    const count = this.securityAugmentations.reduce((cost, augmentation) => {
      return augmentation.effect(card, cost);
    }, 1);
    return count;
  }

  registerSecurityAugmentation(id, effect): void {
    this.securityAugmentations.push({ id, effect });
  }

  deregisterSecurityAugmentation(id): void {
    this.securityAugmentations = this.securityAugmentations.filter((reduction) => {
      return reduction.id !== id;
    });
  }

  draw(player, amount): void {
    this.gameboard.drawCard(player, amount);
  }

  getOwner(card: Pile): Pile {
    return (
      this.gameboard.getCards().filter((card) => {
        return card.state.pileuid === card.state.uid;
      }) || card
    );
  }

  memory(player, amount) {
    if (player === PLAYER.ONE) {
      this.gameboard.memory = this.gameboard.memory + amount;
    }
    if (player === PLAYER.TWO) {
      this.gameboard.memory = this.gameboard.memory - amount;
    }
  }

  async securityCheck(card) {
    const attackedPlayer = card.player === PLAYER.ONE ? PLAYER.TWO : PLAYER.ONE;
    const augmentation = this.getSecurityAugmentation(card);
    const count = augmentation > 0 ? augmentation : 0;

    if (!count) {
      return;
    }

    for (let checks = 0; count < checks; checks++) {
      let topCardOfSecurityStack = this.gameboard.field.search({
        player: attackedPlayer,
        location: 'security',
        index: 0
      });

      topCardOfSecurityStack = this.gameboard.moveCard({
        ...topCardOfSecurityStack,
        position: 'suspended'
      });

      await this.registerTrigger(
        'ON_SECURITY_CHECK',
        this.gameboard,
        card.player,
        [topCardOfSecurityStack],
        [card]
      );

      const defeated = card.jamming && (card?.currentDP || 0) < (topCardOfSecurityStack.currentDP || 0);
      this.gameboard.moveCard({ ...topCardOfSecurityStack, location: 'trash' });

      if (defeated) {
        this.gameboard.moveCard({ ...card, location: 'trash' });
      }
    }
  }

  async toDelete(card, target) {
    await this.registerTrigger('RETALIATION', this.gameboard, card.player, [card], [target]);
    await this.registerTrigger('ON_DELETION', this.gameboard, card.player, [card]);
  }

  async battle(card: Pile, target: Pile) {
    const defeated = (card?.currentDP || 0) < (target.currentDP || 0) ? card : target;
    await this.toDelete(defeated, target);
    await this.registerTrigger('PIERCE', this.gameboard, card.player, [card]);
    if (defeated.player !== card.player) {
      await this.registerTrigger('AFTER_ATTACKING', this.gameboard, card.player, [card]);
    }
  }

  async blocker(card: Pile, target: Pile) {
    return new Promise((resolve) => {
      this.gameboard.question(card.player, 'blocker', [card], 1, async (answer) => {
        if (answer) {
          card.position = 'suspended';
          target.blocked = true;
          await this.battle(card, target);
          resolve(true);
        }
        resolve(false);
      });
    });
  }

  pierce(card: Pile) {
    this.securityCheck(card);
  }

  async declareBattle(card: Pile) {
    await this.registerTrigger('WHILE_ATTACKING', this.gameboard, card.player, [card]);
    await this.registerTrigger('BLOCKER', this.gameboard, card.player, [card]);
    if (card.blocked) {
      await this.registerTrigger('BLOCKED', this.gameboard, card.player, [card]);
      card.blocked = false;
    }
    this.securityCheck(card);
    await this.registerTrigger('AFTER_ATTACK', this.gameboard, card.player, [card]);
  }

  blitz(card: Pile): Promise<boolean> {
    return new Promise((resolve) => {
      this.gameboard.question(card.player, 'blitz', [card], 1, async (answer) => {
        if (answer.ok) {
          card.position = 'suspended';
          await this.declareBattle(card);
        }
        resolve(true);
      });
    });
  }

  async dpChange(card: Pile, amount: number) {
    card.currentDP = (card.currentDP || 0) + amount;
    if (card.location === 'battlezone' && card.currentDP < 1) {
      await this.registerTrigger('ON_DELETION', this.gameboard, card.player, [card]);
    }
  }

  registerTurnEndAction(id, action) {
    this.costReductions.push({ id, effect: action });
  }

  async resolveTurnEndActions() {
    await Promise.all(this.turnEndActions.map((action) => action.effect()));
  }
}
