import { Schema, model } from 'mongoose';
import crypto from 'crypto';
import jwt, { Jwt } from 'jsonwebtoken';
import mongooseUniqueValidator from 'mongoose-unique-validator';
import { DeckSchema } from './decks';

const { SECRECT } = process.env;
const SESSION_LIMIT = 3600000; // 1hr
const sanitizerPlugin = require('mongoose-sanitizer');

export const UserSchema = new Schema(
  {
    username: {
      type: String,
      lowercase: true,
      required: [true, 'can\'t be blank'],
      match: [/^[a-zA-Z0-9]+$/, 'is invalid'],
      index: true
    },
    email: {
      type: String,
      lowercase: true,
      required: [true, 'can\'t be blank'],
      match: [/\S+@\S+\.\S+/, 'is invalid'],
      index: true
    },
    customer: String,
    hash: String,
    salt: String,
    reset: Boolean,
    recovery: String,
    decks: [DeckSchema],
    ownedCards: [String]
  },
  { timestamps: true }
);

UserSchema.plugin(mongooseUniqueValidator, { message: 'is already taken.' });

UserSchema.methods.setPassword = function (password:string) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

UserSchema.methods.validPassword = function (password:string) {
  console.log(password, this, this.salt);
  const hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
  return this.hash === hash;
};

UserSchema.methods.generateJWT = function () {
  const today = new Date();
  const exp = new Date(today);

  exp.setTime(today.getTime() + SESSION_LIMIT);

  return jwt.sign(
    {
      id: this._id,
      username: this.username,
      exp: parseInt(String(exp.getTime() / 1000))
    },
    String(SECRECT)
  );
};

UserSchema.methods.toAuthJSON = function () {
  return {
    username: this.username,
    email: this.email,
    token: this.generateJWT(),
    ownedCards: this.ownedCards,
    decks: this.decks
  };
};

UserSchema.plugin(sanitizerPlugin);

export const Users = model('User', UserSchema);



