const TokenMiddleware = require("../middlewares/TokenMiddleware");
const { validationResult, body, param } = require("express-validator");

const logger = require("../config/winston");

const QRService = require("../services/QRService");

const { HttpUnprocessableEntity } = require("../utils/HttpError");

/**
 * @param {import('express').Express} app
 */
module.exports = (app) => {
	const service = new QRService();
	const tokenMiddleware = new TokenMiddleware();
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
		[tokenMiddleware.BasicTokenVerifier()],
		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res, next) => {
			try {
				const { evse_uid } = req.params;

				logger.info({
					QR_RATES_LIST_REQUEST: {
						data: {
							evse_uid,
						},
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
				next(err);
			}
		}
	);

	app.get(
		"/qr/api/v1/qr/:code/:evse_uid",
		[tokenMiddleware.BasicTokenVerifier()],
		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res, next) => {
			try {
				const { code, evse_uid } = req.params;

				logger.info({
					GET_EVSE_DETAILS_REQUEST: {
						data: {
							code,
							evse_uid,
						},

						message: "SUCCESS",
					},
				});

				const result = await service.CheckEVSE(code, evse_uid);

				logger.info({
					GET_EVSE_DETAILS_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				next(err);
			}
		}
	);

	app.post(
		"/qr/api/v1/qr/payments/:user_type/:payment_type",
		[],
		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res) => {
			try {
				const {} = req.body;
			} catch (err) {
				logger.error({
					QR_PAYMENT_API: {
						err,
						message: err.message,
					},
				});

				console.log(err);
				return res.status(err.status || 500).json({
					status: err.status || 500,
					data: err.data || [],
					message: err.message || "Internal Server Error",
				});
			}
		}
	);

	app.post(
		"/qr/api/v1/qr/charge",
		[
			tokenMiddleware.BasicTokenVerifier(),
			body("mobile_number")
				.notEmpty()
				.withMessage("Missing required property: mobile_number")
				.custom((value) => String(value).match(/^(09|\+639|639)\d{9}$/))
				.withMessage(
					"Invalid mobile number. Valid formats are: 09, +639, and 639"
				),
			body("location_id")
				.notEmpty()
				.withMessage("Missing required property: location_id"),
			body("evse_uid")
				.notEmpty()
				.withMessage("Missing required property: evse_uid"),
			body("connector_id")
				.notEmpty()
				.withMessage("Missing required property: connector_id"),
			body("current_time")
				.notEmpty()
				.withMessage("Missing required property: current_time"),
			body("current_date")
				.notEmpty()
				.withMessage("Missing required property: current_date"),
			body("paid_charge_mins")
				.notEmpty()
				.withMessage("Missing required propety: paid_charge_mins"),
			body("amount")
				.notEmpty()
				.withMessage("Missing required property: amount"),
			body("homelink")
				.notEmpty()
				.withMessage("Missing required property: homelink"),
		],

		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res, next) => {
			try {
				validate(req, res);

				const {
					is_free,
					mobile_number,
					location_id,
					evse_uid,
					connector_id,
					current_time,
					current_date,
					paid_charge_mins,
					amount,
					payment_type,
					homelink,
				} = req.body;

				logger.info({
					QR_RESERVE_API_REQUEST: {
						data: {
							...req.body,
						},
						message: "SUCCESS",
					},
				});

				// logic here
				let result = null;

				if (is_free === 1) {
					logger.info({ FREE_CHARGING: true });
					result = await service.Reserve({
						...req.body,
					});
				} else {
					logger.info({ FREE_CHARGING: false });
					result = await service.ReserveWithPayment({
						mobile_number,
						location_id,
						evse_uid,
						connector_id,
						current_time,
						current_date,
						paid_charge_mins,
						amount,
						payment_type,
						homelink,
					});
				}

				logger.info({
					QR_RESERVE_API_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				next(err);
			}
		}
	);

	app.get(
		"/qr/api/v1/payments/guest/gcash/:token/:payment_id/:evse_uid/:connector_id",
		[tokenMiddleware.AuthenticateGCashPaymentToken()],

		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res, next) => {
			try {
				const { token, payment_id, evse_uid, connector_id } = req.params;

				logger.info({
					QR_GCASH_PAYMENT_API_REQUEST: {
						data: {
							token,
							payment_id,
							evse_uid,
							connector_id,
							payment_token_valid: req.payment_token_valid,
						},
					},
				});

				const result = await service.GCashPayment({
					token,
					payment_id,
					evse_uid,
					connector_id,
					payment_token_valid: req.payment_token_valid,
				});

				logger.info({
					QR_GCASH_PAYMENT_API_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				next(err);
			}
		}
	);

	app.get(
		"/qr/api/v1/payments/guest/maya/:token/:transaction_id/:evse_uid/:connector_id",
		[tokenMiddleware.AuthenticateMayaPaymentToken()],
		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res, next) => {
			try {
				const { token, evse_uid, connector_id, transaction_id } = req.params;

				logger.info({
					QR_MAYA_PAYMENT_REQUEST: {
						data: {
							token,
							transaction_id,
							evse_uid,
							connector_id,
							payment_token_valid: req.payment_token_valid,
						},
						message: "SUCCESS",
					},
				});

				const result = await service.MayaPayment({
					token,
					transaction_id,
					evse_uid,
					connector_id,
					payment_token_valid: req.payment_token_valid,
				});

				logger.info({
					QR_MAYA_PAYMENT_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				next(err);
			}
		}
	);

	app.post(
		"/qr/api/v1/qr/otp/verify/:guest_id",
		[
			tokenMiddleware.BasicTokenVerifier(),
			body("otp")
				.notEmpty()
				.withMessage("Missing required property: otp")
				.custom((value) => String(value).length === 4),
			body("timeslot_id")
				.notEmpty()
				.withMessage("Missing required property: timeslot_id"),
			body("next_timeslot_id")
				.optional()
				.custom((value) => typeof value === "number")
				.withMessage(
					"Invalid type. Property next_timeslot_id must be in type of number"
				),
		],

		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res, next) => {
			try {
				validate(req, res);

				const { guest_id } = req.params;

				const { otp, timeslot_id, next_timeslot_id } = req.body;

				logger.info({
					QR_VERIFY_REQUEST: {
						data: {
							...req.body,
						},
						message: "SUCCESS",
					},
				});

				const result = await service.VerifyOTP({
					user_driver_guest_id: guest_id,
					otp,
					timeslot_id,
					next_timeslot_id: next_timeslot_id || 0,
				});

				logger.info({
					QR_VERIFY_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				next(err);
			}
		}
	);

	app.post(
		"/qr/api/v1/qr/otp/resend/:guest_id",
		[
			tokenMiddleware.BasicTokenVerifier(),
			body("timeslot_id")
				.notEmpty()
				.withMessage("Missing required property: timeslot_id"),
			body("next_timeslot_id")
				.optional()
				.custom((value) => typeof value === "number")
				.withMessage(
					"Invalid type. Property next_timeslot_id must be in type of number"
				),
		],

		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res, next) => {
			try {
				validate(req, res);

				const { guest_id } = req.params;

				const { timeslot_id, next_timeslot_id } = req.body;

				logger.info({
					QR_RESEND_OTP_REQUEST: {
						data: {
							guest_id,
							timeslot_id,
							next_timeslot_id,
						},
						message: "SUCCESS",
					},
				});

				const result = await service.ResendOTP({
					user_driver_guest_id: guest_id,
					timeslot_id,
					next_timeslot_id: next_timeslot_id || 0,
				});

				logger.info({
					QR_RESEND_OTP_RESPONSE: {
						message: "SUCCESS",
					},
				});
				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				next(err);
			}
		}
	);

	app.get(
		"/qr/api/v1/qr/check-status/mobile_number/:mobile_number",
		[tokenMiddleware.BasicTokenVerifier()],
		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res, next) => {
			try {
				const { mobile_number } = req.params;

				logger.info({
					CHECK_MOBILE_NUMBER_STATUS_REQUEST: {
						data: {
							mobile_number,
						},
						message: "SUCCESS",
					},
				});

				const result = await service.CheckMobileNumberStatus(mobile_number);

				logger.info({
					CHECK_MOBILE_NUMBER_STATUS_RESPONSE: {
						data: {
							mobile_number,
						},
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "SUCCESS" });
			} catch (err) {
				req.error_name = "CHECK_MOBILE_NUMBER_STATUS_ERROR";
				next(err);
			}
		}
	);

	app.get(
		"/qr/api/v1/payments/guest/verify/:transaction_id",
		[
			tokenMiddleware.BasicTokenVerifier(),
			param("transaction_id")
				.notEmpty()
				.withMessage("Missing required property: transaction_id"),
		],
		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res, next) => {
			try {
				validate(req, res);

				const { transaction_id } = req.params;

				logger.info({
					PAYMENT_VERIFICATION_API_REQUEST: {
						data: {
							transaction_id,
						},
						message: "SUCESS",
					},
				});

				const result = await service.VerifyPayment(transaction_id);

				logger.info({
					PAYMENT_VERIFICATION_API_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "SUCCESS" });
			} catch (err) {
				next(err);
			}
		}
	);

	app.use((err, req, res, next) => {
		logger.error({
			API_REQUEST_ERROR: {
				message: err.message,
				stack: err.stack.replace(/\\/g, "/"), // Include stack trace for debugging
				request: {
					method: req.method,
					url: req.url,
					code: err.status || 500,
				},
				data: err.data || [],
			},
		});

		const status = err.status || 500;
		const message = err.message || "Internal Server Error";

		res.status(status).json({
			status,
			data: err.data || [],
			message,
		});
	});
};
