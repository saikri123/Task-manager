import mangoose from 'mangoose'
import { trusted } from 'mongoose'

const taskSchema=new mangoose.Schema({
    title:{
        type:String,
        required:trusted
    },
    description:{
        type:String,
        default:''
    },
    priority:{
        type:String,
        enum:['low','medium','high'],
        default:'medium'
    },
    dueDate:{
        type:Date,
    
    },
    owner:{
        type:mangoose.Schema.Types.ObjectId ,
        ref:'User',
        required:true
    },
    completed:{
        type:Boolean,
        default:false
    },
    createdAt:{
        type:Date,
        default:Date.now
    }   

})

const Task= mongoose.model.Task || mongoose.model('Task',taskSchema)   

export default Task