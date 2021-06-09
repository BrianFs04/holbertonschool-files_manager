import { ObjectId } from 'mongodb';
import fs from 'fs';
import mime from 'mime-types';
import { v4 as uuidv4 } from 'uuid';
import Queue from 'bull';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    const fileQueue = new Queue('fileQueue');
    const token = req.header('X-token');
    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const { name, type, data } = req.body;
    if (!name) {
      return res.status(400).send({ error: 'Missing name' });
    }
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).send({ error: 'Missing type' });
    }
    if (!data && type !== 'folder') {
      return res.status(400).send({ error: 'Missing data' });
    }
    const parentId = req.body.parentId || '0';
    if (parentId !== '0') {
      const _id = ObjectId(parentId);
      const file = await dbClient.db.collection('files').findOne({ _id });
      if (!file) {
        return res.status(400).send({ error: 'Parent not found' });
      }
      if (file.type !== 'folder') {
        return res
          .status(400)
          .send({ error: 'Parent is not a folder' });
      }
    }

    const redisTk = await redisClient.get(`auth_${token}`);
    if (!redisTk) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const user = await dbClient.db
      .collection('users')
      .findOne({ _id: ObjectId(redisTk) });
    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const isPublic = req.body.isPublic || false;
    const fileData = {
      userId: user._id,
      name,
      type,
      isPublic,
      parentId,
    };

    if (type === 'folder') {
      await dbClient.db.collection('files').insertOne(fileData);
      const {
        _id, userId, name, type, isPublic, parentId,
      } = fileData;
      return res.status(201).send({
        id: _id,
        userId,
        name,
        type,
        isPublic,
        parentId,
      });
    }
    const dir = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(dir)) {
      fs.mkdir(dir, (err) => {
        if (err) {
          return res.status(400).send({ error: err.message });
        }
        return true;
      });
    }

    const file = `${dir}/${uuidv4()}`;
    if (!fs.existsSync(file)) {
      fs.writeFile(file, Buffer.from(data, 'base64'), (err) => {
        if (err) {
          return res.status(400).send({ error: err.message });
        }
        return true;
      });
    }

    fileData.localPath = file;
    await dbClient.db.collection('files').insertOne({
      userId: ObjectId(fileData.userId),
      name: fileData.name,
      type: fileData.type,
      isPublic: fileData.isPublic,
      parentId: fileData.parentId === '0' ? fileData.parentId : ObjectId(fileData.parentId),
      localPath: fileData.localPath,
    });

    fileQueue.add({
      userId: fileData.userId,
      fileId: fileData._id,
    });

    return res.status(201).send({
      id: fileData._id,
      userId: fileData.userId,
      name: fileData.name,
      type: fileData.type,
      isPublic: fileData.isPublic,
      parentId: fileData.parentId,
    });
  }

  static async getShow(req, res) {
    const { id } = req.params;
    const token = req.header('X-token');
    if (!token) {
      res.status(401).send({ error: 'Unauthorized' });
    }

    const redisTk = await redisClient.get(`auth_${token}`);
    if (!redisTk) {
      res.status(401).send({ error: 'Unauthorized' });
    }

    const user = await dbClient.db
      .collection('users')
      .findOne({ _id: ObjectId(redisTk) });
    if (!user) {
      res.status(401).send({ error: 'Unauthorized' });
    }

    const file = await dbClient.db
      .collection('files')
      .findOne({ _id: ObjectId(id) });

    if (!file) {
      return res.status(404).send({ error: 'Not found' });
    }

    if (user._id.toString() !== file.userId.toString()) {
      return res.status(404).send({ error: 'Not found' });
    }

    return res.status(201).send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  static async getIndex(req, res) {
    const token = req.header('X-token');
    if (!token) {
      res.status(401).send({ error: 'Unauthorized' });
    }

    const parentId = req.query.parentId || '0';
    const page = req.query.page || 0;

    let agg;
    if (parentId === '0') {
      agg = [
        {
          $skip: page * 20,
        },
        {
          $limit: 20,
        },
      ];
    } else {
      agg = [
        {
          $match: {
            parentId: ObjectId(parentId),
          },
        },
        {
          $skip: page * 20,
        },
        {
          $limit: 20,
        },
      ];
    }

    const files = await dbClient.db.collection('files').aggregate(agg);
    const allFiles = [];
    await files.forEach((i) => {
      const eachFile = {
        id: i._id,
        userId: i.userId,
        name: i.name,
        type: i.type,
        isPublic: i.isPublic,
        parentId: i.parentId,
      };
      allFiles.push(eachFile);
    });

    return res.status(201).send(allFiles);
  }

  static async putPublish(req, res) {
    const { id } = req.params;
    const token = req.header('X-token');
    if (!token) {
      res.status(401).send({ error: 'Unauthorized' });
    }

    const redisTk = await redisClient.get(`auth_${token}`);
    if (!redisTk) {
      res.status(401).send({ error: 'Unauthorized' });
    }

    const user = await dbClient.db
      .collection('users')
      .findOne({ _id: ObjectId(redisTk) });
    if (!user) {
      res.status(401).send({ error: 'Unauthorized' });
    }

    const file = await dbClient.db
      .collection('files')
      .findOne({ _id: ObjectId(id) });

    if (!file) {
      return res.status(404).send({ error: 'Not found' });
    }

    if (user._id.toString() !== file.userId.toString()) {
      return res.status(404).send({ error: 'Not found' });
    }
    await dbClient.db.collection('files')
      .updateOne({ _id: ObjectId(id) }, { $set: { isPublic: true } });

    const updatedFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(id) });

    return res.status(200).send({
      id: updatedFile._id,
      userId: updatedFile.userId,
      name: updatedFile.name,
      type: updatedFile.type,
      isPublic: updatedFile.isPublic,
      parentId: updatedFile.parentId,
    });
  }

  static async putUnpublish(req, res) {
    const { id } = req.params;
    const token = req.header('X-token');
    if (!token) {
      res.status(401).send({ error: 'Unauthorized' });
    }

    const redisTk = await redisClient.get(`auth_${token}`);
    if (!redisTk) {
      res.status(401).send({ error: 'Unauthorized' });
    }

    const user = await dbClient.db
      .collection('users')
      .findOne({ _id: ObjectId(redisTk) });
    if (!user) {
      res.status(401).send({ error: 'Unauthorized' });
    }

    const file = await dbClient.db
      .collection('files')
      .findOne({ _id: ObjectId(id) });
    if (!file) {
      return res.status(404).send({ error: 'Not found' });
    }

    if (user._id.toString() !== file.userId.toString()) {
      return res.status(404).send({ error: 'Not found' });
    }

    await dbClient.db.collection('files')
      .updateOne({ _id: ObjectId(id) }, { $set: { isPublic: false } });

    const updatedFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(id) });

    return res.status(200).send({
      id: updatedFile._id,
      userId: updatedFile.userId,
      name: updatedFile.name,
      type: updatedFile.type,
      isPublic: updatedFile.isPublic,
      parentId: updatedFile.parentId,
    });
  }

  static async getFile(req, res) {
    const { id } = req.params;
    const { size } = req.query || null;

    const token = req.header('X-token');

    const redisTk = await redisClient.get(`auth_${token}`);

    const user = await dbClient.db
      .collection('users')
      .findOne({ _id: ObjectId(redisTk) });

    const file = await dbClient.db.collection('files')
      .findOne({ _id: ObjectId(id) });
    if (id !== file._id.toString()) {
      return res.status(404).send({ error: 'Not found' });
    }

    if (file.isPublic === false) {
      if (!user || user._id.toString() !== file.userId.toString()) {
        return res.status(404).send({ error: 'Not found' });
      }
    }

    if (file.type === 'folder') {
      return res.status(400).send({ error: "A folder doesn't have content" });
    }

    if (!file.localPath) {
      return res.status(400).send({ error: 'error' });
    }

    const fileType = mime.lookup(file.name);
    const path = size ? `${file.localPath}_${size}` : file.localPath;

    const fileContent = fs.readFileSync(path, 'UTF-8');
    return res.status(201).type(fileType).send(fileContent);
  }
}

export default FilesController;
