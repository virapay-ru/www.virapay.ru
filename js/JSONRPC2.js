//
// jsonrpc2-js v1
//

'use strict'

const JSONRPC2 = (() => {

	//
	// Errors
	//

	const Errors = (() => {

		const CODE_PARSE_ERROR = -32700
		const CODE_INVALID_REQUEST = -32600
		const CODE_METHOD_NOT_FOUND = -32601
		const CODE_INVALID_PARAMETERS = -32602
		const CODE_INTERNAL_ERROR = -32603
		const MIN_CODE_SERVER_ERROR = -32099
		const MAX_CODE_SERVER_ERROR = -32000

		function isValidCode(code) {

			if (MIN_CODE_SERVER_ERROR <= code && code <= MAX_CODE_SERVER_ERROR) {
				return true
			}

			switch (code) {
				case CODE_PARSE_ERROR:
				case CODE_INVALID_REQUEST:
				case CODE_METHOD_NOT_FOUND:
				case CODE_INVALID_PARAMETERS:
				case CODE_INTERNAL_ERROR:
					return true
			}

			return false
		}

		class GenericError extends Error {

			constructor(code, message, data = null) {

				if (!isValidCode(code)) {
					throw new Error(`Invalid error code ${code}.`)
				}

				super(message)

				Object.defineProperty(this, 'code', {
					enumerable: true,
					value: code
				})

				Object.defineProperty(this, 'message', {
					enumerable: true,
					value: message
				})

				Object.defineProperty(this, 'data', {
					enumerable: true,
					value: data
				})
			}
		}

		class ParseError extends GenericError {

			constructor(data = null) {
				super(CODE_PARSE_ERROR, 'Parse error', data)
			}
		}

		class InvalidRequestError extends GenericError {

			constructor(data = null) {
				super(CODE_INVALID_REQUEST, 'Invalid Request', data)
			}
		}

		class MethodNotFoundError extends GenericError {

			constructor(data = null) {
				super(CODE_METHOD_NOT_FOUND, 'Method not found', data)
			}
		}

		class InvalidParametersError extends GenericError {

			constructor(data = null) {
				super(CODE_INVALID_PARAMETERS, 'Invalid params', data)
			}
		}

		class InternalError extends GenericError {

			constructor(data = null) {
				super(CODE_INTERNAL_ERROR, 'Internal error', data)
			}
		}

		class ServerError extends GenericError {

			constructor(code, data = null) {
				if (!(MIN_CODE_SERVER_ERROR <= code && code <= MAX_CODE_SERVER_ERROR)) {
					throw new RangeError(`Code ${code} is out of range of defined codes for this type of error.`)
				}
				super(code, 'Server error', data)
			}
		}

		return {

			CODE_PARSE_ERROR,
			CODE_INVALID_REQUEST,
			CODE_METHOD_NOT_FOUND,
			CODE_INVALID_PARAMETERS,
			CODE_INTERNAL_ERROR,
			MIN_CODE_SERVER_ERROR,
			MAX_CODE_SERVER_ERROR,

			GenericError,
			ParseError,
			InvalidRequestError,
			MethodNotFoundError,
			InvalidParametersError,
			InternalError,
			ServerError
		}

	})()

	//
	// Protocol
	//

	const Protocol = (() => {

		const VERSION = '2.0'

		//
		// Request
		//

		const Request = (() => {

			let nextRequestID = 1

			return class Request {

				constructor(method, params = undefined, id = undefined) {

					Object.defineProperty(this, 'jsonrpc', {
						enumerable: true,
						value: VERSION
					})

					this.method = method
					this.params = params
					this.id = id
				}

				isCall() {

					return this.id !== undefined && this.id !== null;
				}

				isNotification() {

					return !this.isCall();
				}

				static getNextID() {

					return nextRequestID ++
				}

			}

		})()

		//
		// Response
		//

		class Response {

			constructor(result, id = undefined) {

				Object.defineProperty(this, 'jsonrpc', {
					enumerable: true,
					value: VERSION
				})

				if (result instanceof Errors.GenericError) {
					this.error = result
				} else {
					this.result = result
				}

				this.id = id
			}

			hasError() {

				return this.error !== undefined
			}

			getError() {

				if (this.hasError()) {
					return this.error
				}

				return null
			}
		}

		//
		// Batch
		//

		class Batch {

			constructor(requests = []) {

				if (!(requests instanceof Array)) {
					throw new TypeError('Unexpected type of requests.')
				}

				requests.forEach(item => {
					if (!(item instanceof Request)) {
						throw new TypeError('Unexpected type of request.')
					}
				})

				this.requests = requests
			}

			call(method, params = undefined) {

				this.requests.push(new Request(method, params, Request.getNextID()))
				return this
			}

			notify(method, params = undefined) {

				this.requests.push(new Request(method, params))
				return this
			}

			end() {

				let batch = this.requests
				this.requests = []
				return batch
			}
		}

		//
		// Client
		//

		class Client {

			call(method, params = undefined) {
				return new Request(method, params, Request.getNextID())
			}

			notify(method, params = undefined) {
				return new Request(method, params)
			}

			batch() {
				return new Batch()
			}
		}

		//
		// Server
		//

		const Server = (() => {

			function processRequest(request) {

				let id = (request.id !== undefined ? request.id : null);
				let method = request.method
				let parameters = (request.params !== undefined ? request.params : []);

				try {

					let result = evaluate.call(this, method, parameters)
					return new Response(result, id)

				} catch (e) {

					let error = (e instanceof Errors.GenericError ? e : new Errors.InternalError(e))
					return new Response(error, id)
				}
			}

			function processBatch(requests) {

				return requests.map(request => processRequest.call(this, request))
			}

			function evaluate(method, parameters) {

				if (!(method in this.methods) || !(method in this.parameters)) {
					throw new Errors.MethodNotFoundError()
				}

				let args = []
				if (parameters instanceof Array) {
					args = parameters
				} else {
					this.parameters[method].forEach(name => args.push(parameters[name]))
				}

				return this.methods[method].apply(null, args)
			}

			return class Server {

				constructor() {

					this.methods = { }
					this.parameters = { }
				}

				on(method, parameters, fn) {

					this.methods[method] = fn
					this.parameters[method] = parameters
				}

				off(method) {

					delete this.methods[method]
					delete this.parameters[method]
				}

				reply(request) {

					let response

					if (request instanceof Array) {
						response = processBatch.call(this, request)
					} else {
						response = processRequest.call(this, request)
					}

					return response
				}

			}

		})()

		return {

			VERSION,

			Request,
			Response,
			Batch,
			Client,
			Server
		}

	})()

	//
	// Transports
	//

	const Transports = (() => {

		function validateResponse(response) {

			if (typeof response !== 'object') {
				throw new Error('Invalid response. Object expected.')
			}

			if (response.jsonrpc !== Protocol.VERSION) {
				throw new Error('Invalid response. Unsupported version of protocol.')
			}

			if (response.id !== undefined) {
				if (response.id !== null && typeof response.id !== 'number' && typeof response.id !== 'string') {
					throw new Error('Invalid response. Unexpected type of identifier.')
				}
			}

			if (response.error !== undefined && response.result !== undefined) {
				throw new Error('Invalid response. Controversial properties.')
			}

			if (response.error !== undefined) {

				if (typeof response.error !== 'object'
				|| typeof response.error.code !== 'number'
				|| typeof response.error.message !== 'string') {
					throw new Error('Invalid response. Invalid format of error desriptor.')
				}
				
				return new Protocol.Response(
					new Errors.GenericError(
						response.error.code,
						response.error.message,
						response.error.data
					),
					response.id
				)
			}

			if (response.result === undefined) {
				throw new Error('Invalid response. Result expected.')
			}

			return new Protocol.Response(response.result, response.id)
		}

		function isResponseIsRequired(request) {

			let required = false

			if (request instanceof Array) {
				required = request.some(request => request.isCall())
			} else if (request.isCall()) {
				required = true
			}

			return required
		}

		class AbstractTransport {

			encodeRequest(request) {

				return JSON.stringify(request)
			}

			decodeResponse(encodedResponse) {

				let response = JSON.parse(encodedResponse)

				if (response instanceof Array) {
					return response.map(item => validateResponse(item))
				}

				return validateResponse(response)
			}

			verifyMatching(request, response) {

				if (request instanceof Array) {

					if (response === null) {
						response = [ ]
					}

					if (!(response instanceof Array)) {
						throw new Error('Unexpected response. Array expected, but single response was received.')
					}

					request.forEach(request => {
						if (request.id !== null && request.id !== undefined) {
							let found = response.some(response => request.id === response.id)
							if (!found) {
								throw new Error('Array of responses does not contains all IDs of request.')
							}
						}
					})

					response.forEach(response => {
						let found = request.some(
							request =>
								request.id !== null && request.id !== undefined && request.id === response.id
						)
						if (!found) {
							throw new Error('Unexcepted ID of response.')
						}
					})

				} else {

					if (request.isCall()) {

						if (response instanceof Array) {
							throw new Error('Unexpected response. Single response expected, but array of responses was received.')
						}

						if (response === null) {
							throw new Error('Response expected. Request represents a call, not notification.')
						}

						if (request.id !== response.id) {
							throw new Error('ID of response does not match with ID of request.')
						}
					}
				}
			}

			async reply(request) {

				let stringRequest = this.encodeRequest(request)
				let stringResponse = await this.getResponse(stringRequest)
				let response = null

				if (isResponseIsRequired(request)) {
					response = this.decodeResponse(stringResponse)
				}

				this.verifyMatching(request, response)

				return response
			}

			getResponse(stringRequest) {

				return new Promise((resove, reject) => {
					throw 'Trying to call an abstract method.'
				})
			}
		}

		//
		// HTTP
		//

		class HTTP extends AbstractTransport {

			constructor(endpoint, options, fetchImpl) {

				super()

				this.setEndpoint(endpoint)
				this.setOptions(options)

				try {
					// try to use native implementation, if it's possible
					if (fetchImpl === undefined && typeof fetch === 'function') {
						fetchImpl = (endpoint, opts) => fetch(endpoint, opts)
					}
				} catch (e) {
				}

				if (typeof fetchImpl !== 'function') {
					throw new TypeError('Unexpected reference to implementation of Fetch API.')
				}

				this.fetchImpl = fetchImpl
			}

			setEndpoint(endpoint) {

				this.endpoint = endpoint
			}

			setOptions(options = { }) {

				if (options.headers === undefined) {
					options.headers = {
						'Content-Type': 'application/json'
					}
				}

				if (options.cache === undefined) {
					options.cache = 'no-cache'
				}

				options.method = 'POST'

				this.options = options
			}

			async getResponse(stringRequest) {

				let opts = Object.assign({ }, this.options, { body: stringRequest })
				let httpResponse = await this.fetchImpl(this.endpoint, opts)
				return await httpResponse.text()
			}

		}

		//
		// WebSockets
		//

		const WebSockets = (() => {

			let nextID = 1

			function reconnect() {

				setTimeout(
					() => {
						initSocket.call(this)
					},
					this.options.reconnectTimeout
				)
			}

			function initSocket() {

			   	this.socket = new this.WebSocketImpl(this.endpoint)

				this.socket.onmessage = (evt) => {

					let stringResponse = evt.data

					for (let id in this.queue) {

						try {

							let item = this.queue[id]
							if (!item.sent) {
								continue
							}

							delete this.queue[id]
							item.resolve(stringResponse)
							return

						} catch (e) {
						}
					}

					throw new Error('Unidentified response.')
				}

				this.socket.onopen = (evt) => {

					for (let id in this.queue) {
						let item = this.queue[id]
						if (!item.sent) {
							item.sent = true
							this.socket.send(item.stringRequest)
						}
					}
				}

				if (this.options.reconnect) {
					this.socket.onclose = () => reconnect.call(this)
				}
			}

			return class WebSockets extends AbstractTransport {

				constructor(endpoint, options = { }, WebSocketImpl) {

					super()

					try {
						// try to use native implementation, if it's possible
						if (WebSocketImpl === undefined && typeof WebSocket === 'function') {
							WebSocketImpl = WebSocket
						}
					} catch (e) {
					}

					if (typeof WebSocketImpl !== 'function') {
						throw new TypeError('Unexpected reference to implementation of WebSocket API.')
					}

					this.WebSocketImpl = WebSocketImpl
					this.endpoint = endpoint
					this.queue = { }

					this.setOptions(options)

					if (!this.options.coldStart) {
						initSocket.call(this)
					}
				}

				setOptions(options = { }) {

					if (options.coldStart === undefined) {
						options.coldStart = false
					}

					if (options.reconnectTimeout === undefined) {
						options.reconnectTimeout = 2000
					}

					if (options.reconnect === undefined) {
						options.reconnect = false
					}

					this.options = options
				}

				getResponse(stringRequest) {

					let id = nextID ++

					if (!this.socket && this.options.coldStart) {
						initSocket.call(this)
					}

					return new Promise(resolve => {

						let hasConnection = this.socket && this.socket.readyState === this.WebSocketImpl.OPEN

						this.queue[id] = {
							stringRequest,
							resolve,
							sent: hasConnection
						}

						if (hasConnection) {
							this.socket.send(stringRequest)
						}
					})

				}

			}

		})()

		return {

			AbstractTransport,
			HTTP,
			WebSockets
		}

	})()

	//
	// RemoteObject
	//

	const RemoteObject = (() => {

		class CallableBatch extends Protocol.Batch {

			constructor(remoteObject) {
				super()
				this.remoteObject = remoteObject
			}

			end() {
				let requests = super.end()
				return this.remoteObject.transport.reply(requests)
			}
		}

		return class RemoteObject extends Protocol.Client {

			constructor(transport) {

				super()

				this.setTransport(transport)
			}

			setTransport(transport) {

				if (!(transport instanceof Transports.AbstractTransport)) {
					throw new Error('Unexpected transport instace.')
				}

				this.transport = transport
			}

			call(method, params = undefined) {

				let request = super.call(method, params)
				return this.transport.reply(request)
			}

			notify(method, params = undefined) {

				let request = super.notify(method, params)
				return this.transport.reply(request)
			}

			batch() {

				return new CallableBatch(this)
			}
		}

	})()

	//
	// RemoteProxyObject
	//

	class RemoteProxyObject {

		constructor(transport) {

			let remoteObject = new RemoteObject(transport)

			return new Proxy({ }, {

				get(target, name) {

					return async function () {

						let params = Array.prototype.slice.call(arguments)
						let response = await remoteObject.call(name, params)

						if (response instanceof Array) {
							throw new Error('Unexpected response type. Single response expected.')
						}

						if (response.error) {
							throw new Errors.GenericError(
								response.error.code,
								response.error.message,
								response.error.data
							)
						}

						return response.result
					}
				}
			})
		}
	}

	//
	// ServerObject
	//

	const ServerObject = (() => {

		function validateRequest(request) {

			if (typeof request !== 'object') {
				throw new Errors.InvalidRequestError('Request is not an object.')
			}

			if (request.jsonrpc !== Protocol.VERSION) {
				throw new Errors.InvalidRequestError('Unsupported version of protocol.')
			}

			if (typeof request.method !== 'string') {
				throw new Errors.InvalidRequestError('Method is not defined.')
			}

			if (request.id !== undefined) {
				if (request.id !== null && typeof request.id !== 'number' && typeof request.id !== 'string') {
					throw new Errors.InvalidRequestError('Unexpected type of identifier.')
				}
			}

			if (request.params !== undefined && typeof request.params !== 'object') {
				throw new Errors.InvalidRequestError('Unexpected parameters.')
			}

			return new Protocol.Request(request.method, request.params, request.id)
		}

		return class ServerObject extends Protocol.Server {

			reply(encodedRequest) {

				let request

				try {
					request = JSON.parse(encodedRequest)
				} catch (e) {
					throw new Errors.ParseError(e)
				}

				let response = null

				if (request instanceof Array) {

					if (request.length <= 0) {

						response = new Protocol.Response(new Errors.InvalidRequestError('An empty array was sent as request.'))

					} else {

						response = []

						request.forEach(request_ => {

							let response_ = null

							try {

					   			request_ = validateRequest(request_)
								response_ = super.reply(request_)

							} catch (error) {

								if (error instanceof Errors.GenericError) {
									response_ = new Response(error)
								} else {
									throw error
								}
							}

							if (response_ !== null) {
								response.push(response_)
							}

						})

						if (response.length <= 0) {
							response = null
						}
					}

				} else {

					try {

			   			request = validateRequest(request)
						response = super.reply(request)

					} catch (error) {

						if (error instanceof Errors.GenericError) {
							response = new Protocol.Response(error)
						} else {
							throw error
						}
					}
				}

				if (response === null) {
					return ''
				}

				return JSON.stringify(response)
			}
		}

	})()

	//
	// Exports
	//

	return {

		Protocol,
		Transports,

		RemoteObject,
		RemoteProxyObject,
		ServerObject
	}

})()

//
// Node.js exports section
//

try {
	if (typeof module !== undefined) {
		module.exports = JSONRPC2
	}
} catch (e) {
}
