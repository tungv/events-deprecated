import { T, always, over, path } from 'lodash/fp';

import makeTransform, {
  appendVersion,
  applyTransforms,
  mergeTransforms,
} from '../index';

describe('applyTransforms', () => {
  it('should filter', () => {
    const dispatch = jest.fn(path('value'));
    const collectionTransforms = [
      {
        when: path('shouldPass_1'),
        dispatch,
      },
      {
        when: path('shouldPass_2'),
        dispatch,
      },
    ];

    const transform = applyTransforms(collectionTransforms);
    transform({ shouldPass_1: true, shouldPass_2: false, value: 'test' });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('should map', () => {
    const dispatch = jest.fn(path('value'));
    const collectionTransforms = [
      {
        when: path('shouldPass_1'),
        dispatch,
      },
      {
        when: path('shouldPass_2'),
        dispatch,
      },
    ];

    const transform = applyTransforms(collectionTransforms);
    const cmdArray = transform({
      shouldPass_1: true,
      shouldPass_2: false,
      value: 'test',
    });

    expect(cmdArray).toEqual(['test']);
  });

  it('should flatten', () => {
    const collectionTransforms = [
      {
        when: path('shouldPass_1'),
        dispatch: over([path('value'), path('value')]),
      },
      {
        when: path('shouldPass_2'),
        dispatch: path('value'),
      },
    ];

    const transform = applyTransforms(collectionTransforms);
    const cmdArray = transform({
      shouldPass_1: true,
      shouldPass_2: true,
      value: 'test',
    });

    expect(cmdArray).toEqual(['test', 'test', 'test']);
  });
});

describe('merge transforms', () => {
  it('should merge', () => {
    const transforms = {
      collection1: [
        { when: jest.fn(T), dispatch: jest.fn(always('cmd1')) },
        { when: jest.fn(T), dispatch: jest.fn(always('cmd2')) },
      ],
      collection2: [
        { when: jest.fn(T), dispatch: jest.fn(always('cmd3')) },
        { when: jest.fn(T), dispatch: jest.fn(always('cmd4')) },
      ],
    };

    const transform = mergeTransforms(transforms);
    const event = {};

    const cmdMap = transform(event);
    expect(cmdMap.collection1).toEqual(['cmd1', 'cmd2']);
    expect(cmdMap.collection2).toEqual(['cmd3', 'cmd4']);
  });
});

describe('appendVersion', () => {
  it('should append version to insert command', () => {
    const cmd = {
      insert: [{ a: 1 }, { a: 2 }, { a: 3 }],
    };

    expect(appendVersion(1000, cmd)).toEqual({
      insert: [{ a: 1, __v: 1000 }, { a: 2, __v: 1000 }, { a: 3, __v: 1000 }],
    });
  });

  it('should append version to update command containing $set', () => {
    const cmd = {
      update: {
        where: { some: 'query' },
        changes: {
          $set: { someKey: 'someValue' },
        },
      },
    };

    expect(appendVersion(1000, cmd)).toEqual({
      update: {
        where: { some: 'query' },
        changes: {
          $set: {
            someKey: 'someValue',
            __v: 1000,
          },
        },
      },
    });
  });
});

describe('makeTransform', () => {
  it('should work e2e', () => {
    const event = {
      id: 1000,
      payload: {
        A: [1, 2],
        inc: 999,
        shouldPass: true,
      },
    };
    const transforms = {
      collection1: [
        {
          when: path('payload.shouldPass'),
          dispatch: event => ({
            insert: [{ a: event.payload.A[0] }, { a: event.payload.A[1] }],
          }),
        },
        {
          when: path('payload.shouldPass'),
          dispatch: event => ({
            update: {
              where: { a: 3 },
              changes: {
                $inc: { a: event.payload.inc },
              },
            },
          }),
        },
      ],
      collection2: [
        {
          when: path('payload.shouldPass'),
          dispatch: always({
            update: {
              where: { a: 3 },
              changes: {
                $set: { a: 5 },
              },
            },
          }),
        },
        {
          when: path('payload.shouldPass_2'),
          dispatch: always('never show up'),
        },
      ],
    };

    const transform = makeTransform(transforms);

    expect(transform(event)).toEqual({
      __v: 1000,
      collection1: [
        {
          insert: [{ a: 1 }, { a: 2 }],
        },
        {
          update: {
            where: { a: 3 },
            changes: { $inc: { a: 999 } },
          },
        },
      ],
      collection2: [
        {
          update: {
            where: { a: 3 },
            changes: {
              $set: { a: 5 },
            },
          },
        },
      ],
    });
  });
});
