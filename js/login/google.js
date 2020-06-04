// Google API

(function () {

//pr('G starting')
console.log('G starting')

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
		isLoggedInWith.google = false
		if (isLoggedOut()) {
			switchActivity(activityLogin)
		}
	}

	executionTimeout = setTimeout(function () {
//pr('G does not respond...')
console.log('G does not respond...')
		onLoggedOut()
		executionTimeout = null
	}, MAX_EXECUTION_TIME)


    gapi.load('auth2', function () {

        let auth2 = gapi.auth2.init({
            client_id: '272693258954-aj3mqp6l3kd9a5brhsf99k11bo0gd95i.apps.googleusercontent.com',
            scope: 'profile email'
        })

        // Listen for changes to current user.
        auth2.currentUser.listen(user => {

//pr('auth2.currentUser', user)
console.log('auth2.currentUser', user)
window.debugGoogleUser = user

			turnOffTimer()

			let hasProfile = false
            if (user) {
                var profile = user.getBasicProfile()
                if (profile) {
console.log("ID: " + profile.getId())
console.log('Full Name: ' + profile.getName())
console.log('Given Name: ' + profile.getGivenName())
console.log('Family Name: ' + profile.getFamilyName())
console.log("Image URL: " + profile.getImageUrl())
console.log("Email: " + profile.getEmail())
					hasProfile = true
window.debugGoogleAuthResponse = user.getAuthResponse()
					let token = user.getAuthResponse().id_token
					profileInit('google', profile.getId(), profile.getName(), profile.getImageUrl(), profile.getEmail(), token, () => {
						auth2.signOut()
					})
                }
            }
			if (!hasProfile) {
//pr('onLoggedOut: G 1')
				onLoggedOut()
			}
        })

        // Listen for sign-in state changes.
        auth2.isSignedIn.listen(function (isSignedIn) {
//pr('auth2.isSignedIn', isSignedIn)
console.log('auth2.isSignedIn', isSignedIn)
//            if (isSignedIn) {
//                identificationPanel.classList.add('signed-in')
//            } else {
//                identificationPanel.classList.remove('signed-in')
//            }
			if (!isSignedIn) {
//pr('isLoggedOut: G 2')
				onLoggedOut()
			}
        })
/*
        // Sign in the user if they are currently signed in.
        if (auth2.isSignedIn.get() == true) {
            auth2.signIn()
        } else {
			isLoggedInWith.google = false
			if (isLoggedOut()) {
				switchActivity(activityLogin)
			}
		}
*/
		let signInButton = activityLogin.querySelector('.signin-with-google')
		signInButton.addEventListener('click', () => {
			auth2.signIn()
		})
		signInButton.classList.remove('is-hidden')

        //console.log('Current state', auth2.currentUser.get(), auth2.isSignedIn.get())
//        identificationPanel.querySelector('.sign-in').addEventListener('click', function () {
//            auth2.signIn()
//        })

//        identificationPanel.querySelector('.sign-out').addEventListener('click', function () {
//            auth2.signOut()
//        })
    })

})();