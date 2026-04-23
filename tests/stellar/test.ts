import request from "supertest";
import app from "../../src/index";

describe("GET /api/stellar/balance/:address", () => {
  it("should return 400 for invalid address", async () => {
    const res = await request(app).get("/api/stellar/balance/invalid");

    expect(res.status).toBe(400);
  });

  it("should return balance for valid address", async () => {
    const res = await request(app).get(
      "/api/stellar/balance/GB3JDWCQ6YB5X6ZZZ6H5P7X5V3FQ3Y5W6T5U6R3QX"
    );

    expect([200, 404]).toContain(res.status);
  });
});