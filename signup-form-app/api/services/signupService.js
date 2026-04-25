/**
 * SignUp service.
 *
 * Encapsulates all DynamoDB access for sign-ups so the HTTP layer (server.js)
 * stays thin and the persistence layer can be swapped or mocked in tests.
 */
const {
  PutCommand,
  ScanCommand,
  QueryCommand,
} = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { docClient, TABLE_NAME, CATEGORY_INDEX } = require('../dynamodb');

const ALLOWED_CATEGORIES = ['Colors', 'Football Teams', 'Colleges'];

/**
 * Server-side validation that mirrors (and is more strict than) the client side.
 * Throws an Error with `.statusCode = 400` on failure.
 */
function validateSignupInput(input) {
  const errors = {};
  const { name, email, phone, category } = input || {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    errors.email = 'A valid email is required.';
  }
  if (!phone || phone.replace(/\D/g, '').length < 10) {
    errors.phone = 'A valid phone number is required.';
  }
  if (!category || !ALLOWED_CATEGORIES.includes(category)) {
    errors.category = 'Category must be one of: ' + ALLOWED_CATEGORIES.join(', ');
  }

  if (Object.keys(errors).length > 0) {
    const err = new Error('Validation failed');
    err.statusCode = 400;
    err.fields = errors;
    throw err;
  }
}

/**
 * Insert a new sign-up.
 * Returns the persisted record (with id and createdAt populated).
 */
async function createSignup(input) {
  validateSignupInput(input);

  const item = {
    id: uuidv4(),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    category: input.category,
    createdAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
      // Defensively prevent overwrites on accidental UUID collisions.
      ConditionExpression: 'attribute_not_exists(id)',
    }),
  );

  return item;
}

/**
 * Return all sign-ups, sorted newest first.
 *
 * For a demo we use Scan; in production with non-trivial volume you would
 * use a status/timestamp GSI to avoid scanning the entire table.
 */
async function getAllSignups() {
  const result = await docClient.send(
    new ScanCommand({ TableName: TABLE_NAME }),
  );
  const items = result.Items || [];
  return items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

/**
 * Query sign-ups in a single category using the CategoryIndex GSI.
 * Returns newest first because the GSI sort key is createdAt.
 */
async function getSignupsByCategory(category) {
  if (!category) {
    const err = new Error('category is required');
    err.statusCode = 400;
    throw err;
  }
  if (!ALLOWED_CATEGORIES.includes(category)) {
    const err = new Error('Unknown category: ' + category);
    err.statusCode = 400;
    throw err;
  }

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: CATEGORY_INDEX,
      KeyConditionExpression: '#c = :category',
      ExpressionAttributeNames: { '#c': 'category' },
      ExpressionAttributeValues: { ':category': category },
      ScanIndexForward: false, // newest first
    }),
  );
  return result.Items || [];
}

module.exports = {
  ALLOWED_CATEGORIES,
  validateSignupInput,
  createSignup,
  getAllSignups,
  getSignupsByCategory,
};
