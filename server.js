import { schedule } from "node-cron";

async function serverHealthCheck() {
    console.log("Running scheduled job");
    
  }
  // Schedule a job to run every two minutes
  const job = schedule("*/1 * * * *", serverHealthCheck);