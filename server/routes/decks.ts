/* eslint-disable no-underscore-dangle */

import { Users } from '../models/users';
import { trace } from '../services/trace';
import { Router, Request, Response } from 'express';
import { authenticateToken, SecuredRequest } from './authentication';

export const deck = Router();

export async function createDeck(request: Request, response: Response, next: Function) {
  const span = trace(request, 'user creating a deck');
  try {
    const { deckId } = request.params;

    const {
      user: { id },
      body: { main, side, egg }
    } = request as SecuredRequest;

    if (!main || !side || !egg) {
      return response.status(401).send({ success: false });
    }

    const record = await Users.findById(id);

    if (!record) {
      return response.status(404).send({ success: false });
    }

    if (!record.decks?.length) {
      return response.status(404).send({ success: false });
    }

    const decks = record.decks;

   decks.push({ main, side, egg })

   
    await record.save();

    response.send({ success: true, deck: { main, side, egg } });
  } catch (error: any) {
    console.error({ error });
    response.sendStatus(500);
  }
  span.finish();
  next();
}

export async function updateDeck(request: Request, response: Response, next: Function) {
  const span = trace(request, 'user updating a specific deck');
  try {
    const { deckId } = request.params;

    const {
      user: { id },
      body: { key, name, uri, service, active }
    } = request as SecuredRequest;

    if (!key || !name || !uri || !service || typeof active !== 'boolean') {
      return response.status(401).send({ success: false });
    }

    const record = await Users.findById(id);

    if (!record) {
      return response.status(404).send({ success: false });
    }

    if (!record.decks?.length) {
      return response.status(404).send({ success: false });
    }

    const decks = record.decks
      .map((gate: { decks: any }) => {
        return gate.decks;
      })
      .flat();

    const userDeck = decks.find((item: { _id: { toString: () => string } }) => {
      return item._id.toString() === deckId;
    });

    if (!userDeck) {
      return response.status(404).send({ success: false });
    }

    Object.assign(userDeck, { key, name, uri, service, active });

    await record.save();

    response.send({ success: true, deck: userDeck });
  } catch (error: any) {
    console.error({ error });
    response.sendStatus(500);
  }
  span.finish();
  next();
}

export async function deleteDeck(request: Request, response: Response, next: Function) {
  const span = trace(request, 'user deleting a specific deck');
  try {
    const { deckId } = request.params;

    const {
      user: { id }
    } = request as SecuredRequest;

    const record = await Users.findById(id);

    if (!record) {
      return response.status(404).send({ success: false, error: 'No User' });
    }

    if (!record.decks?.length) {
      return response.status(404).send({ success: false, error: 'No Gates' });
    }

    const deletionCordinate = record.decks.reduce((coords: any, gate: { decks: any[] }, index: any) => {
      const unwantedDeck = gate.decks.findIndex((search: { _id: { toString: () => string } }) => {
        return search._id.toString() === deckId;
      });

      if (unwantedDeck !== -1) {
        return { gate: index, deck: unwantedDeck };
      }

      return coords;
    }, null);

    if (!deletionCordinate) {
      return response.status(404).send({ success: false, error: 'No Deck with that ID' });
    }

    record.decks[deletionCordinate.gate].decks.splice([deletionCordinate.deck], 1);

    await record.save();

    response.send({ success: true });
  } catch (error: any) {
    console.error({ error });
    response.sendStatus(500);
  }
  span.finish();
  next();
}

export async function getDeck(request: Request, response: Response, next: Function) {
  const span = trace(request, 'user requested to view a specific decks configuration');
  try {
    const { deckId } = request.params;

    const {
      user: { id }
    } = request as SecuredRequest;

    const record = await Users.findById(id);

    if (!record) {
      return response.status(404).send({ success: false });
    }

    if (!record.decks?.length) {
      return response.status(404).send({ success: false });
    }

    const decks = record.decks
      .map((gate: { decks: any }) => {
        return gate.decks;
      })
      .flat();

    console.log(decks);

    const userDeck = decks.find((deck: { _id: { toString: () => string } }) => {
      return deck._id.toString() === deckId;
    });

    if (!userDeck) {
      return response.status(404).send({ success: false });
    }

    response.send({ success: true, deck: userDeck });
  } catch (error: any) {
    console.error({ error });
    response.sendStatus(500);
  }
  span.finish();
  next();
}

deck.post('/deck', authenticateToken, createDeck);
deck.get('/deck/:deckId', authenticateToken, getDeck);
deck.put('/deck/:deckId', authenticateToken, updateDeck);
deck.delete('/deck/:deckId', authenticateToken, deleteDeck);
