import cors from "cors";
import config from "@/config";

const corsOptions = {
  origin: config.corsOrigin,
  methods: ["GET", "POST"],
  credentials: true,
};

export default cors(corsOptions);
