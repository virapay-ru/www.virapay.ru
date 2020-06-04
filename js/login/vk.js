// VK API

(() => {

	pr('VK starting')

	let APP_ID = 7496488

	VK.init({
		apiId: APP_ID
	});

	function getUserInfo(id, email = undefined) {
		let storageKey = `/${location.hostname}/auth/vk/${id}`
		if (email !== undefined) {
			storagePut(storageKey, email)
		} else {
			email = storageGet(storageKey)
		}
		VK.Api.call('users.get', { user_ids: id, fields: 'has_photo,photo_200', v: '5.103' }, response => {
pr('VK.Api.call(users.get)', response)
console.log('VK.Api.call(users.get)', response)
			let profile = response.response[0]
//console.log('vk/' + profile.id, [ profile.first_name, profile.last_name ].join(' '), profile.photo_200, 'TODO email')
			profileInit('vk/' + profile.id, [ profile.first_name, profile.last_name ].join(' '), profile.photo_200, email, () => {
				VK.Auth.logout(response => {
					isLoggedInWith.vk = false
pr('isLoggedOut: VK 1')
console.log('isLoggedOut: VK 1')
					if (isLoggedOut()) {
						switchActivity(activityLogin)
					}
				})
			})
		});
	}

	VK.Auth.getLoginStatus(response => {
pr('VK.Auth.getLoginStatus', response)
console.log('VK.Auth.getLoginStatus', response)
		if (response.session) {
			getUserInfo(response.session.mid)
		} else {
			isLoggedInWith.vk = false
pr('isLoggedOut: VK 2')
console.log('isLoggedOut: VK 2')
			if (isLoggedOut()) {
				switchActivity(activityLogin)
			}
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


        let url = `${VK._domain.main}/${VK._path.login}?client_id=${APP_ID}&display=popup&redirect_uri=${location.origin}/vk.html&response_type=token&openapi=1&scope=email`;

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
					getUserInfo(parameters.user_id, parameters.email)
				}
			} catch (e) {
pr('VK exception in observePopup(): ', e)
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
