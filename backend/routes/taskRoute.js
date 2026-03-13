import express from 'express';
import authMiddleware from '../middleware/auth.js';

import {createTask,getTask,getTaskById,updateTask,deleteTask} from '../Controllers/taskController.js';

const taskRouter=express.Router();

taskRouter.route('/gp')
    .get(authMiddleware,getTask)
    .post(authMiddleware,createTask);

taskRouter.route('/gp/:id')
    .get(authMiddleware,getTaskById)
    .put(authMiddleware,updateTask)
    .delete(authMiddleware,deleteTask);

export default taskRouter;