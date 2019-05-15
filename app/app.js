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

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive','https://www.googleapis.com/auth/gmail.send'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
//const TOKEN_PATH = '/secrets/token.json';
const CREDENTIALS_PATH = 'c:\\secrets\\credentials.json';
const TOKEN_PATH = 'c:\\secrets\\token.json';



(async function(){

  var credentials= await getCredentials()
  const oAuth2Client = new google.auth.OAuth2(credentials.installed.client_id, credentials.installed.client_secret, credentials.installed.redirect_uris[0]);  
  var token = await getToken()
  //var newToken = await getAccessToken(oAuth2Client)
  //console.log(JSON.stringify(newToken))
  //return;
  oAuth2Client.setCredentials(token);


  var uploadedFileInfo = await uploadFileAsync(oAuth2Client,'c:\\secrets\\app.apk')
  console.log(uploadedFileInfo)
  return;
  var emailParams={
    fromName:'Sonia',
    fromAddress:'sonia@gmail.com',
    to :"mig.ruiz@gmail.com",
    subject: "subject",
    body: "body"
  }
  var result =  await sendEmailv2(oAuth2Client,emailParams)
  console.log(result)
})();
return;


async function getCredentials(){
  var content =  await util.promisify(fs.readFile)(CREDENTIALS_PATH)
  return JSON.parse(content)
}
async function getToken(){
  var content =  await util.promisify(fs.readFile)(TOKEN_PATH)
  return JSON.parse(content)
}



function getAccessToken(oAuth2Client) {
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

async function sendEmailv2(auth,emailParams) {
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





async function uploadFileAsync(auth,fileLocation){
    const drive = google.drive({version: 'v3', auth});
    var fileMetadata = {
      'name': 'app.apk'
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

  
  function shareFile(auth){
    return new Promise(function(resolve, reject) {
      const drive = google.drive({version: 'v3', auth});
      const resource = {"role": "reader", "type": "domain","domain":process.env.DOMAIN};
      drive.permissions.create({fileId:file.data.id, resource: resource}, (error, result)=>{
          if (error) {
            reject(error)
          }
          var link= 'https://drive.google.com/open?id='+ file.data.id
          console.log(link)
          resolve(link)
      });
    });
  }







/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listFiles(auth) {
  const drive = google.drive({version: 'v3', auth});
  drive.files.list({
    pageSize: 10,
    fields: 'nextPageToken, files(id, name)',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const files = res.data.files;
    if (files.length) {
      console.log('Files:');
      files.map((file) => {
        console.log(`${file.name} (${file.id})`);
      });
    } else {
      console.log('No files found.');
    }
  });
}
// [END drive_quickstart]

module.exports = {
  SCOPES,
  listFiles,
};