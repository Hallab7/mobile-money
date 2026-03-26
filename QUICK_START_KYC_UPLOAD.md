# Quick Start: KYC Document Upload

This guide will help you get the KYC document upload feature running quickly.

## Prerequisites

- Node.js 20+ installed
- PostgreSQL database running
- AWS account (or LocalStack for local development)

## Step 1: Install Dependencies

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

## Step 2: Database Setup

Run the migration to create the `kyc_documents` table:

```bash
# Using psql
psql $DATABASE_URL -f database/migrations/add_kyc_documents_table.sql

# Or using your migration tool
npm run migrate:up
```

## Step 3: Configure Environment Variables

Add these variables to your `.env` file:

```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET=mobile-money-kyc-documents
```

### Option A: Use Real AWS S3

1. Follow the detailed setup guide: `docs/S3_SETUP_GUIDE.md`
2. Create an S3 bucket
3. Create an IAM user with appropriate permissions
4. Add credentials to `.env`

### Option B: Use LocalStack (for local development)

```bash
# Install LocalStack
pip install localstack

# Start LocalStack
localstack start

# Update .env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_S3_BUCKET=mobile-money-kyc-documents
AWS_ENDPOINT_URL=http://localhost:4566

# Create bucket in LocalStack
aws --endpoint-url=http://localhost:4566 s3 mb s3://mobile-money-kyc-documents
```

## Step 4: Start the Application

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## Step 5: Test the Upload

### Get a JWT Token

First, you need to authenticate and get a JWT token. Use your existing authentication endpoint:

```bash
# Example (adjust based on your auth implementation)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

Save the token from the response.

### Create a Test Document

```bash
# Create a test PDF
echo "Test KYC Document" > test-passport.pdf
```

### Upload the Document

```bash
curl -X POST http://localhost:3000/api/kyc/documents/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "document=@test-passport.pdf" \
  -F "applicant_id=test-applicant-123" \
  -F "document_type=passport" \
  -F "document_side=front"
```

Expected response:

```json
{
  "success": true,
  "data": {
    "document_id": "550e8400-e29b-41d4-a716-446655440000",
    "file_url": "https://mobile-money-kyc-documents.s3.us-east-1.amazonaws.com/kyc-documents/2024/03/user-id/test-passport-1711449000000-abc123def456.pdf",
    "applicant_id": "test-applicant-123",
    "uploaded_at": "2024-03-26T10:30:00.000Z"
  }
}
```

### Retrieve Uploaded Documents

```bash
curl -X GET http://localhost:3000/api/kyc/documents \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Step 6: Verify in S3

### Using AWS Console

1. Log in to AWS Console
2. Navigate to S3
3. Open your bucket
4. Navigate to `kyc-documents/{year}/{month}/{user-id}/`
5. You should see your uploaded file

### Using AWS CLI

```bash
aws s3 ls s3://mobile-money-kyc-documents/kyc-documents/ --recursive
```

### Using LocalStack

```bash
aws --endpoint-url=http://localhost:4566 s3 ls s3://mobile-money-kyc-documents/kyc-documents/ --recursive
```

## Testing Different Scenarios

### Test Valid File Types

```bash
# PDF
curl -X POST http://localhost:3000/api/kyc/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document=@test.pdf" \
  -F "applicant_id=test123"

# JPEG
curl -X POST http://localhost:3000/api/kyc/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document=@photo.jpg" \
  -F "applicant_id=test123"

# PNG
curl -X POST http://localhost:3000/api/kyc/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document=@scan.png" \
  -F "applicant_id=test123"
```

### Test Invalid File Type (should fail)

```bash
curl -X POST http://localhost:3000/api/kyc/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document=@test.txt" \
  -F "applicant_id=test123"
```

Expected error:

```json
{
  "error": "Invalid file type. Allowed types: application/pdf, image/jpeg, image/png"
}
```

### Test File Too Large (should fail)

```bash
# Create a 6MB file
dd if=/dev/zero of=large.pdf bs=1M count=6

curl -X POST http://localhost:3000/api/kyc/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document=@large.pdf" \
  -F "applicant_id=test123"
```

Expected error:

```json
{
  "error": "File size exceeds maximum limit of 5MB"
}
```

### Test Missing File (should fail)

```bash
curl -X POST http://localhost:3000/api/kyc/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "applicant_id=test123"
```

Expected error:

```json
{
  "error": "No file uploaded"
}
```

## Troubleshooting

### Error: "AWS credentials not configured"

**Solution**: Ensure `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set in `.env`

### Error: "S3 bucket not configured"

**Solution**: Set `AWS_S3_BUCKET` in `.env`

### Error: "Access Denied" from S3

**Solution**: 
1. Check IAM user has correct permissions
2. Verify bucket policy
3. Ensure credentials are correct

### Error: "User not authenticated"

**Solution**: 
1. Ensure you're sending a valid JWT token
2. Check token hasn't expired
3. Verify Authorization header format: `Bearer YOUR_TOKEN`

### Error: "Access denied" (403)

**Solution**: 
1. Ensure the applicant_id belongs to the authenticated user
2. Check database for kyc_applicants record

## Next Steps

1. **Read Full Documentation**: See `docs/KYC_DOCUMENT_UPLOAD.md` for complete API reference
2. **Set Up Production S3**: Follow `docs/S3_SETUP_GUIDE.md` for production setup
3. **Add Virus Scanning**: Implement virus scanning for production (see documentation)
4. **Write Tests**: Add integration tests for your specific use cases
5. **Monitor Usage**: Set up CloudWatch monitoring and alerts

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/kyc/documents/upload` | Upload a KYC document |
| GET | `/api/kyc/documents` | Get all user's documents |
| POST | `/api/kyc/applicants` | Create KYC applicant |
| GET | `/api/kyc/applicants/:id` | Get applicant details |
| GET | `/api/kyc/applicants/:id/status` | Get verification status |
| GET | `/api/kyc/status` | Get user's KYC status |

## Supported File Types

- PDF: `application/pdf`
- JPEG: `image/jpeg`, `image/jpg`
- PNG: `image/png`

## File Size Limit

- Maximum: 5MB per file

## Need Help?

- Check `docs/KYC_DOCUMENT_UPLOAD.md` for detailed documentation
- Check `docs/S3_SETUP_GUIDE.md` for AWS setup help
- Review `KYC_UPLOAD_IMPLEMENTATION.md` for implementation details
- Check application logs for error details
