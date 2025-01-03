import express, { Request, Response } from 'express';
import cors from 'cors';
import { validateToken } from './middleware/auth';
import { config } from './config/config';

const app = express();

app.use(cors());
app.use(express.json());


app.get('/api/v1/login', (req: any, res: any) => {

});

// Get user ID from token
app.get('/api/auth/validate', validateToken, (req: any, res: any) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    res.json({
      userId: req.user.id,
      wsUrl: config.wsServer
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create room endpoint with token validation
app.post('/api/rooms', validateToken, (req: any, res: any) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { roomName } = req.body;
    const userId = req.user.id;

    res.json({
      userId,
      wsUrl: config.wsServer,
      roomName
    });
  } catch (error) {
    console.error('Room creation error:', error);
    res.status(500).json({ error: 'Failed to process room creation' });
  }
});

// Join room endpoint with token validation
app.post('/api/rooms/:roomId/join', validateToken, (req: any, res: any) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { roomId } = req.params;
    const userId = req.user.id;

    res.json({
      userId,
      wsUrl: config.wsServer,
      roomId
    });
  } catch (error) {
    console.error('Room join error:', error);
    res.status(500).json({ error: 'Failed to process room join request' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Primary backend server running on port ${PORT}`);
});