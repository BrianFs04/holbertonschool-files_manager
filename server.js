import express from 'express';
import router from './routes/index';

// Create the server
const app = express();

// Enabling bodyParser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enabling routing
app.use('/', router);

// Port and boot
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log('Ready');
});
