import pkg from 'mongodb';

const { MongoClient } = pkg;

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 27017;
const database = process.env.DB_DATABASE || 'files_manager';
const url = `mongodb://${host}:${port}/`;

class DBClient {
  constructor() {
    MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
      if (err) {
        this.db = false;
      } else {
        this.db = client.db(database);
      }
    });
  }

  isAlive() {
    if (this.db) return true;
    return false;
  }

  async nbUsers() {
    const documentsNo = await this.db.collection('users').countDocuments();
    return documentsNo;
  }

  async nbFiles() {
    const documentsNo = await this.db.collection('files').countDocuments();
    return documentsNo;
  }
}

const dbClient = new DBClient();
export default dbClient;
