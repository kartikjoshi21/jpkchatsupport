
const path       = require('path')
const express    = require('express')
const bodyParser = require('body-parser');
const Chatkit    = require('pusher-chatkit-server')

const app = express()
const chatkit = new Chatkit.default(require('./config.js'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'assets')))

app.post('/session/load', (req, res, next) => {

    chatkit.createUser(req.body.email, req.body.name)
        .then(() => getUserRoom(req, res, next, false))
        .catch(err => {
            (err.error_type === 'services/chatkit/user/user_already_exists')
                ? getUserRoom(req, res, next, true)
                : next(err)
        })

    function getUserRoom(req, res, next, existingAccount) {
        const name  = req.body.name
        const email = req.body.email

        chatkit.apiRequest({method: 'GET', 'path': `/users/${email}/rooms`})
            .then(rooms => {
                let clientRoom = false
                rooms.forEach(room => (room.name === email ? (clientRoom = room) : false))

                if (clientRoom && clientRoom.id) {
                    return res.json(clientRoom)
                }

                const createRoomRequest = {
                    method: 'POST',
                    path: '/rooms',
                    jwt: chatkit.generateAccessToken({userId: email}).token,
                    body: { name: email, private: true, user_ids: ['chatkit-dashboard'] },
                };
                chatkit.apiRequest(createRoomRequest)
                       .then(room => res.json(room))
                       .catch(err => next(new Error(`${err.error_type} - ${err.error_description}`)))
            })
            .catch(err => next(new Error(`ERROR: ${err.error_type} - ${err.error_description}`)))
    }
})

app.post('/session/auth', (req, res) => {
    res.json(chatkit.authenticate(req.body, req.query.user_id))
})

app.get('/admin', (req, res) => {
    res.sendFile('admin.html', {root: __dirname + '/views'})
})

app.get('/', (req, res) => {
    res.sendFile('index.html', {root: __dirname + '/views'})
})


app.listen(3000, () => console.log("Application listening on port 3000!!!"))
