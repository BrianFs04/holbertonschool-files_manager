import { ObjectId } from 'mongodb';
import Queue from 'bull';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import dbClient from './utils/db';

const fileQueue = new Queue('fileQueue');

const generateThumbnail = async (file, options) => {
  try {
    const thumbnail = await imageThumbnail(file, options);
    const newFile = `${file}_${options.width}`;

    await fs.writeFileSync(newFile, thumbnail);
  } catch (error) {
    console.log(error);
  }
};

fileQueue.process(async (job, done) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    throw Error('Missing fileId');
  }

  if (!userId) {
    throw Error('Missing userId');
  }

  const file = await dbClient.db.collection('files').findOne({
    _id: ObjectId(fileId),
    userId: ObjectId(userId),
  });

  if (!file) {
    throw Error('File not found');
  }

  generateThumbnail(file.localPath, { width: 500 });
  generateThumbnail(file.localPath, { width: 250 });
  generateThumbnail(file.localPath, { width: 100 });

  done();
});
