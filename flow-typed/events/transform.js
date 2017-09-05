/* @flow */
declare type Query<Document> = {
  __v?: number,
  [key: $Keys<Document>]: any,
};

declare type UpdateOperation<Document> = {
  $set?: Query<Document>,
  $inc?: { [key: $Keys<Document>]: number },
};

declare type InsertCommand<Document> = {|
  insert: Document[],
|};

declare type UpdateCommand<Document> = {|
  update: {
    where: Query<Document>,
    changes: UpdateOperation<Document>,
  },
|};

declare type Command<Document> =
  | InsertCommand<Document>
  | UpdateCommand<Document>;

declare type CmdWithVersion<Document> = {
  __v: number,
  cmd: Command<Document>,
};

declare type WithVersion<Document> = {
  __v: number,
} & Document;

declare type UpdateBehaivor<Document> = {
  upsert?: true,
  filter: {
    __v: any,
    [key: $Keys<Document>]: any,
  },
  update:
    | {
        $setOnInsert?: WithVersion<Document>,
      }
    | UpdateOperation<Document>,
};

declare type UpdateOneOp<Document> = {|
  updateOne: UpdateBehaivor<Document>,
|};
declare type UpdateManyOp<Document> = {|
  updateMany: UpdateBehaivor<Document>,
|};

declare type Operation<Document> =
  | UpdateOneOp<Document>
  | UpdateManyOp<Document>;

declare type UpdateRequest = {
  __v: number,
  [collectionName: string]: Command<*>[],
};

declare type Collection = {
  drop: (query: any) => Promise<void>,
  insertMany: (Array<any>) => Promise<void>,
  bulkWrite: (Array<Operation<*>>) => Promise<BulkWriteResult>,
};
declare type DB = {
  close: () => void,
  collection: string => Collection,
};

declare type BulkWriteResult = {
  ok: 1,
  nInserted: number,
  nUpserted: number,
  nMatched: number,
  nModified: number,
  nRemoved: number,
  upserted: [{ index: number, _id: string }],
};
