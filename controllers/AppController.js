import RedisClient from '../utils/redis';
import DbClient from '../utils/db';

class AppController {
  static getStatus(req, res) {
    const status = {
      redis: RedisClient.isAlive(),
      db: DbClient.isAlive(),
    };
    return res.status(200).send(status);
  }

  static async getStats(req, res) {
    const numberOfUsers = {
      users: await DbClient.nbUsers(),
      files: await DbClient.nbFiles(),
    };
    return res.status(200).send(numberOfUsers);
  }
}

export default AppController;
