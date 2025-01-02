const jwt = require("jsonwebtoken");

export const createSecretToken = (id:any) => {
  return jwt.sign({ id }, process.env.TOKEN_KEY, {
    expiresIn: 3 * 24 * 60 * 60,
  });
};