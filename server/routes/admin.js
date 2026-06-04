import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import userRoutes from './users.js';
import locationRoutes from './locations.js';

const router = Router();
router.use(authenticate); // RBAC: all routes require authentication

router.use('/users', userRoutes);
router.use('/locations', locationRoutes);

export default router;
