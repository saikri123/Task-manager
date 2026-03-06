import Task from '../models/taskModel'

//Create a New Task
export const createTask= async(req,res)=>{
    const { title, description, priority, dueDate, completed  } = req.body;

    try {
        const newTask = new Task({
            title,
            description,
            priority,
            dueDate,
            completed:completed==='Yes' || completed === true,
            owner:req.user.id
        });

        const saved=await newTask.save();
        res.status(201).json({success:true, message: 'Task created successfully', task: newTask });
    } catch (error) {
        res.status(500).json({ message: 'Error creating task', error });
    }
}

// Get all the tasks for logged in user
export const getTask= async (req,res)=>{
    try{
        const tasks = await Task.find({owner:req.user.id}).sort({createdAt:-1});
        res.status(200).json({success:true, tasks});
    }catch(error){
        res.status(500).json({success:false, message:'Error fetching tasks', error});
    }
}

//Get Single Tasks By Id
export const getTaskById=async(req,res)=>{
    try {
        const task=await Task.findOne({_id:req.params.id,owner:req.user.id});
        if(!task)
            return res.status(404).json({success:false,message:'Task not found'});
        res.status(200).json({success:true, task});
    }catch(error){
        res.status(500).json({success:false,message:'Error fetching task',error});
    }
}

//Update a task
export const updatetask= async (req,res)=>{
    try{
        const data ={...req.body}
        if(data.completed !== undefined){
            data.completed = data.completed === 'Yes' || data.completed === true;
        }
        const updated = await Task.findOneAndUpdate(
            {_id:req.params.id,owner:req.user.id},
             data,
            {new:true,runValidators:true});
        if(!updated)
            return res.status(404).json({success:false,message:'Task not found'});
        res.status(200).json({success:true,message:'Task updated successfully',task:updated});
    }catch(error){
        res.status(500).json({success:false,message:'Error updating task',error});
    }
}

//Delete task
export const deleteTask= async (req,res)=>{
    try{
        const deleted = await Task.findOneAndDelete({_id:req.params.id,owner:req.user.id});
        if(!deleted)
            return res.status(404).json({success:false,message:'Task not found'});
        res.status(200).json({success:true,message:'Task deleted successfully'});
    }catch(error){
        res.status(500).json({success:false,message:'Error deleting task',error});
    }
}