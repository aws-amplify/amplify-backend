const url = 'https://beta.notices.cli.amplify.aws/notices.json';

var https = require('https');
var count = 0;
setInterval(send, 20)

function send() {
    for (var i = 0; i < 6; i++) {
        request();
    }
}

function request() {
    var id = ++count;
    if (id > 10000) process.exit()
    var req = https.get(url, (res) => {
        res.on('end', () => {
            if (id % 500 == 0) {
                console.log(id, "end")
            }
        });
        res.on('data', (data) => {})
    });
    req.on('error', (e) => {
        console.log(`problem with request ${id} : ${e.code} ${e.message}`);
        console.log(e)
    });
}