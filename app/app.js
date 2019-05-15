/**
 * @license
 * Copyright Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// [START drive_quickstart]
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const util = require('util');

const SCOPES = ['https://www.googleapis.com/auth/drive','https://www.googleapis.com/auth/gmail.send'];

const SECRET_FOLDER = '/secrets/';
const APK_FOLDER = '/apk/';

//process.env.PROJECT_NAME ='My Android APP';
//process.env.FROM_ADDRESS ='sonia@gmail.com';
//process.env.TO_ADDRESSES ='sonia+1@gmail.com';
//const SECRET_FOLDER = 'c:\\secrets\\';
//const APK_FOLDER = 'c:\\apk\\';

const CREDENTIALS_PATH = SECRET_FOLDER + 'credentials.json';
const TOKEN_PATH = SECRET_FOLDER + 'token.json';
const OUTPUT_PATH = APK_FOLDER + 'output.json';
const CHANGELOG_PATH = APK_FOLDER + 'changelog';
const REVISION_PATH = APK_FOLDER + 'revision';




(async function(){



  var readFileAsync = util.promisify(fs.readFile)
  var credentials= JSON.parse(await readFileAsync(CREDENTIALS_PATH))
  const oAuth2Client = new google.auth.OAuth2(credentials.installed.client_id, credentials.installed.client_secret, credentials.installed.redirect_uris[0]);  
  var token = JSON.parse(await readFileAsync(TOKEN_PATH))
  if (process.argv[2]=='gen'){
    var newToken = await getNewAccessToken(oAuth2Client)
    console.log(JSON.stringify(newToken))
    return;
  }
  oAuth2Client.setCredentials(token);


  var outputInfo=JSON.parse(await readFileAsync(OUTPUT_PATH))[0]
  var apkLocation = APK_FOLDER + outputInfo.path;
  var uploadedFileInfo = await uploadFileAsync(oAuth2Client,apkLocation,outputInfo.apkInfo.outputFile)
  var result= await shareFile(oAuth2Client,uploadedFileInfo.data.id)
  var shareLink = 'https://drive.google.com/open?id='+ uploadedFileInfo.data.id

  var changeLog = await readFileAsync(CHANGELOG_PATH)
  var revision = await readFileAsync(REVISION_PATH)

  var body = shareLink + '\n\n' + 'CHANGE LOG:'  + '\n' + changeLog
  var htmlBody = body.split('\n').join('\n<br>\n')
  console.log(result)
  var emailParams={
    fromName:'TDS CI',
    fromAddress:process.env.FROM_ADDRESS,
    to :process.env.TO_ADDRESSES,
    subject: process.env.PROJECT_NAME + '  -  ' + outputInfo.apkInfo.versionName + '('+ outputInfo.apkInfo.versionCode.toString() + ')  -  SCM REV = ' + revision,
    body: htmlBody
  }
  var result =  await sendEmail(oAuth2Client,emailParams)
  console.log(result)
})();
return;




function getNewAccessToken(oAuth2Client) {
  return new Promise(function(resolve, reject) {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      oAuth2Client.getToken(code, (err, token) => {
        if (err) {
          reject(err)
        }
        else{
          resolve(token)
        }
      });
    });
  })
}

async function sendEmail(auth,emailParams) {
    var gmailClass = google.gmail('v1');

    var email_lines = [];

    email_lines.push('From: "'+ emailParams.fromName + '" <' + emailParams.fromAddress + '>');
    email_lines.push('To: '+ emailParams.to);
    email_lines.push('Content-type: text/html;charset=iso-8859-1');
    email_lines.push('MIME-Version: 1.0');
    email_lines.push('Subject: ' + emailParams.subject);
    email_lines.push('');
    email_lines.push(emailParams.body);

    var email = email_lines.join('\r\n').trim();

    var base64EncodedEmail = new Buffer(email).toString('base64');
    base64EncodedEmail = base64EncodedEmail.replace(/\+/g, '-').replace(/\//g, '_');
    return await gmailClass.users.messages.send({
      auth: auth,
      userId: 'me',
      resource: {
        raw: base64EncodedEmail
      }
    });
}





async function uploadFileAsync(auth,fileLocation,fileName){
    const drive = google.drive({version: 'v3', auth});
    var fileMetadata = {
      'name': fileName
    };
    var media = {
      mimeType: 'application/vnd.android.package-archive',
      body: fs.createReadStream(fileLocation)
    };
    return await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id'
    });
  }

  
async function shareFile(auth,fileId){
    const drive = google.drive({version: 'v3', auth});
    const resource = {"role": "reader", "type": "domain","domain":process.env.DOMAIN};
    //const resource = {"role": "reader", "type": "anyone"};
    return drive.permissions.create({fileId:fileId, resource: resource});
}





