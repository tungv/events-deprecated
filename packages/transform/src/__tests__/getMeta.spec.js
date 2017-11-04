import { getMeta } from '../index';

describe('getMeta', () => {
  it('should get all aggreate name and projection versions', () => {
    const rules = {
      users: [
        { version: '1.0.0', when: jest.fn(), dispatch: jest.fn() },
        { version: '1.2.0', when: jest.fn(), dispatch: jest.fn() },
        { version: '2.0.0', when: jest.fn(), dispatch: jest.fn() },
      ],
      tests: [
        { version: '1.0.0', when: jest.fn(), dispatch: jest.fn() },
        { version: '1.2.0', when: jest.fn(), dispatch: jest.fn() },
        { version: '2.0.0', when: jest.fn(), dispatch: jest.fn() },
      ],
    };

    expect(getMeta(rules)).toEqual(
      expect.arrayContaining([
        { version: '1.0.0', name: 'users' },
        { version: '1.2.0', name: 'users' },
        { version: '2.0.0', name: 'users' },
        { version: '1.0.0', name: 'tests' },
        { version: '1.2.0', name: 'tests' },
        { version: '2.0.0', name: 'tests' },
      ])
    );
  });
});
