import { Request, Response } from "express";
import { pool } from "../config/database";
import { redisClient } from "../config/redis";
import { RefreshTokenFamilyModel } from "../models/refreshTokenFamily";

const refreshTokenLabel = (lbl: string) => {
  return `refresh_token:${lbl}`;
};

const refreshTokenFamilyModel = new RefreshTokenFamilyModel();
export const tokenController = {
  // List all active refresh tokens for current user
  findAll: async (req: Request, res: Response) => {
    const userId = (req as any).user.id || (req as any).user_id;
    const { family_id } = req.params;

    try {
      const rows = await refreshTokenFamilyModel.findAllActive(
        userId,
        family_id,
      );

      res.json({
        success: true,
        data: { tokens: rows },
      });
    } catch (err: any) {
      console.error(err);

      res.status(500).json({ success: false, error: err.message });
    }
  },
  // Revoke specific token
  revoke: async (req: Request, res: Response) => {
    const { familyId } = req.params;
    const userId = (req as any).user.id || (req as any).user_id;

    try {
      const { data } = await refreshTokenFamilyModel.revokeFamily(
        familyId,
        userId,
      );

      // Clear from Redis
      await redisClient.del(refreshTokenLabel(data.familyId));

      res.json({
        success: true,
        message: "Token revoked successfully",
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  },
  // Revoke all active tokens
  revokeAll: async (req: Request, res: Response) => {
    const userId = (req as any).user.id || (req as any).user_id;
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Get all active tokens
      const tokenResult = await client.query(
        `SELECT token_jti FROM refresh_tokens
            WHERE user_id = $1 AND is_active = TRUE`,
        [userId],
      );

      // Clear all from Redis
      for (const row of tokenResult.rows) {
        await redisClient.del(refreshTokenLabel(row.token_jti));
      }

      await client.query("COMMIT");

      res.json({
        success: true,
        message: `Revoked ${tokenResult.rows.length} token(s)`,
        revokedCount: tokenResult.rows.length,
      });
    } catch (err: any) {
      await client.query("ROLLBACK");
      console.error("Error revoking all tokens:", err);
      res.status(500).json({ success: false, error: err.message });
    } finally {
      client.release();
    }
  },
  // Purged expired tokens
  purgeExpired: async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
      const { data } = await refreshTokenFamilyModel.purgeExpired();

      // Clear from Redis
      for (const row of data.expiredTokenResult.rows) {
        await redisClient.del(refreshTokenLabel(row.token_jti));
      }

      res.json({
        success: true,
        message: "Purge completed",
        purgedCount: data.purgedCount,
      });
    } catch (err: any) {
      console.error("Error purging tokens:", err);

      res.status(500).json({
        success: false,
        error: err.message,
      });
    } finally {
      client.release();
    }
  },
};
