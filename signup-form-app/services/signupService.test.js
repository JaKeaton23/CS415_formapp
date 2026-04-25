/**
 * Unit tests for the signupService module.
 *
 * The DynamoDB document client is mocked at the module boundary so these tests
 * exercise our business logic without needing a running DynamoDB instance.
 */

jest.mock('../dynamodb', () => {
  const mockSend = jest.fn();
  return {
    docClient: { send: mockSend },
    baseClient: { send: mockSend },
    TABLE_NAME: 'SignUps',
    CATEGORY_INDEX: 'CategoryIndex',
    __mockSend: mockSend,
  };
});

const { __mockSend: mockSend } = require('../dynamodb');
const {
  validateSignupInput,
  createSignup,
  getAllSignups,
  getSignupsByCategory,
} = require('./signupService');

beforeEach(() => {
  mockSend.mockReset();
});

describe('validateSignupInput', () => {
  test('passes for a fully valid payload', () => {
    expect(() =>
      validateSignupInput({
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '5551234567',
        category: 'Colors',
      }),
    ).not.toThrow();
  });

  test('throws 400 with field-level errors when invalid', () => {
    try {
      validateSignupInput({ name: 'A', email: 'no', phone: '1', category: 'Bogus' });
      throw new Error('expected validation to throw');
    } catch (err) {
      expect(err.statusCode).toBe(400);
      expect(err.fields).toEqual(
        expect.objectContaining({
          name: expect.any(String),
          email: expect.any(String),
          phone: expect.any(String),
          category: expect.any(String),
        }),
      );
    }
  });
});

describe('createSignup', () => {
  test('persists a normalised item and returns it', async () => {
    mockSend.mockResolvedValue({});
    const result = await createSignup({
      name: '  Jane  ',
      email: 'JANE@example.com',
      phone: '(555) 123-4567',
      category: 'Colors',
    });
    expect(result).toEqual(
      expect.objectContaining({
        name: 'Jane',
        email: 'jane@example.com',
        phone: '(555) 123-4567',
        category: 'Colors',
        id: expect.any(String),
        createdAt: expect.any(String),
      }),
    );
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  test('rejects invalid input before hitting DynamoDB', async () => {
    await expect(
      createSignup({ name: '', email: '', phone: '', category: '' }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe('getAllSignups', () => {
  test('returns items sorted newest first', async () => {
    mockSend.mockResolvedValue({
      Items: [
        { id: '1', createdAt: '2024-01-01T00:00:00Z' },
        { id: '2', createdAt: '2025-01-01T00:00:00Z' },
        { id: '3', createdAt: '2023-01-01T00:00:00Z' },
      ],
    });
    const result = await getAllSignups();
    expect(result.map((i) => i.id)).toEqual(['2', '1', '3']);
  });

  test('returns empty array when DynamoDB returns no items', async () => {
    mockSend.mockResolvedValue({});
    const result = await getAllSignups();
    expect(result).toEqual([]);
  });
});

describe('getSignupsByCategory', () => {
  test('rejects unknown categories with a 400', async () => {
    await expect(getSignupsByCategory('NotReal')).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('queries the GSI and returns items', async () => {
    mockSend.mockResolvedValue({
      Items: [{ id: '1', category: 'Colors' }],
    });
    const result = await getSignupsByCategory('Colors');
    expect(result).toEqual([{ id: '1', category: 'Colors' }]);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});
