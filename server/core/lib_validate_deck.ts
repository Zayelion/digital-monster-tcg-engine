/* eslint-disable no-plusplus */

export type Deck = {
  main: number[];
  egg: number[];
  side: number[];
};

type MappedDeck = {
  main: Map<string, number>;
  egg: Map<string, number>;
  side: Map<string, number>;
};

export type Banlist = {
  bannedTypes: any;
  exceptions: string;
  startDate: Date;
  endDate: Date;
  primary: boolean;
  modern: boolean;
  name: string;
  bannedCards: Map<string, number>;
};

type Validation = {
  error: Error | null;
  valid?: Boolean;
};

/**
 * Make sure the deck is of legal size
 */
function checkSize(deck: Deck, banlist: Banlist) {
  if (deck.main.length < 50) {
    throw new Error('Main Deck size below 50');
  }
  if (deck.main.length > 50) {
    throw new Error('Main Deck size above 50');
  }
  if (deck.side.length > 15) {
    throw new Error('Side Deck size above 15');
  }
  if (deck.egg.length > 5) {
    throw new Error('Extra Deck size above 15');
  }
  return true;
}

/**
 * Make sure specific copies of cards don't go over between decks
 */
function checkSubDeckAmounts(
  passcode: string,
  main: Map<string, number>,
  side: Map<string, number>,
  egg: Map<string, number>,
  search: Function
) {
  const MAXIMUM_COPIES = 3,
    reference = search(passcode),
    totals = main[passcode] + side[passcode] + egg[passcode];

  if (!reference) {
    throw new Error('Error loading deck: check Deck Edit to verify that your deck looks fine');
  }
  if (totals > MAXIMUM_COPIES) {
    throw new Error(`You can\'t have ${totals} copies of "${reference.name}"`);
  }
  return true;
}

/**
 * Check if the deck follows the provided banlist
 */
function checkBanlist(
  main: Map<string, number>,
  side: Map<string, number>,
  egg: Map<string, number>,
  banlist: Banlist,
  search: Function
) {
  for (let passcode in banlist.bannedCards) {
    const reference = search(passcode);
    let cardAmount = 0;

    if (reference.alias) {
      passcode = reference.alias;
    }
    if (main[passcode]) {
      cardAmount += main[passcode];
    }
    if (side[passcode]) {
      cardAmount += side[passcode];
    }
    if (egg[passcode]) {
      cardAmount += egg[passcode];
    }
    if (cardAmount > banlist.bannedCards[passcode]) {
      throw new Error(
        `The number of copies of ${reference.name} exceeds the number permitted by the selected Forbidden/Limited Card List`
      );
    }
  }
}

function mapSubDeck(subDeck: string[], search): Map<string, number> {
  return subDeck.reduce((deck, passcode) => {
    const cardObject = search(passcode);
    if (cardObject.alias) {
      passcode = cardObject.alias;
    }
    if (!deck[passcode]) {
      deck[passcode] = 1;
      return deck;
    }
    deck[passcode]++;
    return deck;
  }, new Map<string, number>());
}

/**
 * Maps deck from a list configuration to a hash map configuration
 */
function mapDecks(deck, search): MappedDeck {
  if (
    !deck.main ||
    !deck.side ||
    !deck.egg ||
    !Array.isArray(deck.main) ||
    !Array.isArray(deck.side) ||
    !Array.isArray(deck.egg)
  ) {
    throw new Error('Invalid deck object');
  }

  return {
    main: mapSubDeck(deck.main, search),
    side: mapSubDeck(deck.side, search),
    egg: mapSubDeck(deck.egg, search)
  };
}

function validateDeckToRegion(card, region, cardpool, banlist, search: Function): boolean {
  const reference = search(card),
    subreference = search(card);

  if (cardpool === 'OCG/TCG') {
    return true;
  }

  if (!reference[region].date) {
    throw new Error(`${reference.name} does not exist in the ${cardpool} card pool`);
  }

  if (reference[region].date > new Date(banlist.endDate)) {
    throw new Error(
      `${subreference.name}  does not exist in the timeframe of the selected Forbidden/Limited Card List`
    );
  }

  if (banlist.masterRule < 4 && reference.type >= 33554433) {
    throw new Error('Link Monsters are not permitted by the selected Forbidden/Limited Card List');
  }

  return true;
}

function checkAmounts(
  main: Map<string, number>,
  side: Map<string, number>,
  egg: Map<string, number>,
  search: Function
) {
  for (const card in main) {
    checkSubDeckAmounts(card, main, side, egg, search);
  }

  for (const card in side) {
    checkSubDeckAmounts(card, main, side, egg, search);
  }

  for (const card in egg) {
    checkSubDeckAmounts(card, main, side, egg, search);
  }
}

function checkRegion(main, side, egg, banlist, cardpool, search): void {
  const region = banlist.region;

  for (const card in main) {
    validateDeckToRegion(card, region, cardpool, banlist, search);
  }

  for (const card in side) {
    validateDeckToRegion(card, region, cardpool, banlist, search);
  }

  for (const card in egg) {
    validateDeckToRegion(card, region, cardpool, banlist, search);
  }
}

/**
 *
 * @param {Deck} deck deck to compare against the banlist
 * @param {Banlist} banlist banlist to validate the deck against
 * @param {Card[]} database all the avaliable cards in the game
 * @param {String} cardpool region of cards to use from the database
 * @return {Validation} validation information
 */
export function validateDeck(
  deck: Deck,
  banlist: Banlist,
  database: any[],
  cardpool: string = 'OCG/TCG'
): Validation {
  /**
   * Finds a single card based on ID
   * @param {Number} cardId Passcode/YGOPRO_ID
   * @return {Object} Full card data
   */
  function search(cardId) {
    const result = database.find((card) => {
      return card.id === parseInt(cardId, 10);
    });
    return result || {};
  }

  try {
    const { main, side, egg } = mapDecks(deck, search);
    checkSize(deck, banlist);
    checkAmounts(main, side, egg, search);
    checkBanlist(main, side, egg, banlist, search);
    checkRegion(main, side, egg, banlist, cardpool, search);
    
    return {
      error: null,
      valid: true
    };
  } catch (error) {
    return {
      error: error.toString(),
      valid: false
    };
  }
}
