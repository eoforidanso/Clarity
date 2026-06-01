import { Router } from 'express';
import userRoutes from './users.js';
import locationRoutes from './locations.js';

const router = Router();

router.use('/users', userRoutes);
router.use('/locations', locationRoutes);

export default router;
