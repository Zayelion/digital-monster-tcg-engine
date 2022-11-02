/* eslint-disable no-underscore-dangle */
import { Users } from '../models/users';
import { trace } from '../services/trace';
import { Router, Request, Response } from 'express';
import { authenticateToken, authenticateAdminToken, SecuredRequest } from './authentication';
import { v4 as uuidv4 } from 'uuid';

const { STACK, SQUARE_ACCESS_TOKEN } = process.env;

export const user = Router();

export async function session(request: Request, response: Response, next: Function) {
  // const span = trace(request, 'user attempting to return using session');
  try {
    const {
      user: { id }
    } = request as SecuredRequest;
    const record = await Users.findById(id);

    const credentials = record.toAuthJSON();

    response.send(credentials);
  } catch (error: any) {
    console.error({ error });
    return response.status(500).send({ error: error.message });
  }
  //span.finish();
  next();
}

export async function login(request: Request, response: Response, next: Function) {
  const span = trace(request, 'user attempting to login');
  try {
    const {
      body: { username, password }
    } = request;
    console.debug('looking up user');
    const record = await Users.findOne({ username });
    console.log({ record });
    if (!record) {
      response.status(401);
      span.finish();
      next();
      return;
    }

    const valid = record.validPassword(password);

    if (!valid) {
      response.sendStatus(401);
      span.finish();
      next();
      return;
    }

    const credentials = record.toAuthJSON();

    response.send(credentials);
    span.finish();
    next();
  } catch (error: any) {
    console.error({ error });
    return response.status(500).send({ error: error.message });
  }
  span.finish();
  next();
}

export async function register(request: Request, response: Response, next: Function) {
  const span = trace(request, 'user attempting to register');

  try {
    const {
      body: { username, password, email, firstName, lastName }
    } = request;
    const emailExist = await Users.findOne({ email });

    if (emailExist) {
      throw new Error('Email for this user already taken');
    }

    const usernameExist = await Users.findOne({ username });

    if (usernameExist) {
      throw new Error('Username already taken');
    }

    const record = await Users.create({ username, email });

    record.setPassword(password);

    console.log(record);
    record.save();
    const credentials = record.toAuthJSON();

    response.send(credentials);

  } catch (error: any) {
    console.error({ error });
    return response.status(500).send({ error: error.message });
  }
  span.finish();
  next();
}

export async function recover(request: Request, response: Response, next: Function) {
  const span = trace(request, 'user attempting to recover password');
  try {
    const {
      body: { email }
    } = request;
    const recovery = uuidv4();
    const record = await Users.findOneAndUpdate(
      { email },
      { reset: true, recovery },
      {
        new: false
      }
    );

    if (!record) {
      response.sendStatus(404);
    }

    response.send({ success: true });
  } catch (error: any) {
    console.error({ error });
    response.sendStatus(500);
  }
  span.finish();
  next();
}

export async function reset(request: Request, response: Response, next: Function) {
  const span = trace(request, 'user reseting password after recovery');
  try {
    const {
      body: { email, password, recovery }
    } = request;
    const record = await Users.findOne({ email, reset: true, recovery });

    if (!record) {
      response.sendStatus(404);
      return;
    }

    record.setPassword(password);
    record.reset = false;
    record.recovery = '';
    record.save();

    response.send({ success: true });
  } catch (error: any) {
    console.error({ error });
    response.sendStatus(500);
  }
  span.finish();
  next();
}

export async function updatePassword(request: Request, response: Response, next: Function) {
  const span = trace(request, 'user setting password');
  try {
    const {
      user: { id },
      body: { password }
    } = request as SecuredRequest;
    const record = await Users.findById(id);

    if (!record) {
      response.end();
    }

    record.setPassword(password);
    record.save();

    response.send({ success: true });
  } catch (error: any) {
    console.error({ error });
    response.sendStatus(500);
  }
  span.finish();
  next();
}

user.get('/user', authenticateToken, session);
user.post('/user/login', login);
user.post('/user/register', register);
user.post('/user/password/recover', recover);
user.post('/user/password/reset', reset);
user.post('/user/password', authenticateToken, updatePassword);
