// Handle installation

const VERSION = '3.7'
const CACHE_NAME = 'bld-129-7'
const CACHE_ACTUAL_LIST = [ CACHE_NAME ]

// Static

let resourcesToCache = [
	// html
	'/index.html',
	'/facebook.html',
	'/google.html',
	'/vk.html',
	'/debug.html',
	'/list.html',
	'/contacts.html',
	'/policy.html',
	'/offer.html',
	// js
	'/js/common.js',
	'/js/storage.js',
	'/js/JSONRPC2.js',
	'/js/jsQR.js',
	'/js/qrcode.min.js',
	'/js/pages/list.js',
	'/js/pages/main.js',
	// css
	'/css/typography.css',
	'/css/common.css',
	// images
	'/images/anonymous_user.svg',
	'/images/banner-stub.jpg',
	'/images/google_g_logo.svg',
	'/images/logo.svg',
	'/images/ps_logos.png',
	'/images/sbp_logo.png',
	'/images/tinkoff_logo.svg',
	// fonts
	'/fonts/roboto/index.css',
	'/fonts/roboto/v20/KFOlCnqEu92Fr1MmSU5fABc4EsA.woff2',
	'/fonts/roboto/v20/KFOlCnqEu92Fr1MmSU5fBBc4.woff2',
	'/fonts/roboto/v20/KFOlCnqEu92Fr1MmSU5fBxc4EsA.woff2',
	'/fonts/roboto/v20/KFOlCnqEu92Fr1MmSU5fCBc4EsA.woff2',
	'/fonts/roboto/v20/KFOlCnqEu92Fr1MmSU5fChc4EsA.woff2',
	'/fonts/roboto/v20/KFOlCnqEu92Fr1MmSU5fCRc4EsA.woff2',
	'/fonts/roboto/v20/KFOlCnqEu92Fr1MmSU5fCxc4EsA.woff2',
	'/fonts/roboto/v20/KFOlCnqEu92Fr1MmYUtfABc4EsA.woff2',
	'/fonts/roboto/v20/KFOlCnqEu92Fr1MmYUtfBBc4.woff2',
	'/fonts/roboto/v20/KFOlCnqEu92Fr1MmYUtfBxc4EsA.woff2',
	'/fonts/roboto/v20/KFOlCnqEu92Fr1MmYUtfCBc4EsA.woff2',
	'/fonts/roboto/v20/KFOlCnqEu92Fr1MmYUtfChc4EsA.woff2',
	'/fonts/roboto/v20/KFOlCnqEu92Fr1MmYUtfCRc4EsA.woff2',
	'/fonts/roboto/v20/KFOlCnqEu92Fr1MmYUtfCxc4EsA.woff2',
	'/fonts/roboto/v20/KFOmCnqEu92Fr1Mu4mxK.woff2',
	'/fonts/roboto/v20/KFOmCnqEu92Fr1Mu4WxKOzY.woff2',
	'/fonts/roboto/v20/KFOmCnqEu92Fr1Mu5mxKOzY.woff2',
	'/fonts/roboto/v20/KFOmCnqEu92Fr1Mu7GxKOzY.woff2',
	'/fonts/roboto/v20/KFOmCnqEu92Fr1Mu7mxKOzY.woff2',
	'/fonts/roboto/v20/KFOmCnqEu92Fr1Mu7WxKOzY.woff2',
	'/fonts/roboto/v20/KFOmCnqEu92Fr1Mu72xKOzY.woff2',
	'/fonts/montserrat/index.css',
	'/fonts/montserrat/v15/JTUSjIg1_i6t8kCHKm459W1hyzbi.woff2',
	'/fonts/montserrat/v15/JTUSjIg1_i6t8kCHKm459Wdhyzbi.woff2',
	'/fonts/montserrat/v15/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2',
	'/fonts/montserrat/v15/JTUSjIg1_i6t8kCHKm459WRhyzbi.woff2',
	'/fonts/montserrat/v15/JTUSjIg1_i6t8kCHKm459WZhyzbi.woff2 ',
	// icons
	'/icon/google-touch-icon.png',
	'/icon/apple-touch-icon.png',
	'/icon/icon.svg',
	// data
	'/version.json',
]

// Helpers

function toCache(request, response) {
	console.log('sw.js', VERSION, 'toCache', 'request.method', request.method, request.url, request)
	return caches.open(CACHE_NAME)
		.then(cache => cache.put(request, response)
			.then(() => response))
}

function fromCache(request) {
	console.log('sw.js', VERSION, 'fromCache', request.url)
	//return caches.match(request)
	return caches.open(CACHE_NAME)
		.then(cache => cache.match(request))
}

function fromNetwork(request) {
	console.log('sw.js', VERSION, 'fromNetwork', request.url)
	return fetch(request)
}

// Strategies

function cacheOrNetwork(request) {
//	console.log('sw.js', VERSION, 'cacheOrNetwork', request.method, request.url, request)
	return fromCache(request)
		.then(response => response || fromNetwork(request))
}

function cacheOrNetworkUpdate(request) {
//	console.log('sw.js', VERSION, 'cacheOrNetworkUpdate', request.method, request.url, request)
	return fromCache(request)
		.then(response => response || fromNetwork(request)
			.then(response => {
				if (response.ok && request.method === 'GET') {
					return toCache(request, response.clone())
				}
				return response
			}))
}

// Routing

function doFetch(request) {
	if (request.method === 'GET') {
		if (/^https\:\/\/fonts\.googleapis\.com\//.test(request.url)) {
			return fromNetwork(request)
		}
		if (/^https\:\/\/connect\.virapay\.ru\/data\/$/.test(request.url)) {
			return fromNetwork(request)
		}
		return cacheOrNetwork(request)
	}
	return fromNetwork(request)
}

// Event handlers

self.addEventListener('install', evt => {
	console.log('sw.js', VERSION, 'install', evt)
	self.skipWaiting()
	return evt.waitUntil(
		caches.open(CACHE_NAME)
			.then(cache => cache.addAll(resourcesToCache))
	)
})

self.addEventListener('activate', evt => {
	console.log('sw.js', VERSION, 'activate')
	return evt.waitUntil(
		caches.keys().then(keys => Promise.all(keys.map(key => {
			if (CACHE_ACTUAL_LIST.indexOf(key) < 0) {
				return caches.delete(key)
			}
		})))
	)
})

self.addEventListener('fetch', evt => {
//	console.log('sw.js', VERSION, 'fetch', evt.request)
	return evt.respondWith(doFetch(evt.request))
})

// Dump version

console.log('sw.js', VERSION, 'start')
