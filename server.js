import { schedule } from "node-cron";
import axios from "axios";

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
    if (response.statusCode == 200)
      console.log("Server alive.", response.statusCode, response.statusMessage);
  } catch (error) {
    console.log("Server dead!", error.message);
  }
}
// Schedule a job to run every two minutes
const job = schedule("*/1 * * * *", serverHealthCheck);
