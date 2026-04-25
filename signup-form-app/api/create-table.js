/**
 * One-shot script to create the SignUps DynamoDB table with the
 * CategoryIndex GSI used to support filtering by category.
 *
 * Idempotent: if the table already exists we log and exit cleanly.
 *
 * Run with:
 *   node create-table.js
 */
const {
  CreateTableCommand,
  DescribeTableCommand,
  ResourceInUseException,
} = require('@aws-sdk/client-dynamodb');
const { baseClient, TABLE_NAME, CATEGORY_INDEX } = require('./dynamodb');

async function tableExists(name) {
  try {
    await baseClient.send(new DescribeTableCommand({ TableName: name }));
    return true;
  } catch (err) {
    if (err.name === 'ResourceNotFoundException') return false;
    throw err;
  }
}

async function createSignupsTable() {
  if (await tableExists(TABLE_NAME)) {
    console.log(`[create-table] Table "${TABLE_NAME}" already exists. Skipping.`);
    return;
  }

  const command = new CreateTableCommand({
    TableName: TABLE_NAME,
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'category', AttributeType: 'S' },
      { AttributeName: 'createdAt', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: CATEGORY_INDEX,
        KeySchema: [
          { AttributeName: 'category', KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  });

  try {
    await baseClient.send(command);
    console.log(
      `[create-table] Created table "${TABLE_NAME}" with GSI "${CATEGORY_INDEX}".`,
    );
  } catch (err) {
    if (err instanceof ResourceInUseException) {
      console.log(`[create-table] Table "${TABLE_NAME}" already exists. Skipping.`);
      return;
    }
    throw err;
  }
}

if (require.main === module) {
  createSignupsTable().catch((err) => {
    console.error('[create-table] Failed to create table:', err);
    process.exit(1);
  });
}

module.exports = { createSignupsTable };
