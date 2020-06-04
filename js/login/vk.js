// VK API

(function () {

//pr('VK starting')
console.log('VK starting')

	let MAX_EXECUTION_TIME = 3000
	let executionTimeout = null

	function turnOffTimer() {
		if (executionTimeout !== null) {
			clearTimeout(executionTimeout)
			executionTimeout = null
		}
	}

	function onLoggedOut() {
		turnOffTimer()
		isLoggedInWith.vk = false
		if (isLoggedOut()) {
			switchActivity(activityLogin)
		}
	}

	executionTimeout = setTimeout(function () {
//pr('VK does not respond...')
console.log('VK does not respond...')
		onLoggedOut()
		executionTimeout = null
	}, MAX_EXECUTION_TIME)

	let APP_ID = 7498783//7496488

	VK.init({
		apiId: APP_ID
	});

	function getUserInfo(id, email = undefined, accessToken = undefined) {

		turnOffTimer()

		let storageKeyEmail = `/${location.hostname}/auth/vk/${id}/email`
		let storageKeyToken = `/${location.hostname}/auth/vk/${id}/token`

		if (email !== undefined) {
			storagePut(storageKeyEmail, email)
		} else {
			email = storageGet(storageKeyEmail)
		}

		if (accessToken !== undefined) {
			storagePut(storageKeyToken, accessToken)
		} else {
			accessToken = storageGet(storageKeyToken)
		}

		VK.Api.call('users.get', { user_ids: id, fields: 'has_photo,photo_200', v: '5.103' }, response => {
//pr('VK.Api.call(users.get)', response)
console.log('VK.Api.call(users.get)', response)
			let profile = response.response[0]
window.debugVKUsersGetResponse = response
//console.log('vk/' + profile.id, [ profile.first_name, profile.last_name ].join(' '), profile.photo_200, 'TODO email')
			profileInit('vk', profile.id, [ profile.first_name, profile.last_name ].join(' '), profile.photo_200, email, accessToken, () => {
				VK.Auth.logout(response => {
//pr('onLoggedOut: VK 1')
console.log('onLoggedOut: VK 1')
					onLoggedOut()
				})
			})
		});
	}

	VK.Auth.getLoginStatus(response => {
//pr('VK.Auth.getLoginStatus', response)
console.log('VK.Auth.getLoginStatus', response)
		if (response.session) {
window.debugVKGetLoginStatusResponse = response
			getUserInfo(response.session.mid)
		} else {
//pr('isLoggedOut: VK 2')
console.log('isLoggedOut: VK 2')
			onLoggedOut()
		}
	})

	let signInButton = activityLogin.querySelector('.signin-with-vk')
	signInButton.addEventListener('click', () => {

//		VK.Auth.login(response => {
//			console.log('VK.Auth.login', response)
//			if (response.session) {
//				getUserInfo(response.session.mid)
//			}
//		}, (1 << 22));


        let url = `${VK._domain.main}/${VK._path.login}?client_id=${APP_ID}&display=popup&redirect_uri=${location.origin}/vk.html&response_type=token&openapi=1&scope=email,offline`;

		let popup = VK.UI.popup({
          width: 665,
          height: 370,
          url: url
        });

		function observePopup() {
			try {
				if (popup.location.hostname === location.hostname) {
//					console.log('TODO PARSE', popup.location.hash)
					let parameters = popup.location.hash.substr(1).split('&').reduce((p, kv) => {
						let [ k, v ] = kv.split('=')
						p[k] = v
						return p
					}, { })
					popup.close()
console.log('VK parameters', parameters)
					getUserInfo(parameters.user_id, parameters.email, parameters.access_token)
				}
			} catch (e) {
//pr('VK exception in observePopup(): ', e)
console.log('VK exception in observePopup(): ', e)
			}
			if (popup.parent) {
				setTimeout(observePopup, 500)
			}
		}

		observePopup()

	})

	signInButton.classList.remove('is-hidden')

})();
