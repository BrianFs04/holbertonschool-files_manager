import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(req, res) {
    if (!req.headers.authorization) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const hash = Buffer.from(req.headers.authorization.split(' ')[1], 'base64').toString('utf-8');
    const email = hash.split(':')[0];
    const password = hash.split(':')[1];
    const info = {
      email,
      password,
    };

    if (!info.email || !info.password) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    info.password = sha1(info.password);
    const registeredUser = await dbClient.db.collection('users').findOne(info);
    if (!registeredUser) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const token = uuidv4();
    const key = `auth_${token}`;
    await redisClient.set(key, registeredUser._id.toString(), 86400);
    // 86400 is 24 hours in seconds

    return res.status(200).send({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.header('X-token') || null;
    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    await redisClient.del(`auth_${token}`);
    return res.status(204).send();
  }
}

export default AuthController;
