import RedisClient from '../utils/redis';
import DBClient from '../utils/db';

class AppController {
  static getStatus(req, res) {
    const status = {
      redis: RedisClient.isAlive(),
      db: DBClient.isAlive(),
    };
    return res.status(200).send(status);
  }

  static async getStats(req, res) {
    const numberOfUsers = {
      users: await DBClient.nbUsers(),
      files: await DBClient.nbFiles(),
    };
    return res.status(200).send(numberOfUsers);
  }
}

export default AppController;
