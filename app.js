const chalk = require('chalk');
const puppeteer = require('puppeteer');
const request = require('request');
const fs = require('fs');
const config = require('./config.json');
const log = console.log;
const vision = require('@google-cloud/vision');
const { Translate } = require('@google-cloud/translate');

// DISPLAY CONFIGURATION
log("Your configuration :")
log("URL : " + chalk.bold.green(config.url))
log("Google Project ID : " + chalk.bold.yellow(config.googleProjectId))
log("Langage : " + chalk.bold.red(config.langage))

try {
    (async () => {
        const browser = await puppeteer.launch({headless: false})
        const page = await browser.newPage()
        await page.setUserAgent(config.userAgent);
        await page.goto('https://mdp.orange.fr/ident')
        await page.waitFor(1000) // wait pictures from loading

        let infos = await page.evaluate(() => {
            let = photos = []

            for (i = 1; i < 10; i++) {
                photos.push(document.getElementById('captcha-image-' + i).getAttribute('src'))
            }

            return { photos: photos, words: document.getElementById('captcha-indications').textContent }
        })

        log(chalk.blue('I got some informations'))
        
        // login input (phone number or email)
        const element = await page.$('#login-input')
        await element.type(config.login)

        await page.screenshot({path: 'screenshot.png'})

        let words = infos.words.replace(/\d+/g, '')
            .replace('?', '')
            .replace(' ', '') // tricky
            .split(' ')

        log(chalk.blue('Words list : ' + words))
        
        // download all pictures
        await downloadAllPictures(infos.photos).then(() => {
            log(chalk.green.bold('Pictures saved.'))
        }).then(await page.waitFor(1000))
        
        // analyze 
        let analyzes = []

        await Promise.all([
            analyzePicture('data/0.png'), 
            analyzePicture('data/1.png'),
            analyzePicture('data/2.png'),
            analyzePicture('data/3.png'),
            analyzePicture('data/4.png'),
            analyzePicture('data/5.png'),
            analyzePicture('data/6.png'),
            analyzePicture('data/7.png'),
            analyzePicture('data/8.png')
        ]).then((data) => {
            analyzes = data
        })

        log(chalk.blue('The photos were analyzed...'))

        let clicks = []

        await Promise.all(analyzes.map((analyze, index) => {
            return new Promise(resolve => {
                let found = false
                analyze[index].words.map((predict, i) => {
                    words.map((word, j) => {
                        if (predict.includes(word)) {
                            clicks[word] = index
                        }
                    })
                })

                resolve()
            })
        }))

        log(clicks)

        let clicksList = []

        words.map(async (word, index) => {

        }) 

        await page.screenshot({path: 'end.png'})
        log('Terminé')
        
        // await browser.close()
    })()
} catch (e) {
    console.log(e.message)
}

async function downloadAllPictures(photosUrl) {
    return Promise.all(photosUrl.map((t, i) => {
        return new Promise((resolve, reject) => {
            request('https:' + t)
                .pipe(fs.createWriteStream('data/' + i + '.png'))
                .on('close', resolve())
                .on('error', reject())
        })
    }))
}

function analyzePicture(picturePath) {
    return new Promise((resolve, reject) => {
        (async () => {
            const client = new vision.ImageAnnotatorClient()
            const [result] = await client.labelDetection(picturePath)
            const labels = result.labelAnnotations

            let words = []
        
            // translate all labels description
            await Promise.all(labels.map((t, i) => {
                return new Promise(async resolve => {
                    const projectId = config.googleProjectId
                    const langage = config.langage

                    const translate = new Translate({ projectId })
                    const [translation] = await translate.translate(t.description, 'fr')

                    words.push(translation.toLowerCase())
                    resolve(translation)
                })
            }))

            resolve({ [picturePath.substring(5, 6)]: {"words": words} })
        })()
    })
}

/*

            const promise = await new Promise(async (resolve, reject) => {
                if (clicks[word] == 'undefined') {
                    reject('Click not found')
                }

                let position = clicks[word] + 1

                log({ 'word': word, 'image': position })

                const element = await page.$('#captcha-image-' + position)

                if (element == null) {
                    reject('Error for the following word :' + word)
                } else {
                    await element.click()
                    resolve('Success click for ' + word)
                }
            })
*/