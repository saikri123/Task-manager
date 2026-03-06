import express from 'express'
import { registeruser, updateUserProfile ,loginuser,getCurrentUser,changePassword} from '../Controllers/userController.js'
import authMiddleware from '../middleware/auth.js';
const userRouter = express.Router();

//Public Links
userRouter.post('/register',registeruser);
userRouter.post('/login',loginuser);
 
//Private Links
userRouter.get('/me',authMiddleware,getCurrentUser);
userRouter.put('/profile',authMiddleware,updateUserProfile);
userRouter.put('/change-password',authMiddleware,changePassword);

export default userRouter;