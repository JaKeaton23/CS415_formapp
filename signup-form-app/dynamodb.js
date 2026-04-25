/**
 * DynamoDB client factory.
 *
 * Exposes both the raw DynamoDBClient (needed for table-level operations like
 * CreateTable) and a DocumentClient (which transparently marshals JS values
 * to DynamoDB attribute values for item-level operations).
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

// Read configuration from the environment so the same code works in:
//   - Docker compose (DYNAMODB_ENDPOINT=http://dynamodb:8000)
//   - Local dev      (DYNAMODB_ENDPOINT=http://localhost:8000)
//   - Real AWS       (no DYNAMODB_ENDPOINT set; uses default endpoint)
const region = process.env.AWS_REGION || 'us-east-1';
const endpoint = process.env.DYNAMODB_ENDPOINT || undefined;

// DynamoDB Local accepts any credentials; we provide dummies so the SDK
// doesn't try to look up real ones from ~/.aws/credentials in containers.
const credentials = endpoint
  ? {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local',
    }
  : undefined;

const baseClient = new DynamoDBClient({
  region,
  endpoint,
  credentials,
});

// Document client unwraps DynamoDB types for us (e.g. { S: "x" } -> "x").
const docClient = DynamoDBDocumentClient.from(baseClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
});

// Single source of truth for the table name across the codebase.
const TABLE_NAME = process.env.SIGNUPS_TABLE || 'SignUps';
const CATEGORY_INDEX = 'CategoryIndex';

module.exports = {
  baseClient,
  docClient,
  TABLE_NAME,
  CATEGORY_INDEX,
};
