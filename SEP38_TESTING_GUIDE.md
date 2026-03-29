# SEP-38 Quotes API - Comprehensive Testing Guide

## Overview

This guide provides step-by-step instructions to verify that your SEP-38 Quotes API implementation is complete and compliant with Stellar SEP-38 specifications.

## Assignment Completion Checklist

### ✅ Tasks Completed

- [x] **Build `/sep38/info` endpoint** - Lists supported asset pairs 
- [x] **Build `/sep38/prices` endpoint** - Returns live exchange rates
- [x] **Build `/sep38/quote` endpoint** - Creates time-limited price quotes
- [x] **Build `/sep38/quote/:id` endpoint** - Retrieves quote by ID
- [x] **Integrated with Currency Service** - Uses live exchange rate calculations
- [x] **TTL Compliance** - Strictly enforces quote time-to-live limits
- [x] **Stellar SEP-38 Tests** - All 18 tests passing

---

## Prerequisites

Before testing, ensure:

```bash
# 1. Dependencies installed
npm install

# 2. Environment configured
cp .env.example .env

# 3. Application built and running
npm run build
npm run dev
```

---

## Testing Methods

### Method 1: Automated Test Suite (Recommended)

Run all SEP-38 tests with coverage:

```bash
# Run tests
npm test -- tests/stellar/sep38.test.ts --forceExit

# Output should show:
# ✓ Test Suites: 1 passed
# ✓ Tests: 18 passed
```

**Expected Output Example:**
```
PASS tests/stellar/sep38.test.ts
  SEP-38 Exchange Endpoints
    GET /sep38/info
      ✓ should return supported asset pairs
    GET /sep38/prices
      ✓ should return 400 for missing parameters
      ✓ should return 400 for unsupported asset pair
      ✓ should return price for supported asset pair
      ✓ should return price for reverse asset pair
    POST /sep38/quote
      ✓ should return 400 for missing required parameters
      ✓ should return 400 for unsupported asset pair
      ✓ should return 400 for invalid sell_amount
      ✓ should return 400 for invalid buy_amount
      ✓ should create quote with sell_amount
      ✓ should create quote with buy_amount
      ✓ should create quote with custom TTL
      ✓ should use default TTL when not specified
      ✓ should limit TTL to maximum of 300 seconds
    GET /sep38/quote/:id
      ✓ should return quote by ID
      ✓ should return 404 for non-existent quote
      ✓ should return 410 for expired quote
    SEP-38 TTL Requirements
      ✓ should enforce TTL limits correctly

Test Suites: 1 passed, 1 total
Tests: 18 passed, 18 total
```

---

### Method 2: Manual API Testing with cURL

Start the development server:
```bash
npm run dev
```

#### 2.1 Test `/sep38/info` Endpoint

```bash
# List all supported asset pairs
curl -X GET http://localhost:3000/sep38/info

# Expected Response (HTTP 200):
{
  "assets": [
    {
      "sell_asset": "stellar:USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      "buy_asset": "iso4217:USD"
    },
    {
      "sell_asset": "iso4217:USD",
      "buy_asset": "stellar:USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
    },
    {
      "sell_asset": "stellar:XLM",
      "buy_asset": "iso4217:USD"
    },
    {
      "sell_asset": "iso4217:USD",
      "buy_asset": "stellar:XLM"
    },
    // ... more pairs
  ]
}
```

#### 2.2 Test `/sep38/prices` Endpoint

**Valid Request:**
```bash
# Get price for XLM to USD conversion
curl -X GET "http://localhost:3000/sep38/prices?sell_asset=stellar:XLM&buy_asset=iso4217:USD"

# Expected Response (HTTP 200):
{
  "sell_asset": "stellar:XLM",
  "buy_asset": "iso4217:USD",
  "price": "0.1234567"  // Dynamic price based on current rates
}
```

**Missing Parameters:**
```bash
curl -X GET "http://localhost:3000/sep38/prices"

# Expected Response (HTTP 400):
{
  "error": "Missing required parameters: sell_asset and buy_asset"
}
```

**Unsupported Asset Pair:**
```bash
curl -X GET "http://localhost:3000/sep38/prices?sell_asset=stellar:INVALID&buy_asset=iso4217:USD"

# Expected Response (HTTP 400):
{
  "error": "Unsupported asset pair"
}
```

#### 2.3 Test `/sep38/quote` Endpoint

**Create Quote with Sell Amount:**
```bash
curl -X POST http://localhost:3000/sep38/quote \
  -H "Content-Type: application/json" \
  -d '{
    "sell_asset": "stellar:XLM",
    "buy_asset": "iso4217:USD",
    "sell_amount": "100"
  }'

# Expected Response (HTTP 200):
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "expires_at": "2024-03-28T12:05:00.000Z",
  "sell_asset": "stellar:XLM",
  "buy_asset": "iso4217:USD",
  "sell_amount": "100",
  "buy_amount": "12.3456789",
  "price": "0.1234567",
  "created_at": "2024-03-28T12:04:00.000Z"
}
```

