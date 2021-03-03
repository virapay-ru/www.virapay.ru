// backend

let backend = new JSONRPC2.RemoteProxyObject(
	// using JSON RPC over HTTP
	new JSONRPC2.Transports.HTTP(
		'https://virapay.herokuapp.com/rpc/json',

//		'https://connect.virapay.ru/rpc/json',
//		'http://127.0.0.1:8080/rpc/json',
//		'http://192.168.1.62:8080/rpc/json',
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
let activityLoading = activities.find(a => a.classList.contains('loading'))
let activityMessage = activities.find(a => a.classList.contains('message'))
let activityConfirm = activities.find(a => a.classList.contains('confirm'))
let activityLogin = activities.find(a => a.classList.contains('login'))
let activityProfile = activities.find(a => a.classList.contains('profile'))
let activityMain = activities.find(a => a.classList.contains('main'))
let activityNavBar = activities.find(a => a.classList.contains('navbar'))
let activityAccounts = activities.find(a => a.classList.contains('accounts'))
let activityAccountEdit = activities.find(a => a.classList.contains('account-edit'))
let activityAccountPayment = activities.find(a => a.classList.contains('account-payment'))
let activityAccountHistory = activities.find(a => a.classList.contains('account-history'))
let activityScanner = activities.find(a => a.classList.contains('scanner'))
let activitySBPPay = activities.find(a => a.classList.contains('sbp-pay'))
let activityFeedback = activities.find(a => a.classList.contains('feedback'))

function getActivityByName(name) {
	return activities.find(activity => activity.dataset.name == name)
}

function getActivityName(activity) {
	return activity ? activity.dataset.name : null
}

function getCurrentActivity() {
	return activities.find(activity => !activity.classList.contains('is-hidden'))
}

function hideActivity(activity) {
	if (!activity) {
		return
	}
	if (activity.xonbeforehide) {
		activity.xonbeforehide()
	}
	activity.classList.add('is-hidden')
	if (activity.xonafterhide) {
		activity.xonafterhide()
	}
}

function showActivity(activity, options = undefined, isRestoring = false) {
	if (!activity) {
		return
	}
	if (activity.xonbeforeshow) {
		activity.xonbeforeshow(options)
	}
	activity.style.visibility = 'hidden'
	activity.classList.remove('is-hidden')
	document.scrollingElement.scrollTop = 0
	setTimeout(function () {
		activity.style.visibility = 'visible'
		if (activity.xonaftershow) {
			activity.xonaftershow(options)
		}
	}, 1000/60)	
}

// activities switcher

function pushActivity(activity, options) {
	hideActivity(getCurrentActivity())
	showActivity(activity, options)
	let state = {
		activity: getActivityName(activity),
		scrollTop: 0,
		options
	}
//console.log('push', state)
	history.pushState(
		state,
		document.title,
		location.pathname
	)
}

function popActivity(activity, state) {
	hideActivity(getCurrentActivity())
	showActivity(activity, (state ? state.options : undefined), true)
}

window.switchActivity = pushActivity // TODO deprecated

;(function () {

	document.onscroll = function () {
		let state = history.state
		let activityName = getActivityName(getCurrentActivity())
		if (activityName && state && state.activity === activityName) {
			let options = state.options
			history.replaceState(
				{
					activity: activityName,
					scrollTop: document.scrollingElement.scrollTop,
					options
				},
				document.title,
				location.pathname
			)
		}
	}

	window.onpopstate = function (evt) {
		let state = evt.state
		if (state && state.activity) {
			let activity = getActivityByName(state.activity)
			popActivity(activity, state)
		}
	}

})();

/*
function switchActivity(activity, historyUntracked) {
//	activities.forEach(a => a.classList.add('is-hidden'))
//	activity.classList.remove('is-hidden')
//	document.scrollingElement.scrollTop = 0

	if (!historyUntracked) {
		if (activity.dataset.history === 'untracked') {
console.log('force untracked activity', getActivityName(activity))
			historyUntracked = true
		}
	}

	let prevActivity = getCurrentActivity()
	if (prevActivity) {
		if (prevActivity.xonbeforehide) {
			prevActivity.xonbeforehide()
		}
		prevActivity.classList.add('is-hidden')
		if (prevActivity.xonafterhide) {
			prevActivity.xonafterhide()
		}
	}

	if (activity.xonbeforeshow) {
		activity.xonbeforeshow()
	}
	activity.style.visibility = 'hidden'
	activity.classList.remove('is-hidden')
	document.scrollingElement.scrollTop = 0
	setTimeout(function () {
		activity.style.visibility = 'visible'
		if (activity.xonaftershow) {
			activity.xonaftershow()
		}
	}, 1000/60)

	document.onscroll = function () { }
	if (!historyUntracked) {
		let state = {
			activity: getActivityName(activity),
			scrollTop: 0
		}
console.log('push', state)
		history.pushState(
			state,
			document.title,
			location.pathname
		)
	}
	if (activity.dataset.history !== 'untracked') {
		document.onscroll = function () {
//console.log('scrollTop', document.scrollingElement.scrollTop)
			let activityName = getActivityName(activity)
			let state = history.state
			let options = (state && state.activity === activityName ? state.options : undefined)
			history.replaceState(
				{
					activity: activityName,
					scrollTop: document.scrollingElement.scrollTop,
					options
				},
				document.title,
				location.pathname
			)
		}
	}
}
*/

// message

const showMessage = (function () {

	if (!activityMessage) {
		return function showMessage() {
			throw new Error('activityMessage is not defined')
		}
	}

	let actionCallbacks = []

	activityMessage.xonbeforeshow = function (options) {
		if (options) {
			activityMessage.querySelector('.title').innerText = options.title
			activityMessage.querySelector('.text').innerText = options.text
			activityMessage.querySelectorAll('.action').forEach(node => {
				node.onclick = function () {
					actionCallbacks[options.callbackIndex]()
				}
			})

		}
	}

	activityMessage.querySelectorAll('.back').forEach(node => node.onclick = () => {
		history.back()
	})

	return function showMessage(title, text, actionCallback) {
		let callbackIndex = actionCallbacks.length
		actionCallbacks.push(actionCallback)
		pushActivity(activityMessage, { title, text, callbackIndex })
	}

})();

// confirm

const getConfirm = (function () {

	if (!activityConfirm) {
		return function showMessage() {
			throw new Error('activityConfirm is not defined')
		}
	}

	let actionCallbacks = []

	activityConfirm.xonbeforeshow = function (options) {
		if (options) {
			activityConfirm.querySelector('.title').innerText = options.title
			activityConfirm.querySelector('.text').innerText = options.text
			activityConfirm.querySelectorAll('.action-yes').forEach(node => {
				node.onclick = function () {
					actionCallbacks[options.callbackIndex].yes();
				}
			})
			activityConfirm.querySelectorAll('.action-no').forEach(node => {
				node.onclick = function () {
					actionCallbacks[options.callbackIndex].no();
				}
			})
		}
	}

	activityConfirm.querySelectorAll('.back').forEach(node => node.onclick = () => {
		history.back()
	})

	return function getConfirm(title, text, yesCallback, noCallback) {
		let callbackIndex = actionCallbacks.length
		actionCallbacks.push({ yes: yesCallback, no: noCallback })
		pushActivity(activityConfirm, { title, text, callbackIndex })
	}

})();

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
//console.log('leave focused element')
	setTimeout(function () {
		el.focus()
		setTimeout(function () {
			el.classList.add('hide')
		}, 50)
	}, 50)
}

// beep

let beep = (function () {

	let sound = document.createElement('video')
	sound.src = 'data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU='

	return function () {
		sound.pause()
		sound.currentTime = 0
		sound.play()
	}
	
})();

// touch screen

function isTouchScreen() {
	return ('ontouchstart' in document.documentElement)
}
