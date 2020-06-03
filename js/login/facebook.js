// Facebook API

window.fbAsyncInit = () => {

	function onStatusChange(response) {
		if (response.status === 'connected') {
			// response.authResponse.userID 
			FB.api('/me?fields=id,name,email,picture.type(large)', response => {
				console.log('FB.api(/me)', response);
				profileInit('facebook/' + response.id, response.name, response.picture.data.url, response.email, () => {
					FB.logout(response => {
						console.log('FB.logout', response)
						onStatusChange(response)
					})
				})
			});
		} else {
			isLoggedInWith.facebook = false
console.log('isLoggedOut: FB 1')
			if (isLoggedOut()) {
				switchActivity(activityLogin)
			}
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
			console.log('FB.login', response)
			onStatusChange(response)
		}, {
			scope: 'public_profile,email'
		});
	})

	if (location.protocol === 'http:') {
		onStatusChange({ })
	} else {
		FB.getLoginStatus(response => {
			console.log('FB.getLoginStatus', response)
			onStatusChange(response)
		});
		signInButton.classList.remove('is-hidden')
	}

};