**Create Quote with Buy Amount:**
```bash
curl -X POST http://localhost:3000/sep38/quote \
  -H "Content-Type: application/json" \
  -d '{
    "sell_asset": "stellar:XLM",
    "buy_asset": "iso4217:USD",
    "buy_amount": "50"
  }'

# Expected Response (HTTP 200):
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "expires_at": "2024-03-28T12:05:00.000Z",
  "sell_asset": "stellar:XLM",
  "buy_asset": "iso4217:USD",
  "sell_amount": "405.405405",
  "buy_amount": "50",
  "price": "0.1234567",
  "created_at": "2024-03-28T12:04:00.000Z"
}
```

**Create Quote with Custom TTL (120 seconds):**
```bash
curl -X POST http://localhost:3000/sep38/quote \
  -H "Content-Type: application/json" \
  -d '{
    "sell_asset": "stellar:XLM",
    "buy_asset": "iso4217:USD",
    "sell_amount": "100",
    "ttl": 120
  }'

# Expected Response (HTTP 200):
# Quote will expire in 120 seconds instead of default 60 seconds
```

**Invalid Request - Missing Amount:**
```bash
curl -X POST http://localhost:3000/sep38/quote \
  -H "Content-Type: application/json" \
  -d '{
    "sell_asset": "stellar:XLM",
    "buy_asset": "iso4217:USD"
  }'

# Expected Response (HTTP 400):
{
  "error": "Missing required parameters: sell_asset, buy_asset, and either sell_amount or buy_amount"
}
```

**Invalid Request - Negative Amount:**
```bash
curl -X POST http://localhost:3000/sep38/quote \
  -H "Content-Type: application/json" \
  -d '{
    "sell_asset": "stellar:XLM",
    "buy_asset": "iso4217:USD",
    "sell_amount": "-100"
  }'

# Expected Response (HTTP 400):
{
  "error": "sell_amount must be a positive number"
}
```

#### 2.4 Test `/sep38/quote/:id` Endpoint

```bash
# First, create a quote and capture the ID
QUOTE_ID=$(curl -s -X POST http://localhost:3000/sep38/quote \
  -H "Content-Type: application/json" \
  -d '{
    "sell_asset": "stellar:XLM",
    "buy_asset": "iso4217:USD",
    "sell_amount": "100"
  }' | jq -r '.id')

# Retrieve the quote
curl -X GET "http://localhost:3000/sep38/quote/$QUOTE_ID"

# Expected Response (HTTP 200):
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "expires_at": "2024-03-28T12:05:00.000Z",
  "sell_asset": "stellar:XLM",
  "buy_asset": "iso4217:USD",
  "sell_amount": "100",
  "buy_amount": "12.3456789",
  "price": "0.1234567",
  "created_at": "2024-03-28T12:04:00.000Z"
}
```

**Non-existent Quote:**
```bash
curl -X GET "http://localhost:3000/sep38/quote/invalid-id"

# Expected Response (HTTP 404):
{
  "error": "Quote not found"
}
```

---

### Method 3: Integration Testing with Postman

1. **Import the API:**
   - Open Postman
   - Create a new collection named "SEP-38 Quotes API"
   - Set base URL: `http://localhost:3000`

2. **Add Requests:**

| Endpoint | Method | Parameters | Expected Status |
|----------|--------|-----------|-----------------|
| `/sep38/info` | GET | None | 200 |
| `/sep38/prices` | GET | `sell_asset`, `buy_asset` | 200/400 |
| `/sep38/quote` | POST | `sell_asset`, `buy_asset`, amount | 200/400 |
| `/sep38/quote/:id` | GET | Quote ID | 200/404/410 |

---

## Acceptance Criteria Verification

### ✅ Acceptance Criterion 1: Quotes Strictly Adhere to TTL

**Test Case:**
```bash
# Create a quote with 2-second TTL (for testing)
curl -X POST http://localhost:3000/sep38/quote \
  -H "Content-Type: application/json" \
  -d '{
    "sell_asset": "stellar:XLM",
    "buy_asset": "iso4217:USD",
    "sell_amount": "100",
    "ttl": 2
  }'

# Save the quote ID
QUOTE_ID="<returned_id>"

# Immediately retrieve (should return HTTP 200)
curl -i -X GET "http://localhost:3000/sep38/quote/$QUOTE_ID"
# Expected: HTTP 200

# Wait 3 seconds and try again
sleep 3
curl -i -X GET "http://localhost:3000/sep38/quote/$QUOTE_ID"
# Expected: HTTP 410 Gone (Quote expired)
```

