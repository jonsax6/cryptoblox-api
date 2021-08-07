// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// pull in Mongoose model for examples
const Transaction = require('../models/transaction')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// this is middleware that will remove blank fields from `req.body`, e.g.
// { example: { title: '', text: 'foo' } } -> { example: { text: 'foo' } }
const removeBlanks = require('../../lib/remove_blank_fields')
// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// INDEX
// GET /examples
router.get('/transactions', requireToken, (req, res, next) => {
	Transaction.find()
		.then((transactions) => {
			// `examples` will be an array of Mongoose documents
			// we want to convert each one to a POJO, so we use `.map` to
			// apply `.toObject` to each one
			return transactions.map((transaction) => transaction.toObject())
		})
		// respond with status 200 and JSON of the examples
		.then((transaction) => res.status(200).json({ transaction }))
		// if an error occurs, pass it to the handler
		.catch(next)
})

// SHOW
// GET /portfolios/5a7db6c74d55bc51bdf39793
router.get('/transactions/:id', requireToken, (req, res, next) => {
	// req.params.id will be set based on the `:id` in the route
	Transaction.findById(req.params.id)
		.then(handle404)
		// if `findById` is succesful, respond with 200 and "example" JSON
		.then((transaction) => res.status(200).json({ transaction: transaction.toObject() }))
		// if an error occurs, pass it to the handler
		.catch(next)
})

// CREATE
// POST /transactions
router.post('/transactions', requireToken, (req, res, next) => {
	// set owner of new example to be current user
	req.body.transaction.owner = req.user.id
	Transaction.create(req.body.transaction)
		// respond to successful `create` with status 201 and JSON of new "example"
		.then((transaction) => {
			res.status(201).json({ transaction: transaction.toObject() })
		})
		// if an error occurs, pass it off to our error handler
		// the error handler needs the error message and the `res` object so that it
		// can send an error message back to the client
		.catch(next)
})

// UPDATE
// PATCH /examples/5a7db6c74d55bc51bdf39793
router.patch('/transactions/:id', requireToken, removeBlanks, (req, res, next) => {
  // if the client attempts to change the `owner` property by including a new
  // owner, prevent that by deleting that key/value pair
  delete req.body.transaction.owner

  Transaction.findById(req.params.id)
    .then(handle404)
    .then(transaction => {
      // pass the `req` object and the Mongoose record to `requireOwnership`
      // it will throw an error if the current user isn't the owner
      requireOwnership(req, transaction)

      // pass the result of Mongoose's `.update` to the next `.then`
      return transaction.updateOne(req.body.transaction)
    })
    // if that succeeded, return 204 and no JSON
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// use later for subdoc refactor:
// CREATE
// POST /portfolios
// router.post('/transactions', requireToken, (req, res, next) => {
// 	const transactionData = req.body.transaction
// 	const portfolioId = transactionData.portfolioId
// 	req.body.portfolio.owner = req.user.id
// 	Portfolio.findById(portfolioId)
// 		.then(handle404)
// 		.then((portfolio) => {
// 			portfolio.transactions.push(transactionData)
// 			return portfolio.save()
// 		})
// 		.then((portfolio) => res.status(201).json({ portfolio }))
// 		.catch(next)
// })

// use later for subdoc refactor:
// UPDATE
// PATCH /portfolios/5a7db6c74d55bc51bdf39793
// router.patch('/transaction/:id', requireToken, removeBlanks, (req, res, next) => {
// 		delete req.body.portfolio.owner
// 		Portfolio.findById(req.params.id)
// 			.then(handle404)
// 			.then((portfolio) => {
// 				requireOwnership(req, portfolio)
// 				const transaction = portfolio.transactions.id(transactionId)
// 				return portfolio.updateOne(req.body.portfolio)
// 			})
// 			.then(() => res.sendStatus(204))
// 			.catch(next)
// })

// DESTROY
// DELETE /examples/5a7db6c74d55bc51bdf39793
router.delete('/transactions/:id', requireToken, (req, res, next) => {
	Transaction.findById(req.params.id)
		.then(handle404)
		.then((transaction) => {
			// throw an error if current user doesn't own `example`
			requireOwnership(req, transaction)
			// delete the example ONLY IF the above didn't throw
			transaction.deleteOne()
		})
		// send back 204 and no content if the deletion succeeded
		.then(() => res.sendStatus(204))
		// if an error occurs, pass it to the handler
		.catch(next)
})

module.exports = router