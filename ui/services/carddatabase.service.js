import { cardStackSort, reduceCardDB } from '../util/cardManipulation';
import { getJSON } from '../util/fetch';
import { hey } from './listener.service';

async function getBanlistInfo() {
  const bdata = await getJSON('/manifest/banlist.json');
  const banlist = [];
  let primary;
  Object.keys(bdata).forEach((list) => {
    bdata[list].name = list;
    banlist.push(bdata[list]);
    if (bdata[list].primary) {
      primary = bdata[list].name;
    }
  });
  banlist.reverse();

  return {
    primary,
    banlist
  };
}

async function getSetCodes() {
  const raw = await getJSON('./setcodes.json', 'utf-8');

  return Object.keys(raw)
    .map(function (arch) {
      return {
        num: arch,
        name: raw[arch]
      };
    })
    .sort(function (a, b) {
      return a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: 'base'
      });
    });
}

async function loadCardDB() {
  const cardDatabase = await getJSON('./manifest/manifest_0-en-OCGTCG.json');
  const cardsets = cardDatabase.reduce(reduceCardDB, {});
  const sets = Object.keys(cardsets).sort();
  const setcodes = await getSetCodes();
  const { banlist, primary } = await getBanlistInfo();

  cardDatabase.sort(cardStackSort);

  return {
    cardDatabase,
    sets,
    banlist,
    primary,
    setcodes
  };
}

function CardDatabase() {
  let database = {
    cardDatabase: [],
    sets: [],
    banlist: [{}],
    primary: {},
    setcodes: []
  };

  loadCardDB().then((data) => {
    database = { ...data };
    hey({ action: 'LOAD_DATABASE' });
  });

  function getCardDatabase() {
    return database.cardDatabase;
  }

  function getSets() {
    return database.sets;
  }

  function getSetcodes() {
    return database.setcodes;
  }

  function getBanlist() {
    console.log(database.banlist);
    return database.banlist;
  }

  function getPrimaryBanlist() {
    return database.primary;
  }

  return {
    getCardDatabase,
    getSets,
    getSetcodes,
    getBanlist,
    getPrimaryBanlist
  };
}

export const { getCardDatabase, getSets, getSetcodes, getBanlist, getPrimaryBanlist } = new CardDatabase(
  {}
);