**Verification Points:**
- ✅ Quotes returned with `expires_at` timestamp
- ✅ Default TTL: 60 seconds
- ✅ Maximum TTL enforced: 300 seconds (5 minutes)
- ✅ Expired quotes return HTTP 410 with "Quote has expired"
- ✅ Expired quotes automatically removed from cache

### ✅ Acceptance Criterion 2: Passes Stellar SEP-38 Tests

**Run the Test Suite:**
```bash
npm test -- tests/stellar/sep38.test.ts --forceExit
```

**All 18 Tests Must Pass:**
- ✅ GET /sep38/info returns asset pairs
- ✅ GET /sep38/prices validates parameters
- ✅ GET /sep38/prices returns correct prices
- ✅ POST /sep38/quote validates input
- ✅ POST /sep38/quote creates quotes
- ✅ POST /sep38/quote respects TTL limits
- ✅ GET /sep38/quote/:id retrieves quotes
- ✅ GET /sep38/quote/:id returns 404 for invalid quotes
- ✅ GET /sep38/quote/:id returns 410 for expired quotes
- ✅ TTL enforcement is strict and correct

---

## SEP-38 Compliance Checklist

### Endpoints Implemented
- [x] `GET /info` - Returns supported asset pairs
- [x] `GET /prices` - Returns exchange rate for given pair
- [x] `POST /quote` - Creates a new quote with TTL
- [x] `GET /quote/:id` - Retrieves quote by ID

### Response Format
- [x] Asset identifiers in proper format (`stellar:*`, `iso4217:*`)
- [x] Prices as strings with adequate precision (7 decimal places)
- [x] Quote IDs as UUIDs
- [x] Timestamps in ISO 8601 format with timezone

### Error Handling
- [x] HTTP 400 for missing/invalid parameters
- [x] HTTP 404 for non-existent quotes
- [x] HTTP 410 for expired quotes
- [x] HTTP 500 for internal errors
- [x] Descriptive error messages

### TTL Management
- [x] Default TTL: 60 seconds
- [x] Maximum TTL: 300 seconds (5 minutes)
- [x] Custom TTL supported via request body
- [x] TTL capping enforced
- [x] Expired quotes return 410 Gone

### Integration
- [x] Connected to currency service for live rates
- [x] Registered in main Express app as `/sep38` routes
- [x] All dependencies properly installed
- [x] No compilation errors

---

## Troubleshooting

### Issue: Tests Fail with "Router.use() requires a middleware function"

**Solution:**
Ensure the `adminRoutes` export is correctly added to [src/routes/admin.ts](src/routes/admin.ts):
```typescript
export { router as adminRoutes };
```

### Issue: "spdy" Module Not Found

**Solution:**
```bash
npm install spdy
```

### Issue: Tests Timeout

**Solution:**
Increase Jest timeout:
```bash
npm test -- tests/stellar/sep38.test.ts --testTimeout=30000 --forceExit
```

### Issue: Price Service Returns null

**Solution:**
Check that `currencyService` is properly imported and configured:
```typescript
import { currencyService, SupportedCurrency } from "../services/currency";
```

---

## Performance Metrics

After successful implementation, you should observe:

| Metric | Expected Value |
|--------|-----------------|
| Average Response Time (/prices) | < 50ms |
| Average Response Time (/quote) | < 100ms |
| Quote Cache Hit Rate | > 95% |
| Test Suite Duration | < 30s |
| Memory Usage | < 50MB |

---

## Next Steps

1. **Deploy to Staging:**
   ```bash
   npm run build
   npm start
   ```

2. **Load Testing:**
   - Test with Apache Bench: `ab -n 1000 http://localhost:3000/sep38/info`
   - Monitor response times and error rates

3. **Monitor in Production:**
   - Set up alerts for HTTP 5xx errors
   - Track quote creation volume
   - Monitor price calculation performance

---

## Support & Documentation

- **Stellar SEP-38 Spec:** https://github.com/stellar/stellar-protocol/blob/master/core/cap-0038.md
- **Project Repository:** https://github.com/sublime247/mobile-money
- **API Documentation:** See [docs/api.md](docs/api.md)

---

## Sign-Off

Once all tests pass and verification steps are complete, you have successfully:

✅ **Implemented SEP-38 Quotes API**
- [x] Built all required endpoints
- [x] Integrated with live exchange rate service
- [x] Enforced strict TTL compliance
- [x] Passed all Stellar SEP-38 tests
- [x] Documented testing procedures

**Assignment Status: COMPLETE**

---

*Last Updated: March 28, 2024*
*Difficulty Level: MEDIUM*
*Time to Complete: 2-3 hours*
