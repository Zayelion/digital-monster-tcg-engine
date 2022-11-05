import jwt, { VerifyOptions, JwtPayload, VerifyErrors } from 'jsonwebtoken';
import { trace } from '../services/trace';
import { Request, Response } from 'express';

const { SERVER_KEY, SECRECT } = process.env;
const secrect = String(SECRECT) as jwt.Secret;

export function getToken(request: Request) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return;
  }

  const token = authHeader.split(' ')[1];

  return token;
}

export interface UserJWTInformation extends JwtPayload {
  id: string;
};

export interface SecuredRequest extends Request {
  user: UserJWTInformation;
}

export function authenticateToken(request: Request | Request, response: Response, next: Function) {
  const token = getToken(request);

  if (!token) {
    return response.sendStatus(401);
  }

  jwt.verify(token, secrect, (error, user): void => {
    console.log({ error });

    if (error) {
      response.sendStatus(403);
    }
    const securedRequest = request as SecuredRequest;

    securedRequest.user = user as UserJWTInformation;
    next();
  });
}

export function authenticateAdminToken(request: Request, response: Response, next: Function) {
  const span = trace(request, 'someone attempted to authenticate as a server');
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return;
  }

  const token = authHeader.split(' ')[1];

  if (token !== SERVER_KEY) {
    return response.sendStatus(401);
  }

  span.finish();
  next();
}
