// storage

function storagePut(path, value) {
	if (!/^(\/[^\/]+)+$/.test(path)) {
		throw new SyntaxError(`Invalid path "${path}"`)
	}
	let keys = path.substr(1).split('/')
	let rootKey = keys.shift()
	let data = localStorage[rootKey]
	if (data === undefined) {
		data = '{ }'
	}
	data = JSON.parse(data)
	let rootData = data
//console.log('root0', rootKey, rootData)
	while (keys.length > 1) {
		let k = keys.shift()
//console.log('key0', data[k])
		if (typeof data[k] !== 'object' || data[k] === null) { // be careful - null is object
			data[k] = { }
		}
//console.log('key1', data[k])
		data = data[k]
	}
	data[keys.shift()] = value
	localStorage[rootKey] = JSON.stringify(rootData)
//console.log('root1', rootKey, rootData, JSON.stringify(rootData))
}

function storageGet(path) {
	if (!/^(\/[^\/]+)+$/.test(path)) {
		throw new SyntaxError(`Invalid path "${path}"`)
	}
	let keys = path.substr(1).split('/')
	let data = localStorage[keys.shift()]
	if (data === undefined) {
		return data
	}
	data = JSON.parse(data)
	while (keys.length > 0 && typeof data === 'object' && data !== null) { // be careful - null is object
		data = data[keys.shift()]
	}
	return keys.length > 0 ? undefined : data
}
