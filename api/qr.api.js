const TokenMiddleware = require("../middlewares/TokenMiddleware");
const { validationResult, body } = require("express-validator");

const logger = require("../config/winston");

const QRService = require("../services/QRService");

// Import your SERVICE HERE
// Import MISC HERE

/**
 * @param {import('express').Express} app
 */
module.exports = (app) => {
	const service = new QRService();
	/**
	 * This function will be used by the express-validator for input validation,
	 * and to be attached to APIs middleware.
	 * @param {*} req
	 * @param {*} res
	 */
	function validate(req, res) {
		const ERRORS = validationResult(req);

		if (!ERRORS.isEmpty()) {
			throw new HttpUnprocessableEntity(
				"Unprocessable Entity",
				ERRORS.mapped()
			);
		}
	}

	app.get(
		"/qr/api/v1/qr/rates/:evse_uid",
		[],
		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res) => {
			try {
				const { evse_uid } = req.params;

				logger.info({
					QR_RATES_LIST_REQUEST: {
						message: "SUCCESS",
					},
				});

				/** Your logic here */
				const result = await service.GetQRRates(evse_uid);

				logger.info({
					QR_RATES_LIST_RESPONSE: {
						message: "SUCCESS",
					},
				});
				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				logger.error({
					QR_RATES_LIST_ERROR: {
						err,
						message: err.message,
					},
				});
				return res.status(err.status || 500).json({
					status: err.status || 500,
					data: err.data || [],
					message: err.message || "Internal Server Error",
				});
			}
		}
	);

	app.post(
		"/qr/api/v1/qr/reserve",
		[],

		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res) => {
			try {
				const {
					is_free,
					mobile_number,
					location_id,
					evse_uid,
					connector_id,
					current_time,
					paid_hour,
					qr_payment,
				} = req.body;

				logger.info({
					QR_RESERVE_API_REQUEST: {
						message: "SUCCESS",
					},
				});

				// logic here
				const result = await service.Reserve({
					...req.body,
				});

				logger.info({
					QR_RESERVE_API_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				logger.error({
					QR_RESERVE_API_ERROR: {
						err,
						message: err.message,
					},
				});
				return res.status(err.status || 500).json({
					status: err.status || 500,
					data: err.data || [],
					message: err.message || "Internal Server Error",
				});
			}
		}
	);
};
