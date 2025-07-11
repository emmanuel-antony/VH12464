import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import urlRoutes from "./routes/urlRoutes.js";
import { loggingMiddleware } from "../LoggingMiddleware/logger.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;


app.use(express.json());
app.use(cors());
app.use(loggingMiddleware);


app.use("/", urlRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
