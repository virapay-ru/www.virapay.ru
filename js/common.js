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
let activityConfirm = activities.reduce((_, a) => a.classList.contains('confirm') ? a : _, null)
let activityLogin = activities.reduce((_, a) => a.classList.contains('login') ? a : _, null)
let activityProfile = activities.reduce((_, a) => a.classList.contains('profile') ? a : _, null)
let activityMain = activities.reduce((_, a) => a.classList.contains('main') ? a : _, null)
let activityNavBar = activities.reduce((_, a) => a.classList.contains('navbar') ? a : _, null)
let activityAccounts = activities.reduce((_, a) => a.classList.contains('accounts') ? a : _, null)
let activityAccountEdit = activities.reduce((_, a) => a.classList.contains('account-edit') ? a : _, null)
let activityAccountPayment = activities.reduce((_, a) => a.classList.contains('account-payment') ? a : _, null)
let activityAccountHistory = activities.reduce((_, a) => a.classList.contains('account-history') ? a : _, null)

// history

function historyPut(activityName, data = null) {
	history.pushState(
		{
			activity: activityName,
			scrollTop: document.scrollingElement.scrollTop,
			data
		},
		document.title,
		location.pathname
	)
}

// activities switcher

function switchActivity(activity) {
	activities.forEach(a => a.classList.add('is-hidden'))
	activity.classList.remove('is-hidden')
	document.scrollingElement.scrollTop = 0
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

// confirm

function getConfirm(title, text, yesCallback, noCallback) {
	activityConfirm.querySelector('.title').innerText = title
	activityConfirm.querySelector('.text').innerText = text
	activityConfirm.querySelectorAll('.action-yes').forEach(node => {
		node.onclick = function () {
			yesCallback();
		}
	})
	activityConfirm.querySelectorAll('.action-no').forEach(node => {
		node.onclick = function () {
			noCallback();
		}
	})
	switchActivity(activityConfirm)
}

// scrolling

let scrollByYTo = (function () {

//document.scrollingElement.scrollTop

	let t0 = Date.now()

	function frame(el, callback) {
		let time = JSON.parse(el.dataset.scrollingTime)
		let t = Math.abs(Date.now() - t0) / time
		let sourceY = JSON.parse(el.dataset.scrollingSourceY)
		let targetY = JSON.parse(el.dataset.scrollingTargetY)
		if (t >= 1) {
			el.scrollTop = targetY
			el.dataset.scrollingProgress = JSON.stringify(false)
			if (callback) {
				callback()
			}
		} else {
			el.scrollTop = sourceY + (targetY - sourceY) * t
			requestAnimationFrame(function () { frame(el, callback) })
		}
	}

	return function (el, y, time = 300, callback) {

		t0 = Date.now()

		el.dataset.scrollingTime = JSON.stringify(time)
		el.dataset.scrollingSourceY = JSON.stringify(el.scrollTop)
		el.dataset.scrollingTargetY = JSON.stringify(y)
		if (el.dataset.scrollingProgress === undefined) {
			el.dataset.scrollingProgress = JSON.stringify(false)
		}
		let flag = JSON.parse(el.dataset.scrollingProgress)
		if (!flag) {
			el.dataset.scrollingProgress = JSON.stringify(true)
			frame(el, callback)
		}

	}

})();

// focus

function leaveFocusedElement() {
	let el = document.querySelector('#focus-trigger')
	el.classList.remove('hide')
console.log('leave focused element')
	setTimeout(function () {
		el.focus()
		setTimeout(function () {
			el.classList.add('hide')
		}, 50)
	}, 50)
}
