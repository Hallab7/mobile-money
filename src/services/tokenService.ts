import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { pool } from "../config/database";
import { env } from "../config/env";
import { redisClient } from "../config/redis";

class TokenService {
  // Generate refresh token with JWT ID (JTI)
  generateRefeshToken(
    userId: string,
    deviceName: string,
    ipAddress: string,
    userAgent: string,
  ) {
    const jti = crypto.randomUUID();
    const expiresIn = parseInt(env.REFRESH_TOKEN_EXPIRES_IN);

    const payload = {
      userId,
      jti,
      type: "refresh",
    };

    const token = jwt.sign(JSON.stringify(payload), env.REFRESH_TOKEN_SECRET, {
      expiresIn,
      issuer: env.REFRESH_TOKEN_ISSUER,
      audience: env.REFRESH_TOKEN_AUDIENCE,
      algorithm: "ES256",
    });

    return {
      token,
      jti,
      expiresIn,
    };
  }

  // Store refresh token in db
  async storeRefreshToken(
    userId: string,
    token: string,
    jti: string,
    deviceName: string,
    ipAddress: string,
    userAgent: string,
  ) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresIn = parseInt(env.REFRESH_TOKEN_EXPIRES_IN);
    const expiresAt = new Date(Date.now() + expiresIn);

    try {
      const result = await pool.query(
        `INSERT INTO refresh_tokens 
            (user_id, token_jti, device_name, ip_address, user_agent, expires_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            RETURNING id, token_jti, device_name, created_at, expires_at`,
        [userId, jti, tokenHash, deviceName, ipAddress, userAgent, expiresAt],
      );

      // Store in Redis for quicker lookups (with TTL)
      await redisClient.setEx(
        this.label(jti),
        expiresIn,
        JSON.stringify({ userId, active: true }),
      );

      return result.rows;
    } catch (err) {
      console.error("Error storing refresh token:", err);
      throw err;
    }
  }

  private label(lbl: string) {
    return `refresh_token:${lbl}`;
  }
}

export const tokenService = new TokenService();
