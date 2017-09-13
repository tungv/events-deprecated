import { MongoClient } from 'mongodb';
import seed from '../seed';
const getClient = () => MongoClient.connect(process.env.MONGO_TEST);

describe('seeding', () => {
  it('should seed an object with project version', async () => {
    const seedData = {
      __pv: '1.0.0',
      aggregates: {
        users: [
          { uid: 1234, name: 'Test user 1', age: 20 },
          { uid: 1235, name: 'Test user 2', age: 20 },
          { uid: 1236, name: 'Test user 3', age: 20 },
        ],
        posts: [
          { title: 'post 1', author: 1234 },
          { title: 'post 2', author: 1234 },
          { title: 'post 3', author: 1235 },
        ],
      },
    };

    const db = await getClient();

    const changes = await seed(db, seedData);
    expect(changes).toBe(6);

    const userWithVEqualZero = await db
      .collection('users_v1_0_0')
      .count({ __v: 0 });

    expect(userWithVEqualZero).toBe(3);
  });
});
