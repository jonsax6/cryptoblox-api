const mongoose = require('mongoose')
const Schema = mongoose.Schema

const transactionSchema = new Schema(
	{
		coin: {
			type: String,
			required: true
		},
		symbol: {
			type: String,
			required: true
		},
		price: {
			type: Number,
			required: true
		},
		quantity: {
			type: Number,
			required: true
		},
		orderType: {
			type: String,
			required: true
		},
		owner: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		}
	},
	{
		timestamps: true,
		toObject: { virtuals: true },
		toJSON: { virtuals: true }
	}
)

module.exports = mongoose.model('Transaction', transactionSchema)
