function pr() {
	let args = Array.prototype.slice.call(arguments)
	let msg = args.map(x => typeof x === 'object' ? JSON.stringify(x) : x).join(' ') + "\n"
	document.querySelector('.debug-console .output').textContent += msg
}