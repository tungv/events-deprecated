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
        version: '1.0.0',
        when: path('shouldPass_1'),
        dispatch,
      },
      {
        version: '1.0.0',
        when: path('shouldPass_2'),
        dispatch,
      },
    ];

    const transform = applyTransforms(collectionTransforms);
    transform({ shouldPass_1: true, shouldPass_2: false, value: 'test' });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('should return empty if filter throw', () => {
    const when = jest.fn(() => {
      throw new Error('failed');
    });

    const dispatch = jest.fn();

    const transforms = [
      {
        version: '1.0.0',
        when,
        dispatch,
      },
    ];
    const transform = applyTransforms(transforms);

    let cmdArray;
    expect(() => {
      cmdArray = transform({
        shouldPass_1: true,
        shouldPass_2: false,
        value: 'test',
      });
    }).not.toThrow();
    expect(dispatch).toHaveBeenCalledTimes(0);
    expect(cmdArray).toEqual([]);
  });

  it('should return empty if dispatch throw', () => {
    const dispatch = jest.fn(() => {
      throw new Error('failed');
    });

    const transforms = [
      {
        version: '1.0.0',
        when: T,
        dispatch,
      },
    ];
    const transform = applyTransforms(transforms);

    let cmdArray;
    expect(() => {
      cmdArray = transform({
        shouldPass_1: true,
        shouldPass_2: false,
        value: 'test',
      });
    }).not.toThrow();
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(cmdArray).toEqual([]);
  });

  it('should map', () => {
    const dispatch = jest.fn(path('value'));
    const collectionTransforms = [
      {
        version: '1.0.0',
        when: path('shouldPass_1'),
        dispatch,
      },
      {
        version: '1.0.0',
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

    expect(cmdArray).toEqual([{ __pv: '1.0.0', op: 'test' }]);
  });

  it('should flatten', () => {
    const collectionTransforms = [
      {
        version: '1.0.0',
        when: path('shouldPass_1'),
        dispatch: over([path('value'), path('value')]),
      },
      {
        version: '1.0.0',
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

    expect(cmdArray).toEqual([
      { __pv: '1.0.0', op: 'test' },
      { __pv: '1.0.0', op: 'test' },
      { __pv: '1.0.0', op: 'test' },
    ]);
  });
});

describe('merge transforms', () => {
  it('should merge', () => {
    const transforms = {
      collection1: [
        {
          version: '1.0.0',
          when: jest.fn(T),
          dispatch: jest.fn(always('cmd1')),
        },
        {
          version: '1.0.0',
          when: jest.fn(T),
          dispatch: jest.fn(always('cmd2')),
        },
      ],
      collection2: [
        {
          version: '1.0.0',
          when: jest.fn(T),
          dispatch: jest.fn(always('cmd3')),
        },
        {
          version: '1.0.0',
          when: jest.fn(T),
          dispatch: jest.fn(always('cmd4')),
        },
      ],
    };

    const transform = mergeTransforms(transforms);
    const event = {};

    const cmdMap = transform(event);
    expect(cmdMap.collection1).toEqual([
      { __pv: '1.0.0', op: 'cmd1' },
      { __pv: '1.0.0', op: 'cmd2' },
    ]);
    expect(cmdMap.collection2).toEqual([
      { __pv: '1.0.0', op: 'cmd3' },
      { __pv: '1.0.0', op: 'cmd4' },
    ]);
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
          version: '1.0.0',
          when: path('payload.shouldPass'),
          dispatch: event => ({
            insert: [{ a: event.payload.A[0] }, { a: event.payload.A[1] }],
          }),
        },
        {
          version: '1.0.0',
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
          version: '1.0.0',
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
          version: '1.0.0',
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
          __pv: '1.0.0',
          op: {
            insert: [{ a: 1 }, { a: 2 }],
          },
        },
        {
          __pv: '1.0.0',
          op: {
            update: {
              where: { a: 3 },
              changes: { $inc: { a: 999 } },
            },
          },
        },
      ],
      collection2: [
        {
          __pv: '1.0.0',
          op: {
            update: {
              where: { a: 3 },
              changes: {
                $set: { a: 5 },
              },
            },
          },
        },
      ],
    });
  });
});
