(function () {

//    var canvas = document.getElementById('grid')
	var canvas = document.createElement('canvas')
	canvas.setAttribute('id', 'grid')
	document.body.prepend(canvas)

    var ctx = canvas.getContext('2d')
    
    function resize() {
        canvas.width = document.documentElement.offsetWidth // document.body.clientWidth
        canvas.height = document.documentElement.scrollHeight //document.documentElement.offsetHeight //document.body.scrollHeight
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = 'rgba(0,0,255,0.1)'
        var fontSize = getComputedStyle(document.body).getPropertyValue('font-size')
        var defaultStep = 8
        console.log('default step is', defaultStep, 'px')
        var step = defaultStep
        if (/^\d+px$/.test(fontSize)) {
            step = parseInt(fontSize) / 2
            console.log('step is', step, 'px')
        }
        for (var x = 0; x < canvas.width; x += step) {
            ctx.fillRect(x, 0, 1, canvas.height)
        }
        ctx.fillStyle = 'rgba(255,0,0,0.3)'
        for (var y = 0; y < canvas.height; y += step) {
            ctx.fillRect(0, y, canvas.width, 1)
        }
    }
    
    window.addEventListener('resize', resize)
    
    resize()
    
    document.body.addEventListener('dblclick', function () {
        document.body.classList.toggle('debug')
    })

	console.log('debug grid initialized...')

})();
