const inPort = 12593
const realcacertPath = './cacert.pem'
const sslDirPath = process.env.LOCALAPPDATA + '/Bloxstrap/Modifications/ssl/'
const cacertPath = process.env.LOCALAPPDATA + '/Bloxstrap/Modifications/ssl/cacert.pem'
const clientSettingsDirPath = process.env.LOCALAPPDATA + '/Bloxstrap/Modifications/ClientSettings/'
const clientSettingsPath = process.env.LOCALAPPDATA + '/Bloxstrap/Modifications/ClientSettings/ClientAppSettings.json'
  
const mockttp = require('mockttp');
const fetch = require("node-fetch");
const forge = require("node-forge");
const fs = require('fs')

//list of headers to strip
//converted to lowercase for later
const strippedHeaders = [
  "Roblox-Game-Id",
  "Roblox-Place-Id",
  "Roblox-Universe-Id",
  "PlayerCount",
  "Requester"
].map((header)=>header.toLowerCase())

let clientSettingsModified = false
let clientSettings

//function i stole from stackoverflow that generates a temporary root ca
async function createCert() {
    const options = {
        commonName: 'DO_NOT_TRUST HEADER STRIPPER CA',
        bits: 2048
    }
    
    const pki = forge.pki

    let keyPair = await new Promise((res, rej) => {
        pki.rsa.generateKeyPair({ bits: options.bits }, (error, pair) => {
            if (error) rej(error);
            else res(pair)
        })
    })
    
    let cert = pki.createCertificate()
    cert.publicKey = keyPair.publicKey
    cert.serialNumber = crypto.randomUUID().replace(/-/g, '')
    
    cert.validity.notBefore = new Date()
    cert.validity.notBefore.setDate(cert.validity.notBefore.getDate() - 1)
    cert.validity.notAfter = new Date()
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1)
    
    cert.setSubject([{name: 'commonName', value: options.commonName}])
    cert.setExtensions([{ name: 'basicConstraints', cA: true }])
    
    cert.setIssuer(cert.subject.attributes)
    cert.sign(keyPair.privateKey, forge.md.sha256.create())
    
    return {
        key: pki.privateKeyToPem(keyPair.privateKey),
        cert: pki.certificateToPem(cert)
    }
}

(async function() {
  console.log("Creating private key and root ca...")
  const {key, cert} = await createCert()

  const server = mockttp.getLocal({
    https:{
      key: key, //private key
      cert: cert //root ca 
    }
  });

  //place cacert.pem in process.env.LOCALAPPDATA /Bloxstrap/Modifications/ssl
  let realCacert = fs.readFileSync(realcacertPath, 'utf8')
  const cacerts =  `${realCacert}\nTEMP\n====\n${cert}`

  //make sure the folder exists first
  if (!fs.existsSync(sslDirPath)) {
    fs.mkdirSync(sslDirPath)
  }
  fs.writeFileSync(cacertPath, cacerts)

  //setup bloxstrap json
  clientSettings = JSON.parse(fs.readFileSync(clientSettingsPath, 'utf8'))
  clientSettings.DFStringHttpCurlProxyHostAndPort = `http://localhost:${inPort}`
  clientSettingsModified = true
  //make sure the folder exists before writing the file
  if (!fs.existsSync(clientSettingsDirPath)) {
    fs.mkdirSync(clientSettingsDirPath)
  }
  fs.writeFileSync(clientSettingsPath, JSON.stringify(clientSettings, null, '  '))

  server.forAnyRequest().withUrlMatching(/purchase/g).always().thenCallback(async(req)=>{
    //delete the body if its a get or head request its not allowed there
    if (req.method=='GET' || req.method=="HEAD") {
      delete req.body
    } else {
      //we also want to remove the salelocation stuff
      //just incase they *remove* the validation lol
      let json = JSON.parse(req.body.buffer)
      delete json.saleLocationType
      delete json.saleLocationId
      req.body.buffer = Buffer.from(JSON.stringify(json))
    }

    let opts = {
      method: req.method,
      headers: req.headers,
      body: req.body?.buffer
    }

    //strip the headers
    for (let header in opts.headers) {
      if (strippedHeaders.includes(header.toLowerCase())) {
        delete opts.headers[header]
      }
    }

    console.log('removed purchase related headers from', req.url)

    let res = await fetch(req.url, opts)

    let response = {
      status: res.status,
      headers: Object.fromEntries(res.headers),
      body: await res.buffer()
    }
    return response
  })

  //dont mess with any other requests please :3
  server.forUnmatchedRequest().thenPassThrough()

  console.log('ready! when you\'re done, close this with ctrl+c so the script can undo its changes :3')

  server.start(inPort)
})();


//clean up after common closing methods
function onClose() {
  if (clientSettingsModified) {
    console.log('cleanup resetting bloxstrap proxy fflag')
    try {
      delete clientSettings.DFStringHttpCurlProxyHostAndPort
      fs.writeFileSync(clientSettingsPath, JSON.stringify(clientSettings, null, '  '))
    } catch (err) {
      console.warn("error clearning up!", err)
    }
  }
  console.log('cleanup deleting cacert.pem')
  try {
    fs.rmSync(cacertPath)
  } catch (err) {
    console.warn("error cleaning up!", err)
  }
  process.exit()
}

//attempt to clean up on exit
process.on('SIGINT', function(){process.exit()})
process.on('SIGHUP', function(){process.exit()})
process.on('exit', onClose)