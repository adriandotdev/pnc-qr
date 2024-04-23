const path = require("path");
require("dotenv").config({
	debug:
		process.env.NODE_ENV === "dev" || process.env.NODE_ENV === "test"
			? true
			: true,
	path: path.resolve(__dirname, ".env"),
});

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const swaggerUI = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const app = express();
const YAML = require("yamljs");

// Loggers
const morgan = require("morgan");
const logger = require("./config/winston");

// Global Middlewares
const swaggerDocument = YAML.load("./swagger.yaml");

app.use("/login/docs", swaggerUI.serve, swaggerUI.setup(swaggerDocument));
app.use(helmet());
app.use(helmet.frameguard({ action: "deny" }));

app.use(
	cors({
		origin: [
			"http://localhost:3000",
			"http://localhost:5173",
			"https://v2-stg-parkncharge.sysnetph.com",
		],
		methods: ["OPTIONS", "GET", "POST", "PUT", "DELETE", "PATCH"],
	})
);
app.use(express.urlencoded({ extended: false })); // To parse the urlencoded : x-www-form-urlencoded
app.use(express.json()); // To parse the json()
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("combined", { stream: logger.stream }));
app.use(cookieParser());

/**
 * Import all of your routes below
 */
// Import here
require("./api/qr.api")(app);

app.use("*", (req, res, next) => {
	logger.error({
		API_NOT_FOUND: {
			api: req.baseUrl,
			status: 404,
		},
	});
	return res.status(404).json({ status: 404, data: [], message: "Not Found" });
});

module.exports = app;
