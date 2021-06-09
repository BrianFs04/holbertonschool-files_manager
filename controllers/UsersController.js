import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(email, password, res) {
    if (!email) {
      return res.status(400).send({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).send({ error: 'Missing password' });
    }

    const emailRegistered = await dbClient.db.collection('users').findOne({ email });
    if (emailRegistered) {
      return res.status(400).send({ error: 'Already exist' });
    }

    const encryptedPass = sha1(password);
    const user = await dbClient.db.collection('users').insertOne({ email, password: encryptedPass });

    const id = user.insertedId;

    return res.status(201).send({ id, email });
  }

  static async getMe(req, res) {
    const token = req.header('X-token') || null;
    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const redisTk = await redisClient.get(`auth_${token}`);
    if (!redisTk) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(redisTk) });
    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    return res.status(200).send({ id: user._id, email: user.email });
  }
}

export default UsersController;
