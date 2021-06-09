import express from 'express';
import AppController from '../controllers/AppController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';
import UsersController from '../controllers/UsersController';

const router = express.Router();

router.get('/status', AppController.getStatus);


router.get('/stats', AppController.getStats);

router.post('/users', (req, res) => {
  UsersController.postNew(req.body.email, req.body.password, res);
});

router.get('/connect', (req, res) => {
  AuthController.getConnect(req, res);
});

router.get('/disconnect', (req, res) => {
  AuthController.getDisconnect(req, res);
});

router.get('/users/me', (req, res) => {
  UsersController.getMe(req, res);
});

router.post('/files', (req, res) => {
  FilesController.postUpload(req, res);
});

router.get('/files/:id', (req, res) => {
  FilesController.getShow(req, res);
});

router.get('/files', (req, res) => {
  FilesController.getIndex(req, res);
});

router.put('/files/:id/publish', (req, res) => {
  FilesController.putPublish(req, res);
});

router.put('/files/:id/unpublish', (req, res) => {
  FilesController.putUnpublish(req, res);
});

router.get('/files/:id/data', (req, res) => {
  FilesController.getFile(req, res);
});

export default router;
