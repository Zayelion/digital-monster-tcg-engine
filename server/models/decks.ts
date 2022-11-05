import { Schema, model } from 'mongoose';

const sanitizerPlugin = require('mongoose-sanitizer');

export const DeckSchema = new Schema(
  {
    main: [String],
    egg: [String],
    side: [String],
    hidden: Boolean
  },
  { timestamps: true }
);

DeckSchema.plugin(sanitizerPlugin);

export const Gateways = model('Deck', DeckSchema);
