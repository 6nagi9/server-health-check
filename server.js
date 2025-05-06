import { schedule } from "node-cron";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "node:child_process";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

console.log(process.env);

const TARGET_PROTOCOL = process.env.TARGET_PROTOCOL || "http";
const TARGET_HOST = process.env.TARGET_HOST || "localhost";
const TARGET_PORT = process.env.TARGET_PORT || "80";
const TARGET_CONTEXT = process.env.TARGET_CONTEXT || "health";

// Email configuration
const EMAIL_RECIPIENTS = process.env.EMAIL_RECIPIENTS || "admin@example.com"; // comma-separated list
const EMAIL_FROM = process.env.EMAIL_FROM || "monitor@example.com";
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || "smtp.example.com",
  port: process.env.SMTP_PORT || 25,
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
};

const PATH =
  TARGET_PROTOCOL +
  "://" +
  TARGET_HOST +
  ":" +
  TARGET_PORT +
  "/" +
  TARGET_CONTEXT;

// Create email transporter
const transporter = nodemailer.createTransport(SMTP_CONFIG);

async function serverHealthCheck() {
  console.log("Running scheduled job");
  try {
    console.log("Hitting server.", PATH);
    const response = await axios.get(PATH, {
      timeout: 30000,
    });
    if (response.status == 200 || response.statusCode == 200)
      console.log("Server alive.", 200, "OK");
    else {
      console.log("Server unresponsive!", response);
      console.log("Calling shell exec");
      exec("service tomcat restart", execCallback);
      console.log("Called shell exec");
    }
  } catch (err) {
    console.log("Server dead!", err);
    console.log("Calling shell exec");
    exec("service tomcat restart", execCallback);
    console.log("Called shell exec");
  }
}

async function checkNasStorage() {
  console.log("Checking NAS storage");
  try {
    // Find the latest nasdata volume
    exec("ls -d /nasdata* | tail -1", async (error, latestNasPath, stderr) => {
      if (error) {
        console.error(`Error finding NAS volumes: ${error}`);
        return;
      }

      latestNasPath = latestNasPath.trim();
      if (!latestNasPath) {
        console.error("No NAS volumes found");
        return;
      }

      console.log(`Checking storage on ${latestNasPath}`);

      // Get disk usage information
      exec(`df -h ${latestNasPath}`, async (error, stdout, stderr) => {
        if (error) {
          console.error(`Error checking disk usage: ${error}`);
          return;
        }

        const diskInfo = stdout.trim();
        console.log(`Disk info:\n${diskInfo}`);

        // Parse the disk info to get available space
        const lines = diskInfo.split("\n");
        if (lines.length < 2) {
          console.error("Unexpected disk info format");
          return;
        }

        const values = lines[1].split(/\s+/);
        const available = values[3];
        const usePercentage = values[4];

        // Send email
        const mailOptions = {
          from: EMAIL_FROM,
          to: EMAIL_RECIPIENTS,
          subject: `Daily NAS Storage Report - ${latestNasPath}`,
          text: `NAS Storage Report for ${latestNasPath}:\n\n${diskInfo}\n\nAvailable space: ${available}\nUsage: ${usePercentage}`,
        };

        try {
          const info = await transporter.sendMail(mailOptions);
          console.log(`Email sent: ${info.messageId}`);
        } catch (emailError) {
          console.error(`Error sending email: ${emailError}`);
        }
      });
    });
  } catch (err) {
    console.error(`Error in checkNasStorage: ${err}`);
  }
}

const execCallback = (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.error(`stderr: ${stderr}`);
};

// Schedule a job to run every two minutes
const healthJob = schedule("*/5 * * * *", serverHealthCheck);

// Schedule NAS storage check to run daily at 8 AM
const storageJob = schedule("0 8 * * *", checkNasStorage);

console.log("Cron jobs scheduled:");
console.log("- Health check every 5 minutes");
console.log("- NAS storage check daily at 8 AM");
