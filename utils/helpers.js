import { ObjectId } from 'mongodb';
import redisClient from './redis';

async function getParams(req) {
  const userInfo = { userId: null, key: null };

  const token = req.header('X-Token');
  if (!token) return userInfo;

  userInfo.key = `auth_${token}`;
  userInfo.userId = await redisClient.get(userInfo.key);

  return userInfo;
}

function userValid(id) {
  try {
    ObjectId(id);
  } catch (error) {
    return false;
  }
  return true;
}

export { getParams, userValid };
