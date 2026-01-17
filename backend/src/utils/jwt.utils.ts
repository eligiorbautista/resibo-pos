import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/env';

export interface TokenPayload {
  id: string;
  employeeId: string;
  role: string;
}

export const generateTokens = (payload: TokenPayload) => {
  const accessToken = jwt.sign(
    payload,
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn } as SignOptions
  );

  const refreshToken = jwt.sign(
    payload,
    config.jwtRefreshSecret,
    { expiresIn: config.jwtRefreshExpiresIn } as SignOptions
  );

  return { accessToken, refreshToken };
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwtRefreshSecret) as TokenPayload;
};

