// backend

let backend = new JSONRPC2.RemoteProxyObject(
	// using JSON RPC over HTTP
	new JSONRPC2.Transports.HTTP(
		'https://virapay.herokuapp.com/rpc/json',
		 {
			mode: 'cors'
		 }
	)
)

// parameters

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

// activities

let activities = Array.from(document.querySelectorAll('.activity'))
let activityLoading = activities.reduce((_, a) => a.classList.contains('loading') ? a : _, null)
let activityMessage = activities.reduce((_, a) => a.classList.contains('message') ? a : _, null)
let activityLogin = activities.reduce((_, a) => a.classList.contains('login') ? a : _, null)
let activityProfile = activities.reduce((_, a) => a.classList.contains('profile') ? a : _, null)
let activityMain = activities.reduce((_, a) => a.classList.contains('main') ? a : _, null)
let activityNavBar = activities.reduce((_, a) => a.classList.contains('navbar') ? a : _, null)

// activities switcher

function switchActivity(activity) {
	activities.forEach(a => a.classList.add('is-hidden'))
	activity.classList.remove('is-hidden')
}

// message

function showMessage(title, text, actionCallback) {
	activityMessage.querySelector('.title').innerText = title
	activityMessage.querySelector('.text').innerText = text
	activityMessage.querySelectorAll('.action').forEach(node => {
		node.onclick = function () {
			actionCallback();
		}
	})
	switchActivity(activityMessage)
}
