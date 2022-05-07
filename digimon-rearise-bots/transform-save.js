const {default: transform} = require('./transform')
const fs = require('fs')
const devalue = require('devalue')
transform().then(t => {
	fs.writeFileSync('../digimon-rearise-web/static/data.json', JSON.stringify(t))
	// fs.writeFileSync('../digimon-rearise-web/src/data.ts', `import type TransformedData from 'digi-rise/transform'\nexport default const data: TransformedData = ${devalue(t)}\n`)
})
