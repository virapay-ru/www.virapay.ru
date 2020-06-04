// Facebook API

(function () {

pr('FB starting')
console.log('FB starting')

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
		isLoggedInWith.facebook = false
		if (isLoggedOut()) {
			switchActivity(activityLogin)
		}
	}

	executionTimeout = setTimeout(function () {
pr('FB does not respond...')
console.log('FB does not respond...')
		onLoggedOut()
		executionTimeout = null
	}, MAX_EXECUTION_TIME)

	window.fbAsyncInit = () => {

		function onStatusChange(response) {

			turnOffTimer()

			if (response.status === 'connected') {
				// response.authResponse.userID 
				FB.api('/me?fields=id,name,email,picture.type(large)', response => {
pr('FB.api(/me)', response)
console.log('FB.api(/me)', response);
					profileInit('facebook/' + response.id, response.name, response.picture.data.url, response.email, () => {
						FB.logout(response => {
pr('FB.logout', response)
console.log('FB.logout', response)
							onStatusChange(response)
						})
					})
				});
			} else {
pr('onLoggedOut: FB 1')
console.log('onLoggedOut: FB 1')
				onLoggedOut()
			}
		}

		FB.init({
			appId: '2682741668715941',
			cookie: true,
			xfbml: true,
			version: 'v7.0'
		});

	//	FB.AppEvents.logPageView();   

		let signInButton = activityLogin.querySelector('.signin-with-facebook')
		signInButton.addEventListener('click', () => {
			FB.login(response => {
pr('FB.login', response)
console.log('FB.login', response)
				onStatusChange(response)
			}, {
				scope: 'public_profile,email'
			});
		})

		if (location.protocol === 'http:') {
			onStatusChange({ })
		} else {
	//console.log('calling FB.getLoginStatus(...)')
			FB.getLoginStatus(response => {
pr('FB.getLoginStatus', response)
console.log('FB.getLoginStatus', response)
				onStatusChange(response)
			});
			signInButton.classList.remove('is-hidden')
		}

	};

})();
