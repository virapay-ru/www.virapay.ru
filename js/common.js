let backend = new JSONRPC2.RemoteProxyObject(
	// using JSON RPC over HTTP
	new JSONRPC2.Transports.HTTP(
		'https://virapay.herokuapp.com/rpc/json',
		 {
			mode: 'cors'
		 }
	)
)

function parseParameters(str) {
	let parameters = str.substr(1).split('&').reduce((p, kv) => {
		let [ k, v ] = kv.split('=')
		v = decodeURIComponent(v)
		if (k !== '') {
			if (k in p) {
				if ((!p[k] instanceof Array)) {
					p[k] = [ p[k] ]
				}
				p[k].push(v)
			} else {
				p[k] = v
			}
		}
		return p
	}, { })
	return parameters
}
