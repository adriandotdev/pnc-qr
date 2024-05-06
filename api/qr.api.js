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

	app.get(
		"/qr/api/v1/qr/:code/:evse_uid",
		[],
		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res) => {
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
				logger.error({
					GET_EVSE_DETAILS: {
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
					current_date,
					paid_hour,
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
						paid_hour,
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

	app.get(
		"/qr/api/v1/payments/guest/gcash/:token/:user_id/:payment_id",
		[tokenMiddleware.AuthenticateGCashPaymentToken()],

		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res) => {
			try {
				const { token, user_id, payment_id } = req.params;

				logger.info({
					QR_GCASH_PAYMENT_API_REQUEST: {
						data: {
							token,
							user_id,
							payment_id,
							payment_token_valid: req.payment_token_valid,
						},
					},
				});

				const result = await service.GCashPayment({
					token,
					payment_id,
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
				logger.error({
					QR_GCASH_PAYMENT_ERROR: {
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

	app.get(
		"/qr/api/v1/payments/guest/maya/:token/:transaction_id",
		[tokenMiddleware.AuthenticateMayaPaymentToken()],
		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res) => {
			try {
				const { token, transaction_id } = req.params;

				logger.info({
					QR_MAYA_PAYMENT_REQUEST: {
						data: {
							token,
							transaction_id,
							payment_token_valid: req.payment_token_valid,
						},
						message: "SUCCESS",
					},
				});

				const result = await service.MayaPayment({
					token,
					transaction_id,
					payment_token_valid: req.payment_token_valid,
				});

				logger.info({
					QR_MAYA_PAYMENT_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: [], message: "Success" });
			} catch (err) {
				logger.error({
					QR_MAYA_PAYMENT_ERROR: {
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
		"/qr/api/v1/qr/otp/verify/:guest_id",
		[],

		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res) => {
			try {
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
				logger.error({
					QR_VERIFY_OTP: {
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
		"/qr/api/v1/qr/otp/resend/:guest_id",
		[],

		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res) => {
			try {
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
				logger.error({
					QR_RESEND_OTP: {
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
