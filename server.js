import { schedule } from "node-cron";
import axios from "axios";
import dotenv from "dotenv";
import { exec } from 'node:child_process';

dotenv.config();

console.log(process.env)

const TARGET_PROTOCOL = process.env.TARGET_PROTOCOL||"http"
const TARGET_HOST = process.env.TARGET_HOST||"localhost"
const TARGET_PORT = process.env.TARGET_PORT||"80"
const TARGET_CONTEXT = process.env.TARGET_CONTEXT||"health"

const PATH = TARGET_PROTOCOL+"://"+TARGET_HOST+":"+TARGET_PORT+"/"+TARGET_CONTEXT;

async function serverHealthCheck() {
  console.log("Running scheduled job");
  try {
    console.log("Hitting server.", PATH);
    const response = await axios.get(PATH, {
      timeout: 30000,
    });
    if (response.status==200 || response.statusCode == 200)
      console.log("Server alive.", 200, 'OK');
    else{
      console.log("Server unresponsive!", response);
      console.log("Calling shell exec")
      exec('service tomcat restart',execCallback);
      console.log("Called shell exec")
    }
    
  } catch (err) {
    //console.log("Server dead!", err);
    console.log("Calling shell exec")
    exec('service tomcat restart',execCallback );
    console.log("Called shell exec")
  }
}

const execCallback=(error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.error(`stderr: ${stderr}`);
}

// Schedule a job to run every two minutes
const job = schedule("*/5 * * * *", serverHealthCheck);
