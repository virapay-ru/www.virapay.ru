// Google API

    gapi.load('auth2', function () {

        let auth2 = gapi.auth2.init({
            client_id: '272693258954-aj3mqp6l3kd9a5brhsf99k11bo0gd95i.apps.googleusercontent.com',
            scope: 'profile email'
        })

        // Listen for changes to current user.
        auth2.currentUser.listen(user => {
            console.log('auth2.currentUser', user)
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
					profileInit('google/' + profile.getId(), profile.getName(), profile.getImageUrl(), profile.getEmail(), () => {
						auth2.signOut()
					})
                }
            }
			if (!hasProfile) {
				isLoggedInWith.google = false
console.log('isLoggedOut: G 1')
				if (isLoggedOut()) {
					switchActivity(activityLogin)
				}
			}
        })

        // Listen for sign-in state changes.
        auth2.isSignedIn.listen(function (isSignedIn) {
            console.log('auth2.isSignedIn', isSignedIn)
//            if (isSignedIn) {
//                identificationPanel.classList.add('signed-in')
//            } else {
//                identificationPanel.classList.remove('signed-in')
//            }
			if (!isSignedIn) {
				isLoggedInWith.google = false
console.log('isLoggedOut: G 2')
				if (isLoggedOut()) {
					switchActivity(activityLogin)
				}
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
