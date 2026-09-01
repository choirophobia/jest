const { z } = require('zod');

const coordinatesSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

const addressSchema = z.object({
  address: z.string(),
  city: z.string(),
  state: z.string(),
  stateCode: z.string(),
  postalCode: z.string(),
  coordinates: coordinatesSchema,
  country: z.string(),
});

// Matches the shape returned by both GET /users/{id} and each item inside
// GET /users' `users[]` array.
const userSchema = z.object({
  id: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  maidenName: z.string(),
  age: z.number().positive(),
  gender: z.enum(['male', 'female']),
  email: z.email(),
  phone: z.string(),
  username: z.string(),
  password: z.string(),
  birthDate: z.string(),
  image: z.string(),
  bloodGroup: z.string(),
  height: z.number(),
  weight: z.number(),
  eyeColor: z.string(),
  hair: z.object({
    color: z.string(),
    type: z.string(),
  }),
  ip: z.string(),
  address: addressSchema,
  macAddress: z.string(),
  university: z.string(),
  bank: z.object({
    cardExpire: z.string(),
    cardNumber: z.string(),
    cardType: z.string(),
    currency: z.string(),
    iban: z.string(),
  }),
  company: z.object({
    department: z.string(),
    name: z.string(),
    title: z.string(),
    address: addressSchema,
  }),
  ein: z.string(),
  ssn: z.string(),
  userAgent: z.string(),
  crypto: z.object({
    coin: z.string(),
    wallet: z.string(),
    network: z.string(),
  }),
  role: z.string(),
});

module.exports = { userSchema };
